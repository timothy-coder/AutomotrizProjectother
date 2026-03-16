import { db } from "@/lib/db";

function isMissingTableError(error) {
  return error?.code === "ER_NO_SUCH_TABLE" || error?.errno === 1146;
}

function isMissingColumnError(error) {
  return error?.code === "ER_BAD_FIELD_ERROR" || error?.errno === 1054;
}

function getWebhookUrl(source) {
  if (source === "mass_campaign") {
    return process.env.N8N_CAMPAIGN_OUTBOUND_URL || process.env.N8N_CONVERSATIONS_OUTBOUND_URL || "";
  }
  return process.env.N8N_CONVERSATIONS_OUTBOUND_URL || "";
}

function getMaxRetries() {
  const raw = Number(process.env.CONVERSATIONS_OUTBOX_MAX_RETRIES || 5);
  if (Number.isNaN(raw)) return 5;
  return Math.max(1, Math.min(raw, 20));
}

function getRetryDelayMinutes(retryCount) {
  const capped = Math.min(Math.max(retryCount, 1), 8);
  return Math.min(2 ** capped, 60);
}

function isOutboxEnabled() {
  return Boolean(getWebhookUrl(null));
}

export async function enqueueOutbound({
  sessionId,
  messageLogId,
  phone,
  source,
  sourceChannel,
  idempotencyKey,
  externalMessageId,
  payload,
}) {
  try {
    const [result] = await db.query(
      `
      INSERT INTO conversations_outbox (
        message_log_id,
        session_id,
        phone,
        source,
        source_channel,
        idempotency_key,
        external_message_id,
        payload_json,
        status,
        retry_count,
        next_retry_at,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, NOW(), NOW(), NOW())
      `,
      [
        messageLogId,
        sessionId,
        phone || null,
        source || null,
        sourceChannel || null,
        idempotencyKey || null,
        externalMessageId || null,
        JSON.stringify(payload || {}),
      ]
    );

    return { enabled: true, id: result.insertId };
  } catch (error) {
    if (isMissingTableError(error)) {
      return { enabled: false, id: null, reason: "Tabla conversations_outbox no existe" };
    }
    throw error;
  }
}

async function setLogDeliveryState(logId, { status, success, errorMessage }) {
  try {
    await db.query(
      `
      UPDATE agent_actions_log
      SET message_status = ?, success = ?, error_message = ?
      WHERE id = ?
      `,
      [status, success ? 1 : 0, errorMessage || null, logId]
    );
  } catch (error) {
    if (isMissingColumnError(error)) return;
    throw error;
  }
}

async function markOutboxSent(outboxId) {
  await db.query(
    `
    UPDATE conversations_outbox
    SET
      status = 'sent',
      sent_at = NOW(),
      last_error = NULL,
      updated_at = NOW()
    WHERE id = ?
    `,
    [outboxId]
  );
}

async function markOutboxFailed(outboxId, { retryCount, maxRetries, reason }) {
  const exhausted = retryCount >= maxRetries;
  await db.query(
    `
    UPDATE conversations_outbox
    SET
      status = ?,
      retry_count = ?,
      last_error = ?,
      next_retry_at = CASE
        WHEN ? THEN NULL
        ELSE DATE_ADD(NOW(), INTERVAL ? MINUTE)
      END,
      updated_at = NOW()
    WHERE id = ?
    `,
    [
      exhausted ? "failed" : "retrying",
      retryCount,
      reason || "Error enviando webhook",
      exhausted ? 1 : 0,
      getRetryDelayMinutes(retryCount),
      outboxId,
    ]
  );
}

async function fetchOutboxById(outboxId) {
  const [rows] = await db.query(
    `
    SELECT *
    FROM conversations_outbox
    WHERE id = ?
    LIMIT 1
    `,
    [outboxId]
  );

  return rows?.[0] || null;
}

async function sendWebhook(payload) {
  const webhookUrl = getWebhookUrl(payload?.source);

  if (!webhookUrl) {
    return { ok: false, reason: "N8N_CONVERSATIONS_OUTBOUND_URL no configurado" };
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const body = await res.text();
      return { ok: false, reason: `Error ${res.status}: ${body}` };
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, reason: `Error de conexión: ${error.message}` };
  }
}

export async function processOutboxItem(outboxId) {
  const item = await fetchOutboxById(outboxId);

  if (!item) {
    return { ok: false, processed: false, reason: "Item outbox no encontrado" };
  }

  if (item.status === "sent") {
    return { ok: true, processed: false, status: "sent", reason: "Ya enviado" };
  }

  let payload = {};
  try {
    payload = item.payload_json ? JSON.parse(item.payload_json) : {};
  } catch {
    payload = {};
  }

  const maxRetries = getMaxRetries();
  const nextRetryCount = Number(item.retry_count || 0) + 1;

  const send = await sendWebhook(payload);

  if (send.ok) {
    await markOutboxSent(item.id);
    await setLogDeliveryState(item.message_log_id, {
      status: "sent",
      success: true,
      errorMessage: null,
    });

    return { ok: true, processed: true, status: "sent" };
  }

  await markOutboxFailed(item.id, {
    retryCount: nextRetryCount,
    maxRetries,
    reason: send.reason,
  });

  await setLogDeliveryState(item.message_log_id, {
    status: nextRetryCount >= maxRetries ? "failed" : "queued",
    success: false,
    errorMessage: send.reason,
  });

  return {
    ok: false,
    processed: true,
    status: nextRetryCount >= maxRetries ? "failed" : "retrying",
    reason: send.reason,
    retry_count: nextRetryCount,
  };
}

export async function processPendingOutbox(limit = 20) {
  let rows;
  try {
    [rows] = await db.query(
      `
      SELECT id
      FROM conversations_outbox
      WHERE status IN ('pending', 'retrying')
        AND (next_retry_at IS NULL OR next_retry_at <= NOW())
      ORDER BY id ASC
      LIMIT ?
      `,
      [Math.max(1, Math.min(Number(limit) || 20, 100))]
    );
  } catch (error) {
    if (isMissingTableError(error)) {
      return { processed: 0, results: [], disabled: true, reason: "Tabla conversations_outbox no existe" };
    }
    throw error;
  }

  const items = Array.isArray(rows) ? rows : [];
  const results = [];

  for (const row of items) {
    // eslint-disable-next-line no-await-in-loop
    const result = await processOutboxItem(row.id);
    results.push({ id: row.id, ...result });
  }

  return {
    processed: results.length,
    results,
  };
}

export { isOutboxEnabled, isMissingTableError };
