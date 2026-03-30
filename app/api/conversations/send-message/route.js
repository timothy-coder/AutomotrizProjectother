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

  // Resolver session_id por teléfono
  let sessionId = null;
  try {
    const [sessions] = await db.query(
      `SELECT id, phone FROM conversation_sessions
       WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
       ORDER BY updated_at DESC LIMIT 1`,
      [phone]
    );
    sessionId = sessions[0]?.id || null;
  } catch (e) {
    console.warn("[send-message] No se pudo resolver session_id:", e.message);
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
  try {
    const outbox = await enqueueOutbound({
      sessionId,
      messageLogId,
      phone,
      source: "ventas_ia",
      sourceChannel: channel,
      idempotencyKey,
      externalMessageId: null,
      payload: outboundPayload,
    });

    if (outbox.enabled && outbox.id) {
      const result = await processOutboxItem(outbox.id);
      return NextResponse.json({
        ok: result.ok,
        outbox_id: outbox.id,
        session_id: sessionId,
        idempotency_key: idempotencyKey,
        status: result.status || "retrying",
      });
    }

    // Fallback si la tabla outbox no existe
    const outboundUrl = process.env.N8N_CONVERSATIONS_OUTBOUND_URL;
    if (!outboundUrl) {
      return NextResponse.json({ message: "Error de configuración del servidor" }, { status: 500 });
    }
    const res = await fetch(outboundUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(outboundPayload),
      signal: AbortSignal.timeout(8000),
    });
    return NextResponse.json({ ok: res.ok, session_id: sessionId, idempotency_key: idempotencyKey });
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
        return NextResponse.json({ ok: res.ok, session_id: sessionId, idempotency_key: idempotencyKey });
      } catch (fetchErr) {
        console.error("[send-message] fetch fallback failed:", fetchErr.message);
        return NextResponse.json({ ok: false, message: "Error enviando mensaje" }, { status: 502 });
      }
    }
    console.error("[send-message] Error inesperado:", e.message);
    return NextResponse.json({ ok: false, message: "Error enviando mensaje" }, { status: 502 });
  }
}
