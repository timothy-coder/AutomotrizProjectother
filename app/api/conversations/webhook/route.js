import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { randomUUID } from "crypto";
import {
  enqueueOutbound,
  isMissingTableError,
  processOutboxItem,
} from "@/lib/conversationsOutbox";
import { normalizePhone as normalizePhoneDigits } from "@/lib/phoneUtils";
import { logConversationAudit } from "@/lib/conversationsAudit";

function normalizePhone(rawPhone) {
  return String(rawPhone || "")
    .replace(/[^\d+]/g, "")
    .trim();
}

function normalizePhoneForOptOut(rawPhone) {
  const digits = normalizePhoneDigits(rawPhone);
  if (!digits) return null;
  return `+${digits}`;
}

const PHONE_DIGITS_SQL = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone_normalized, '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', '')";

function isMissingColumnError(error) {
  return error?.code === "ER_BAD_FIELD_ERROR" || error?.errno === 1054;
}

function isOptOutSchemaMissing(error) {
  return isMissingTableError(error) || isMissingColumnError(error);
}

function getMessageActionType(rawBody = {}) {
  const payload = rawBody?.payload || {};
  const quickReply = payload?.quick_reply || rawBody?.quick_reply || {};
  const interactive = payload?.interactive || rawBody?.interactive || {};

  const candidates = [
    rawBody?.button_action,
    rawBody?.button_id,
    rawBody?.action_type,
    payload?.button_action,
    payload?.button_id,
    payload?.action_type,
    quickReply?.payload,
    interactive?.button_reply?.id,
  ]
    .map((value) => String(value || "").trim().toLowerCase())
    .filter(Boolean);

  if (candidates.some((value) => value.includes("stop_promotions"))) {
    return "stop_promotions";
  }

  if (candidates.some((value) => value.includes("contact"))) {
    return "contact";
  }

  if (candidates.length > 0) return "unknown";
  return null;
}

async function storeCampaignRecipientAction({
  campaignRecipientId,
  campaignId,
  sessionId,
  clientId,
  phone,
  externalEventId,
  actionType,
  payload,
}) {
  if (!campaignRecipientId || !campaignId || !actionType) return;

  try {
    await db.query(
      `
      INSERT INTO campaign_recipient_actions
        (campaign_id, campaign_recipient_id, session_id, client_id, phone_normalized, action_type, action_payload_json, external_event_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())
      `,
      [
        campaignId,
        campaignRecipientId,
        sessionId || null,
        clientId || null,
        normalizePhoneForOptOut(phone) || null,
        actionType,
        JSON.stringify(payload || {}),
        externalEventId || null,
      ]
    );
  } catch (error) {
    if (!isOptOutSchemaMissing(error)) throw error;

    // Compatibilidad con esquema previo (payload JSON sin columnas client/phone/external_event_id).
    try {
      await db.query(
        `
        INSERT INTO campaign_recipient_actions
          (campaign_id, campaign_recipient_id, session_id, action_type, payload, created_at)
        VALUES (?, ?, ?, ?, ?, NOW())
        `,
        [
          campaignId,
          campaignRecipientId,
          sessionId || null,
          actionType,
          JSON.stringify(payload || {}),
        ]
      );
      return;
    } catch (fallbackError) {
      if (isOptOutSchemaMissing(fallbackError)) return;
      throw fallbackError;
    }
  }
}

async function upsertCampaignOptOut({ clientId, phone, payload }) {
  const normalizedPhone = normalizePhoneForOptOut(phone);
  if (!normalizedPhone && !clientId) return;

  const reason = String(payload?.reason || "cta_stop_promotions").slice(0, 120);
  const source = String(payload?.source || "conversations_webhook").slice(0, 40);

  try {
    await db.query(
      `
      INSERT INTO campaign_opt_outs
        (client_id, phone_normalized, source, reason, is_active, stopped_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, NOW(), NOW(), NOW())
      ON DUPLICATE KEY UPDATE
        client_id = COALESCE(VALUES(client_id), campaign_opt_outs.client_id),
        source = VALUES(source),
        reason = VALUES(reason),
        is_active = 1,
        stopped_at = NOW(),
        revoked_at = NULL,
        updated_at = NOW()
      `,
      [clientId || null, normalizedPhone || null, source, reason]
    );
  } catch (error) {
    if (!isOptOutSchemaMissing(error)) throw error;

    // Compatibilidad con esquema previo (metadata JSON en lugar de source/reason).
    try {
      await db.query(
        `
        INSERT INTO campaign_opt_outs
          (client_id, phone_normalized, is_active, stopped_at, metadata, created_at, updated_at)
        VALUES (?, ?, 1, NOW(), ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE
          client_id = COALESCE(VALUES(client_id), campaign_opt_outs.client_id),
          is_active = 1,
          stopped_at = NOW(),
          revoked_at = NULL,
          metadata = VALUES(metadata),
          updated_at = NOW()
        `,
        [clientId || null, normalizedPhone || null, JSON.stringify(payload || {})]
      );
      return;
    } catch (fallbackError) {
      if (isOptOutSchemaMissing(fallbackError)) return;
      throw fallbackError;
    }
  }
}

function normalizePlatform(raw) {
  const value = String(raw || "").trim().toLowerCase();
  if (value === "instagram" || value === "facebook") return value;
  return null;
}

function normalizeCell(rawPhone) {
  return String(rawPhone || "").replace(/\D/g, "").trim();
}

async function resolvePhoneFromSocialIdentity(platform, platformId) {
  if (!platform || !platformId) return null;

  try {
    const [rows] = await db.query(
      `
      SELECT celular
      FROM social_identities
      WHERE platform = ?
        AND platform_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [platform, platformId]
    );

    const celular = rows?.[0]?.celular;
    if (!celular) return null;
    return normalizePhone(celular);
  } catch (error) {
    if (isMissingTableError(error) || isMissingColumnError(error)) return null;
    throw error;
  }
}

async function linkSocialIdentity({ platform, platformId, phone }) {
  if (!platform || !platformId || !phone) {
    return { linked: false, reason: "Datos incompletos para vinculación" };
  }

  const celular = normalizeCell(phone);
  if (!celular) return { linked: false, reason: "Celular inválido" };

  try {
    const [rows] = await db.query(
      `
      SELECT id, celular
      FROM social_identities
      WHERE platform = ?
        AND platform_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [platform, platformId]
    );

    const existing = rows?.[0] || null;

    if (existing?.id) {
      if (String(existing.celular || "") !== celular) {
        await db.query(
          `
          UPDATE social_identities
          SET celular = ?
          WHERE id = ?
          `,
          [celular, existing.id]
        );
      }

      return { linked: true, updated: true };
    }

    await db.query(
      `
      INSERT INTO social_identities (platform, platform_id, celular, created_at)
      VALUES (?, ?, ?, NOW())
      `,
      [platform, platformId, celular]
    );

    return { linked: true, created: true };
  } catch (error) {
    if (isMissingTableError(error) || isMissingColumnError(error)) {
      return { linked: false, reason: "Tabla social_identities no disponible" };
    }
    throw error;
  }
}

function getSlaMinutes() {
  const raw = Number(process.env.CONVERSATIONS_SLA_MINUTES || 30);
  if (Number.isNaN(raw)) return 30;
  return Math.max(5, Math.min(raw, 1440));
}

function getCtaAutoReplyText(actionType) {
  if (actionType === "contact") {
    return "Gracias por tu respuesta. Un asesor se pondra en contacto contigo en breve.";
  }

  if (actionType === "stop_promotions") {
    return "Entendido. Hemos registrado tu solicitud y dejaremos de enviarte promociones.";
  }

  return null;
}

async function getSessionPhone(sessionId) {
  if (!sessionId) return null;

  const [rows] = await db.query(
    `
    SELECT phone
    FROM conversation_sessions
    WHERE id = ?
    LIMIT 1
    `,
    [sessionId]
  );

  return normalizePhone(rows?.[0]?.phone || "") || null;
}

async function insertAutoReplyLog({ sessionId, phone, text, sourceChannel, idempotencyKey }) {
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
      ) VALUES (?, ?, 'AUTO_REPLY', 'AUTO_REPLY', NULL, ?, 'outbound', 'queued', ?, ?, 1, NULL, NOW())
      `,
      [sessionId, phone || null, text, sourceChannel || null, idempotencyKey]
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
      ) VALUES (?, ?, 'AUTO_REPLY', 'AUTO_REPLY', NULL, ?, 1, NULL, NOW())
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
      last_intent = 'AUTO_REPLY',
      last_message_id = ?
    WHERE id = ?
    `,
    [messageId, sessionId]
  );
}

async function enqueueCtaAutoReply({
  sessionId,
  phone,
  sourceChannel,
  actionType,
  externalMessageId,
  campaignResponse,
}) {
  const text = getCtaAutoReplyText(actionType);
  if (!text) return { attempted: false, reason: "No aplica auto-reply" };

  const resolvedPhone = normalizePhone(phone) || await getSessionPhone(sessionId);
  if (!resolvedPhone) {
    return { attempted: false, reason: "No se pudo resolver telefono para auto-reply" };
  }

  const idempotencyKey = `cta_autoreply:${campaignResponse?.campaign_recipient_id || "na"}:${actionType}:${externalMessageId || randomUUID()}`;

  const inserted = await insertAutoReplyLog({
    sessionId,
    phone: resolvedPhone,
    text,
    sourceChannel,
    idempotencyKey,
  });

  await updateSessionAfterOutbound({
    sessionId,
    messageId: inserted.id,
  });

  const payload = {
    session_id: sessionId,
    phone: resolvedPhone,
    text,
    source: "campaign_cta_auto_reply",
    source_channel: sourceChannel || "whatsapp",
    idempotency_key: idempotencyKey,
    external_message_id: null,
    reply_to_external_message_id: externalMessageId || null,
    campaign_id: campaignResponse?.campaign_id || null,
    campaign_recipient_id: campaignResponse?.campaign_recipient_id || null,
    cta_action: actionType,
    created_at: new Date().toISOString(),
  };

  const outbox = await enqueueOutbound({
    sessionId,
    messageLogId: inserted.id,
    phone: resolvedPhone,
    source: "campaign_cta_auto_reply",
    sourceChannel: sourceChannel || "whatsapp",
    idempotencyKey,
    externalMessageId: null,
    payload,
  });

  if (!outbox.enabled || !outbox.id) {
    return { attempted: false, reason: "Outbox no disponible" };
  }

  const processResult = await processOutboxItem(outbox.id);
  return {
    attempted: true,
    outbox_id: outbox.id,
    sent: Boolean(processResult?.ok),
    outbox_status: processResult?.status || (processResult?.ok ? "sent" : "retrying"),
    reason: processResult?.reason || null,
  };
}

async function findByExternalMessageId(externalMessageId) {
  if (!externalMessageId) return null;

  try {
    const [rows] = await db.query(
      `
      SELECT id, session_id, message_status, created_at
      FROM agent_actions_log
      WHERE external_message_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [externalMessageId]
    );
    return rows?.[0] || null;
  } catch (error) {
    if (isMissingColumnError(error)) return null;
    throw error;
  }
}

async function updateMessageStatusByExternalId(externalMessageId, status, providerPayload) {
  try {
    const [result] = await db.query(
      `
      UPDATE agent_actions_log
      SET
        message_status = ?,
        provider_payload_json = ?,
        success = ?,
        error_message = CASE WHEN ? = 'failed' THEN COALESCE(error_message, 'Proveedor marco error') ELSE NULL END
      WHERE external_message_id = ?
      `,
      [
        status,
        providerPayload ? JSON.stringify(providerPayload) : null,
        status === "failed" ? 0 : 1,
        status,
        externalMessageId,
      ]
    );
    return result?.affectedRows || 0;
  } catch (error) {
    if (isMissingColumnError(error)) return 0;
    throw error;
  }
}

async function recalcCampaignTotals(campaignId) {
  if (!campaignId) return;

  try {
    await db.query(
      `
      UPDATE whatsapp_mass_campaigns
      SET
        total_impacted = (
          SELECT COUNT(*)
          FROM campaign_recipients
          WHERE campaign_id = ?
            AND status IN ('queued', 'sent', 'delivered', 'read', 'responded')
        ),
        total_responded = (
          SELECT COUNT(*)
          FROM campaign_recipients
          WHERE campaign_id = ?
            AND status = 'responded'
        ),
        updated_at = NOW()
      WHERE id = ?
      `,
      [campaignId, campaignId, campaignId]
    );
  } catch (error) {
    if (isMissingTableError(error) || isMissingColumnError(error)) return;
    throw error;
  }
}

async function syncCampaignRecipientStatus({
  campaignRecipientId,
  messageLogId,
  status,
  providerPayload,
}) {
  if (!campaignRecipientId && !messageLogId) return { updatedRows: 0, campaignIds: [] };

  const nextStatus = status === "read"
    ? "read"
    : status === "delivered"
      ? "delivered"
      : status === "failed"
        ? "failed"
        : "sent";

  try {
    const recipientId = campaignRecipientId || null;
    const msgLogId = messageLogId || null;

    const [result] = await db.query(
      `
      UPDATE campaign_recipients
      SET
        status = CASE
          WHEN status = 'responded' THEN status
          ELSE ?
        END,
        sent_at = CASE
          WHEN sent_at IS NULL AND ? IN ('sent','delivered','read') THEN NOW()
          ELSE sent_at
        END,
        delivered_at = CASE
          WHEN ? = 'delivered' THEN NOW()
          ELSE delivered_at
        END,
        read_at = CASE
          WHEN ? = 'read' THEN NOW()
          ELSE read_at
        END,
        last_error = CASE
          WHEN ? = 'failed' THEN COALESCE(?, 'Proveedor reportó fallo')
          ELSE NULL
        END,
        updated_at = NOW()
      WHERE (? IS NOT NULL AND id = ?)
         OR (? IS NOT NULL AND message_log_id = ?)
      `,
      [
        nextStatus,
        nextStatus,
        nextStatus,
        nextStatus,
        nextStatus,
        providerPayload ? JSON.stringify(providerPayload) : null,
        recipientId, recipientId,
        msgLogId, msgLogId,
      ]
    );

    const [campaignRows] = await db.query(
      `
      SELECT DISTINCT campaign_id
      FROM campaign_recipients
      WHERE (? IS NOT NULL AND id = ?)
         OR (? IS NOT NULL AND message_log_id = ?)
      `,
      [recipientId, recipientId, msgLogId, msgLogId]
    );

    const campaignIds = (campaignRows || [])
      .map((row) => Number(row.campaign_id || 0))
      .filter((id) => id > 0);

    for (const campaignId of campaignIds) {
      // eslint-disable-next-line no-await-in-loop
      await recalcCampaignTotals(campaignId);
    }

    return {
      updatedRows: result?.affectedRows || 0,
      campaignIds,
    };
  } catch (error) {
    if (isMissingTableError(error) || isMissingColumnError(error)) {
      return { updatedRows: 0, campaignIds: [] };
    }
    throw error;
  }
}

async function markCampaignResponseWithinWindow({
  sessionId,
  inboundMessageId,
  phone,
  clientId,
}) {
  if (!inboundMessageId) return { matched: false };

  try {
    const sidParam = sessionId || null;
    const cidParam = clientId || null;
    const phoneDigits = normalizePhoneDigits(phone);
    const phoneParam = phoneDigits || null;

    if (!sidParam && !cidParam && !phoneParam) return { matched: false };

    const [rows] = await db.query(
      `
      SELECT id, campaign_id
      FROM campaign_recipients
      WHERE (
        (? IS NOT NULL AND session_id = ?)
        OR (? IS NOT NULL AND client_id = ?)
        OR (? IS NOT NULL AND REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone_normalized, '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', '') = ?)
      )
        AND sent_at IS NOT NULL
        AND sent_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        AND status IN ('queued', 'sent', 'delivered', 'read')
      ORDER BY sent_at DESC, id DESC
      LIMIT 1
      `,
      [sidParam, sidParam, cidParam, cidParam, phoneParam, phoneParam]
    );

    const recipient = rows?.[0];
    if (!recipient?.id) return { matched: false };

    await db.query(
      `
      UPDATE campaign_recipients
      SET
        status = 'responded',
        responded_at = NOW(),
        first_inbound_message_id = COALESCE(first_inbound_message_id, ?),
        updated_at = NOW()
      WHERE id = ?
      `,
      [inboundMessageId, recipient.id]
    );

    await recalcCampaignTotals(Number(recipient.campaign_id));

    return {
      matched: true,
      campaign_id: Number(recipient.campaign_id),
      campaign_recipient_id: Number(recipient.id),
    };
  } catch (error) {
    if (isMissingTableError(error) || isMissingColumnError(error)) {
      return { matched: false };
    }
    throw error;
  }
}

async function insertInboundLog({
  sessionId,
  phone,
  text,
  sourceChannel,
  source,
  externalMessageId,
  providerPayload,
}) {
  const idempotencyKey = `inbound:${externalMessageId || randomUUID()}`;

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
        external_message_id,
        idempotency_key,
        provider_payload_json,
        success,
        error_message,
        created_at
      ) VALUES (?, ?, 'INBOUND_MESSAGE', 'INBOUND_MESSAGE', ?, NULL, 'inbound', 'received', ?, ?, ?, ?, 1, NULL, NOW())
      `,
      [
        sessionId,
        phone || null,
        text,
        sourceChannel || source || null,
        externalMessageId || null,
        idempotencyKey,
        providerPayload ? JSON.stringify(providerPayload) : null,
      ]
    );

    return { id: result.insertId, tracked: true, idempotencyKey };
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
      ) VALUES (?, ?, 'INBOUND_MESSAGE', 'INBOUND_MESSAGE', ?, NULL, 1, NULL, NOW())
      `,
      [sessionId, phone || null, text]
    );

    return { id: legacyResult.insertId, tracked: false, idempotencyKey };
  }
}

async function resolveSessionId(phone, clientId) {
  if (clientId) {
    const [byClient] = await db.query(
      `
      SELECT id
      FROM conversation_sessions
      WHERE client_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [clientId]
    );

    if (byClient?.[0]?.id) return byClient[0].id;
  }

  const [byPhone] = await db.query(
    `
    SELECT id
    FROM conversation_sessions
    WHERE phone = ?
    ORDER BY id DESC
    LIMIT 1
    `,
    [phone]
  );

  if (byPhone?.[0]?.id) return byPhone[0].id;

  const [inserted] = await db.query(
    `
    INSERT INTO conversation_sessions (
      phone,
      state,
      client_id,
      created_at,
      updated_at
    ) VALUES (?, 'NO_HISTORIAL', ?, NOW(), NOW())
    `,
    [phone || null, clientId || null]
  );

  return inserted.insertId;
}

// POST /api/conversations/webhook
// Este endpoint recibe mensajes entrantes normalizados desde n8n/proveedor.
// Header opcional: x-conversations-webhook-secret
// Body:
// {
//   phone: string,
//   text: string,
//   source?: string,
//   client_id?: number,
//   platform?: "instagram" | "facebook",
//   platform_id?: string,
//   external_message_id?: string,
//   event_type?: "message" | "status",
//   status?: "queued" | "sent" | "delivered" | "read" | "failed",
//   source_channel?: string,
//   payload?: object
// }
export async function POST(req) {
  try {
    const expectedSecret = process.env.CONVERSATIONS_WEBHOOK_SECRET;
    const providedSecret = req.headers.get("x-conversations-webhook-secret") || "";

    if (!expectedSecret || providedSecret !== expectedSecret) {
      console.warn("[webhook] Intento no autorizado — secret inválido o env var no seteada");
      return NextResponse.json({ message: "Webhook no autorizado" }, { status: 401 });
    }

    const body = await req.json();

    const eventType = (body?.event_type || "message").trim();
    const externalMessageId = (body?.external_message_id || "").trim();
    const sourceChannel = (body?.source_channel || "whatsapp").trim();
    const providerPayload = body?.payload || null;

    if (eventType === "status") {
      const status = (body?.status || "").trim();
      const campaignRecipientId = Number(body?.campaign_recipient_id) || null;
      if (!externalMessageId || !status) {
        return NextResponse.json(
          { message: "external_message_id y status son requeridos" },
          { status: 400 }
        );
      }

      const allowedStatuses = new Set(["queued", "sent", "delivered", "read", "failed"]);
      if (!allowedStatuses.has(status)) {
        return NextResponse.json({ message: "status inválido" }, { status: 400 });
      }

      const trackedMessage = await findByExternalMessageId(externalMessageId);
      const affected = await updateMessageStatusByExternalId(
        externalMessageId,
        status,
        providerPayload
      );

      const campaignSync = await syncCampaignRecipientStatus({
        campaignRecipientId,
        messageLogId: trackedMessage?.id || null,
        status,
        providerPayload,
      });

      return NextResponse.json({
        message: "Estado procesado",
        external_message_id: externalMessageId,
        status,
        updated_rows: affected,
        campaign_recipient_rows: campaignSync.updatedRows,
        campaign_ids: campaignSync.campaignIds,
      });
    }

    const text = (body?.text || "").trim();
    const source = (body?.source || "n8n").trim();
    const platform = normalizePlatform(body?.platform || body?.source_channel || source);
    const platformId = String(
      body?.platform_id || body?.social_id || body?.sender_id || ""
    ).trim();
    const providedPhone = normalizePhone(body?.phone);
    const identityPhone = providedPhone
      ? null
      : await resolvePhoneFromSocialIdentity(platform, platformId);
    const phone = providedPhone || identityPhone;
    const clientId = Number(body?.client_id) || null;

    if (!text) {
      return NextResponse.json({ message: "text es requerido" }, { status: 400 });
    }

    if (!phone && !clientId) {
      return NextResponse.json(
        {
          message: "Se requiere phone o client_id (o identidad social ya vinculada)",
          needs_identity_link: Boolean(platform && platformId),
          platform: platform || null,
          platform_id: platformId || null,
        },
        { status: 400 }
      );
    }

    const duplicate = await findByExternalMessageId(externalMessageId);
    if (duplicate) {
      return NextResponse.json(
        {
          message: "Mensaje ya procesado",
          deduplicated: true,
          message_id: duplicate.id,
          session_id: duplicate.session_id,
          external_message_id: externalMessageId,
        },
        { status: 200 }
      );
    }

    const sessionId = await resolveSessionId(phone, clientId);

    const inserted = await insertInboundLog({
      sessionId,
      phone,
      text,
      sourceChannel,
      source,
      externalMessageId,
      providerPayload,
    });

    const campaignResponse = await markCampaignResponseWithinWindow({
      sessionId,
      inboundMessageId: inserted.id,
      phone,
      clientId,
    });

    const actionType = getMessageActionType(body);
    let ctaAutoReply = { attempted: false, reason: "No aplica" };

    if (campaignResponse?.matched && actionType) {
      const actionPayload = {
        external_message_id: externalMessageId || null,
        button_action: body?.button_action ?? body?.payload?.button_action ?? null,
        button_id: body?.button_id ?? body?.payload?.button_id ?? null,
        action_type: body?.action_type ?? body?.payload?.action_type ?? null,
        quick_reply: body?.quick_reply ?? body?.payload?.quick_reply ?? null,
        interactive: body?.interactive ?? body?.payload?.interactive ?? null,
        source_channel: sourceChannel || null,
        source: source || null,
      };

      await storeCampaignRecipientAction({
        campaignRecipientId: campaignResponse.campaign_recipient_id,
        campaignId: campaignResponse.campaign_id,
        sessionId,
        clientId,
        phone,
        externalEventId: externalMessageId || null,
        actionType,
        payload: actionPayload,
      });

      if (actionType === "stop_promotions") {
        await upsertCampaignOptOut({
          clientId,
          phone,
          payload: {
            reason: "cta_stop_promotions",
            source: "conversations_webhook",
            campaign_id: campaignResponse.campaign_id,
            campaign_recipient_id: campaignResponse.campaign_recipient_id,
            external_message_id: externalMessageId || null,
          },
        });
      }

      if (actionType === "contact" || actionType === "stop_promotions") {
        try {
          ctaAutoReply = await enqueueCtaAutoReply({
            sessionId,
            phone,
            sourceChannel,
            actionType,
            externalMessageId,
            campaignResponse,
          });
        } catch (error) {
          if (!isMissingTableError(error)) throw error;
          ctaAutoReply = {
            attempted: false,
            reason: "Tabla outbox no disponible para auto-reply",
          };
        }
      }
    }

    const identityLink = await linkSocialIdentity({
      platform,
      platformId,
      phone,
    });

    const slaMinutes = getSlaMinutes();
    // Si el mensaje viene del agente de ventas IA, marcar la sesión con source='ventas_ia'
    // para que el routing del Bot Taller v14 pueda detectar conversaciones activas de ventas.
    const isVentasSource = source === "ventas_ia";
    try {
      await db.query(
        `
        UPDATE conversation_sessions
        SET
          updated_at = NOW(),
          last_intent = 'INBOUND_MESSAGE',
          last_message_id = ?,
          last_inbound_at = NOW(),
          assignment_status = CASE
            WHEN COALESCE(assignment_status, 'unassigned') = 'closed' THEN 'open'
            ELSE COALESCE(assignment_status, 'open')
          END,
          sla_due_at = DATE_ADD(NOW(), INTERVAL ? MINUTE),
          source = CASE WHEN ? THEN 'ventas_ia' ELSE COALESCE(source, 'manual') END
        WHERE id = ?
        `,
        [inserted.id, slaMinutes, isVentasSource, sessionId]
      );

      // Auditoría: loguear el cambio de last_intent y sla_due_at para trazabilidad
      logConversationAudit({
        sessionId,
        actionType: "INBOUND_MESSAGE",
        actorUserId: null,
        actorRole: source || "webhook",
        changes: { last_intent: "INBOUND_MESSAGE", source_channel: sourceChannel },
        metadata: { message_id: inserted.id, phone, source },
      }).catch((err) => console.error("[webhook] logConversationAudit failed:", err));
    } catch (error) {
      if (!isMissingColumnError(error)) throw error;

      await db.query(
        `
        UPDATE conversation_sessions
        SET
          updated_at = NOW(),
          last_intent = 'INBOUND_MESSAGE',
          last_message_id = ?
        WHERE id = ?
        `,
        [inserted.id, sessionId]
      );
    }

    return NextResponse.json(
      {
        message: "Webhook procesado",
        session_id: sessionId,
        message_id: inserted.id,
        source,
        source_channel: sourceChannel,
        platform: platform || null,
        platform_id: platformId || null,
        identity_phone_resolved: Boolean(identityPhone),
        identity_linked: Boolean(identityLink?.linked),
        external_message_id: externalMessageId || null,
        tracking_enabled: inserted.tracked,
        idempotency_key: inserted.idempotencyKey,
        campaign_response_matched: Boolean(campaignResponse?.matched),
        campaign_response: campaignResponse,
        cta_auto_reply: ctaAutoReply,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("❌ ERROR webhook conversaciones:", error);
    return NextResponse.json(
      { message: "Error procesando webhook" },
      { status: 500 }
    );
  }
}
