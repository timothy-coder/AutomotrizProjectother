import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { enqueueOutbound, processOutboxItem } from "@/lib/conversationsOutbox";

/**
 * POST /api/conversations/send-message
 *
 * Endpoint para que el agente Ventas IA envíe mensajes de WhatsApp.
 * Auth: x-conversations-webhook-secret
 *
 * Body: { phone, message, channel? }
 */
export async function POST(req) {
  const secret = process.env.CONVERSATIONS_WEBHOOK_SECRET;
  const provided = req.headers.get("x-conversations-webhook-secret") || "";
  if (secret && provided !== secret) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const phone = String(body?.phone || "").trim();
  const message = String(body?.message || "").trim();
  const channel = String(body?.channel || "whatsapp").toLowerCase();

  if (!phone || !message) {
    return NextResponse.json({ message: "phone y message son requeridos" }, { status: 400 });
  }

  // Buscar sesión activa para este teléfono
  const phoneClean = phone.replace(/\D/g, "");
  const [sessions] = await db.query(
    `SELECT id FROM conversation_sessions
     WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
     ORDER BY updated_at DESC LIMIT 1`,
    [phoneClean]
  );

  let sessionId = sessions[0]?.id || null;

  if (!sessionId) {
    const [ins] = await db.query(
      `INSERT INTO conversation_sessions (phone, source, created_at, updated_at)
       VALUES (?, 'ventas_ia', NOW(), NOW())`,
      [phone]
    );
    sessionId = ins.insertId;
  }

  const idempotencyKey = randomUUID();

  // Encolar mensaje saliente
  const { id: outboxId, enabled } = await enqueueOutbound({
    sessionId,
    messageLogId: null,
    phone,
    source: "ventas_ia",
    sourceChannel: channel,
    idempotencyKey,
    externalMessageId: null,
    payload: { phone, message, channel, source: "ventas_ia" },
  });

  // Procesar inmediatamente si el outbox está habilitado
  if (enabled && outboxId) {
    await processOutboxItem(outboxId).catch(() => {});
  }

  return NextResponse.json({ ok: true, session_id: sessionId, queued: true });
}
