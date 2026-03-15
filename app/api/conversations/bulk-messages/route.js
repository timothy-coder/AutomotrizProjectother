import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";
import {
  enqueueOutbound,
  isMissingTableError,
} from "@/lib/conversationsOutbox";

const ALLOWED_CHANNELS = new Set(["whatsapp", "instagram", "facebook"]);
const MAX_BULK_RECIPIENTS = 300;

function isMissingColumnError(error) {
  return error?.code === "ER_BAD_FIELD_ERROR" || error?.errno === 1054;
}

function normalizeChannel(value) {
  const channel = String(value || "whatsapp").trim().toLowerCase();
  return ALLOWED_CHANNELS.has(channel) ? channel : null;
}

function normalizePhone(rawPhone) {
  return String(rawPhone || "")
    .replace(/[^\d+]/g, "")
    .trim();
}

function normalizeCell(rawPhone) {
  return String(rawPhone || "")
    .replace(/\D/g, "")
    .trim();
}

async function resolveSocialPlatformId({ phone, channel, platformId }) {
  if (channel === "whatsapp") {
    return { platform: null, platformId: null };
  }

  if (platformId) {
    return { platform: channel, platformId: String(platformId).trim() };
  }

  const compact = normalizeCell(phone);
  const candidates = [...new Set([
    String(phone || "").trim(),
    compact,
    compact?.length === 9 ? `51${compact}` : null,
    compact?.length === 9 ? `+51${compact}` : null,
  ].filter(Boolean))];

  if (!candidates.length) return { platform: channel, platformId: null };

  try {
    const placeholders = candidates.map(() => "?").join(", ");
    const [rows] = await db.query(
      `
      SELECT platform_id
      FROM social_identities
      WHERE platform = ?
        AND celular IN (${placeholders})
      ORDER BY id DESC
      LIMIT 1
      `,
      [channel, ...candidates]
    );

    const found = rows?.[0]?.platform_id;
    return {
      platform: channel,
      platformId: found ? String(found) : null,
    };
  } catch (error) {
    if (error?.code === "ER_NO_SUCH_TABLE" || error?.errno === 1146 || isMissingColumnError(error)) {
      return { platform: channel, platformId: null };
    }
    throw error;
  }
}

async function ensureSession({ sessionId, phone }) {
  if (sessionId) {
    const [rows] = await db.query(
      `
      SELECT id, phone
      FROM conversation_sessions
      WHERE id = ?
      LIMIT 1
      `,
      [sessionId]
    );

    return rows?.[0] || null;
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;

  const [existing] = await db.query(
    `
    SELECT id, phone
    FROM conversation_sessions
    WHERE phone = ?
    ORDER BY id DESC
    LIMIT 1
    `,
    [normalizedPhone]
  );

  if (existing?.[0]) return existing[0];

  const [created] = await db.query(
    `
    INSERT INTO conversation_sessions (
      phone,
      state,
      created_at,
      updated_at
    ) VALUES (?, 'NO_HISTORIAL', NOW(), NOW())
    `,
    [normalizedPhone]
  );

  return {
    id: created.insertId,
    phone: normalizedPhone,
  };
}

async function insertOutboundLog({
  sessionId,
  phone,
  text,
  sourceChannel,
  idempotencyKey,
  messageStatus,
}) {
  try {
    const [result] = await db.query(
      `
      INSERT INTO agent_actions_log (
        session_id,
        phone,
        action_type,
        intent,
        request_text,
        response_text,
        message_direction,
        message_status,
        source_channel,
        idempotency_key,
        success,
        error_message,
        created_at
      ) VALUES (?, ?, 'MANUAL_OUTBOUND', 'MANUAL_OUTBOUND', NULL, ?, 'outbound', ?, ?, ?, 1, NULL, NOW())
      `,
      [
        sessionId,
        phone || null,
        text,
        messageStatus,
        sourceChannel || null,
        idempotencyKey,
      ]
    );

    return { id: result.insertId, tracked: true };
  } catch (error) {
    if (!isMissingColumnError(error)) throw error;

    const [legacyResult] = await db.query(
      `
      INSERT INTO agent_actions_log (
        session_id,
        phone,
        action_type,
        intent,
        request_text,
        response_text,
        success,
        error_message,
        created_at
      ) VALUES (?, ?, 'MANUAL_OUTBOUND', 'MANUAL_OUTBOUND', NULL, ?, 1, NULL, NOW())
      `,
      [sessionId, phone || null, text]
    );

    return { id: legacyResult.insertId, tracked: false };
  }
}

async function updateSessionAfterOutbound({ sessionId, messageId }) {
  await db.query(
    `
    UPDATE conversation_sessions
    SET
      updated_at = NOW(),
      last_intent = 'MANUAL_OUTBOUND',
      last_message_id = ?
    WHERE id = ?
    `,
    [messageId, sessionId]
  );
}

async function processBulkRecipient({
  recipient,
  index,
  text,
  defaultChannel,
  bulkId,
  source,
}) {
  const channel = normalizeChannel(recipient?.source_channel || defaultChannel);
  if (!channel) {
    return {
      index,
      status: "skipped",
      reason: "source_channel inválido",
    };
  }

  const session = await ensureSession({
    sessionId: Number(recipient?.session_id) || null,
    phone: recipient?.phone,
  });

  if (!session?.id) {
    return {
      index,
      status: "skipped",
      channel,
      reason: "No se pudo resolver sesión (session_id/phone)",
    };
  }

  const social = await resolveSocialPlatformId({
    phone: session.phone,
    channel,
    platformId: recipient?.platform_id,
  });

  if (channel !== "whatsapp" && !social.platformId) {
    return {
      index,
      status: "skipped",
      channel,
      session_id: session.id,
      reason: "Falta platform_id para canal social",
    };
  }

  const idempotencyKey =
    String(recipient?.idempotency_key || "").trim() ||
    `bulk:${bulkId}:${index}:${randomUUID()}`;

  const inserted = await insertOutboundLog({
    sessionId: session.id,
    phone: session.phone,
    text,
    sourceChannel: channel,
    idempotencyKey,
    messageStatus: "queued",
  });

  await updateSessionAfterOutbound({
    sessionId: session.id,
    messageId: inserted.id,
  });

  const outboundPayload = {
    session_id: session.id,
    phone: session.phone,
    text,
    source,
    source_channel: channel,
    platform: social.platform,
    platform_id: social.platformId,
    idempotency_key: idempotencyKey,
    external_message_id: String(recipient?.external_message_id || "").trim() || null,
    bulk_id: bulkId,
    created_at: new Date().toISOString(),
  };

  try {
    const outbox = await enqueueOutbound({
      sessionId: session.id,
      messageLogId: inserted.id,
      phone: session.phone,
      source,
      sourceChannel: channel,
      idempotencyKey,
      externalMessageId: outboundPayload.external_message_id,
      payload: outboundPayload,
    });

    if (!outbox.enabled || !outbox.id) {
      return {
        index,
        status: "failed",
        channel,
        session_id: session.id,
        message_id: inserted.id,
        reason: "Outbox no disponible",
      };
    }

    return {
      index,
      status: "queued",
      channel,
      session_id: session.id,
      message_id: inserted.id,
      outbox_id: outbox.id,
      reason: "Encolado para envío asíncrono",
    };
  } catch (error) {
    if (isMissingTableError(error)) {
      return {
        index,
        status: "failed",
        channel,
        session_id: session.id,
        message_id: inserted.id,
        reason: "Tabla outbox no disponible",
      };
    }

    return {
      index,
      status: "failed",
      channel,
      session_id: session.id,
      message_id: inserted.id,
      reason: error?.message || "Error procesando destinatario",
    };
  }
}

// POST /api/conversations/bulk-messages
// {
//   text: string,
//   source_channel: "whatsapp" | "instagram" | "facebook",
//   source?: string,
//   recipients: [
//     {
//       session_id?: number,
//       phone?: string,
//       source_channel?: string,
//       platform_id?: string,
//       idempotency_key?: string,
//       external_message_id?: string
//     }
//   ]
// }
export async function POST(req) {
  const auth = authorizeConversation(req, "create");
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();

    const text = String(body?.text || "").trim();
    const defaultChannel = normalizeChannel(body?.source_channel || "whatsapp");
    const source = String(body?.source || "bulk_ui").trim() || "bulk_ui";
    const recipients = Array.isArray(body?.recipients) ? body.recipients : [];

    if (!text) {
      return NextResponse.json({ message: "text es requerido" }, { status: 400 });
    }

    if (!defaultChannel) {
      return NextResponse.json({ message: "source_channel inválido" }, { status: 400 });
    }

    if (!recipients.length) {
      return NextResponse.json({ message: "recipients debe tener al menos un destinatario" }, { status: 400 });
    }

    if (recipients.length > MAX_BULK_RECIPIENTS) {
      return NextResponse.json(
        { message: `Máximo ${MAX_BULK_RECIPIENTS} destinatarios por solicitud` },
        { status: 400 }
      );
    }

    const bulkId = randomUUID();
    const results = [];

    for (let i = 0; i < recipients.length; i += 1) {
      // eslint-disable-next-line no-await-in-loop
      const result = await processBulkRecipient({
        recipient: recipients[i],
        index: i,
        text,
        defaultChannel,
        bulkId,
        source,
      });

      results.push(result);
    }

    const summary = {
      total: results.length,
      sent: 0,
      queued: results.filter((r) => r.status === "queued").length,
      failed: results.filter((r) => r.status === "failed").length,
      skipped: results.filter((r) => r.status === "skipped").length,
    };

    return NextResponse.json(
      {
        message: "Envío masivo encolado",
        bulk_id: bulkId,
        source_channel: defaultChannel,
        summary,
        next_step: "Procesar outbox con cron o POST /api/conversations/outbox/process",
        results,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("❌ ERROR bulk messages:", error);
    return NextResponse.json(
      { message: "Error procesando envío masivo" },
      { status: 500 }
    );
  }
}
