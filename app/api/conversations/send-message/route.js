import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import {
  enqueueOutbound,
  processOutboxItem,
  isMissingTableError,
} from "@/lib/conversationsOutbox";
import { normalizePhone } from "@/lib/phoneUtils";

/**
 * POST /api/conversations/send-message
 *
 * Endpoint para que el agente Ventas IA envíe mensajes de WhatsApp.
 * Auth: x-conversations-webhook-secret (obligatorio)
 *
 * Body: { phone, message, channel? }
 */
export async function POST(req) {
  const secret = process.env.CONVERSATIONS_WEBHOOK_SECRET;
  const provided = req.headers.get("x-conversations-webhook-secret") || "";
  if (!secret || provided !== secret) {
    console.warn("[send-message] Intento no autorizado — secret inválido o env var no seteada");
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const ALLOWED_CHANNELS = new Set(["whatsapp", "instagram", "facebook"]);

  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(body?.phone);
  const message = String(body?.message || "").trim();
  const channelRaw = String(body?.channel || "whatsapp").toLowerCase();
  const channel = ALLOWED_CHANNELS.has(channelRaw) ? channelRaw : null;

  if (!phone || !message) {
    return NextResponse.json({ message: "phone y message son requeridos" }, { status: 400 });
  }

  if (!channel) {
    return NextResponse.json({ message: "channel inválido. Valores permitidos: whatsapp, instagram, facebook" }, { status: 400 });
  }

  // Resolver session_id por teléfono — si no existe, crear la sesión
  let sessionId = null;
  try {
    const [sessions] = await db.query(
      `SELECT id, phone FROM conversation_sessions
       WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
       ORDER BY updated_at DESC LIMIT 1`,
      [phone]
    );
    if (sessions[0]?.id) {
      sessionId = sessions[0].id;
    } else {
      const [created] = await db.query(
        `INSERT INTO conversation_sessions (phone, state, assignment_status, created_at, updated_at)
         VALUES (?, 'NO_HISTORIAL', 'open', NOW(), NOW())`,
        [phone]
      );
      sessionId = created.insertId;
    }
  } catch (e) {
    console.warn("[send-message] No se pudo resolver/crear session_id:", e.message);
  }

  // Generar idempotency key para evitar doble envío
  const idempotencyKey = randomUUID();

  // Insertar en agent_actions_log para tener messageLogId (requerido por el outbox)
  let messageLogId = null;
  try {
    const [logResult] = await db.query(
      `INSERT INTO agent_actions_log
         (session_id, phone, action_type, intent, response_text,
          message_direction, message_status, source_channel,
          idempotency_key, success, created_at)
       VALUES (?, ?, 'AGENT_OUTBOUND', 'AGENT_OUTBOUND', ?,
               'outbound', 'queued', ?, ?, 1, NOW())`,
      [sessionId, phone, message, channel, idempotencyKey]
    );
    messageLogId = logResult.insertId;
  } catch (e) {
    console.warn("[send-message] No se pudo insertar en agent_actions_log:", e.message);
  }

  const outboundPayload = {
    session_id: sessionId,
    phone,
    text: message,
    source: "ventas_ia",
    source_channel: channel,
    idempotency_key: idempotencyKey,
    created_at: new Date().toISOString(),
  };

  // Encolar en outbox y procesar inmediatamente
  // Si messageLogId es null (agent_actions_log no disponible) saltamos el outbox
  // para no lanzar ER_BAD_NULL_ERROR en la columna NOT NULL message_log_id
  try {
    const outbox = messageLogId
      ? await enqueueOutbound({
          sessionId,
          messageLogId,
          phone,
          source: "ventas_ia",
          sourceChannel: channel,
          idempotencyKey,
          externalMessageId: null,
          payload: outboundPayload,
        })
      : { enabled: false, id: null, reason: "messageLogId no disponible" };

    if (outbox.enabled && outbox.id) {
      const result = await processOutboxItem(outbox.id);
      return NextResponse.json({
        data: {
          ok: result.ok,
          outbox_id: outbox.id,
          session_id: sessionId,
          idempotency_key: idempotencyKey,
          status: result.status || "retrying",
        },
      });
    }

    // Fallback si la tabla outbox no existe o messageLogId no disponible
    const outboundUrl = process.env.N8N_CONVERSATIONS_OUTBOUND_URL;
    if (!outboundUrl) {
      return NextResponse.json({ message: "Error de configuración del servidor" }, { status: 500 });
    }
    try {
      const res = await fetch(outboundUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(outboundPayload),
        signal: AbortSignal.timeout(8000),
      });
      return NextResponse.json({ data: { ok: res.ok, session_id: sessionId, idempotency_key: idempotencyKey } });
    } catch (fetchErr) {
      console.error("[send-message] fetch fallback failed:", fetchErr.message);
      return NextResponse.json({ message: "Error enviando mensaje" }, { status: 502 });
    }
  } catch (e) {
    if (isMissingTableError(e)) {
      // Fallback directo si la tabla outbox no existe
      const outboundUrl = process.env.N8N_CONVERSATIONS_OUTBOUND_URL;
      if (!outboundUrl) {
        return NextResponse.json({ message: "Error de configuración del servidor" }, { status: 500 });
      }
      try {
        const res = await fetch(outboundUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(outboundPayload),
          signal: AbortSignal.timeout(8000),
        });
        return NextResponse.json({ data: { ok: res.ok, session_id: sessionId, idempotency_key: idempotencyKey } });
      } catch (fetchErr) {
        console.error("[send-message] fetch fallback failed:", fetchErr.message);
        return NextResponse.json({ message: "Error enviando mensaje" }, { status: 502 });
      }
    }
    console.error("[send-message] Error inesperado:", e.message);
    return NextResponse.json({ message: "Error enviando mensaje" }, { status: 502 });
  }
}
