import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { enqueueOutbound, isMissingTableError } from "@/lib/conversationsOutbox";

const CAMPAIGN_TYPES = new Set(["ventas", "postventa"]);

function isMissingColumnError(error) {
  return error?.code === "ER_BAD_FIELD_ERROR" || error?.errno === 1054;
}

function normalizeCell(rawPhone) {
  return String(rawPhone || "")
    .replace(/\D/g, "")
    .trim();
}

function normalizePhone(rawPhone) {
  const compact = normalizeCell(rawPhone);
  if (!compact) return "";

  if (compact.startsWith("51") && compact.length >= 11) return `+${compact}`;
  if (compact.length === 9) return `+51${compact}`;
  return `+${compact}`;
}

function getPhoneDigitsSql(columnName) {
  return `REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(${columnName}, '+', ''), ' ', ''), '-', ''), '(', ''), ')', ''), '.', '')`;
}

function isOptOutSchemaMissing(error) {
  return isMissingTableError(error) || isMissingColumnError(error);
}

async function isRecipientOptedOut({ clientId, phone }) {
  const normalizedPhone = normalizePhone(phone);
  if (!clientId && !normalizedPhone) return false;

  try {
    const whereClauses = [];
    const params = [];

    if (clientId) {
      whereClauses.push("client_id = ?");
      params.push(clientId);
    }

    if (normalizedPhone) {
      whereClauses.push("phone_normalized = ?");
      params.push(normalizedPhone);
    }

    const [rows] = await db.query(
      `
      SELECT id
      FROM campaign_opt_outs
      WHERE is_active = 1
        AND revoked_at IS NULL
        AND (${whereClauses.join(" OR ")})
      LIMIT 1
      `,
      params
    );

    return Boolean(rows?.[0]?.id);
  } catch (error) {
    if (isOptOutSchemaMissing(error)) return false;
    throw error;
  }
}

function toOptionalNumber(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toNumberArray(raw) {
  const input = Array.isArray(raw)
    ? raw
    : typeof raw === "string"
      ? raw.split(",")
      : raw == null
        ? []
        : [raw];

  const parsed = input
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item) && item > 0);

  return [...new Set(parsed)];
}

function parseFilters(rawFilters) {
  const marcaIds = toNumberArray(
    rawFilters?.marca_ids ?? rawFilters?.marcas_ids ?? rawFilters?.marca_id
  );
  const modeloIds = toNumberArray(
    rawFilters?.modelo_ids ?? rawFilters?.modelos_ids ?? rawFilters?.modelo_id
  );
  const anio = toOptionalNumber(rawFilters?.anio);

  return {
    marca_ids: marcaIds,
    modelo_ids: modeloIds,
    anio,
  };
}

function buildDynamicFilters(alias, filters, opts = { includeYear: true, yearColumn: "anio" }) {
  const clauses = [];
  const params = [];

  if (Array.isArray(filters.marca_ids) && filters.marca_ids.length) {
    const placeholders = filters.marca_ids.map(() => "?").join(", ");
    clauses.push(`${alias}.marca_id IN (${placeholders})`);
    params.push(...filters.marca_ids);
  }

  if (Array.isArray(filters.modelo_ids) && filters.modelo_ids.length) {
    const placeholders = filters.modelo_ids.map(() => "?").join(", ");
    clauses.push(`${alias}.modelo_id IN (${placeholders})`);
    params.push(...filters.modelo_ids);
  }

  if (opts.includeYear && filters.anio) {
    clauses.push(`${alias}.${opts.yearColumn} = ?`);
    params.push(filters.anio);
  }

  return { clauses, params };
}

async function fetchPostventaAudience(filters) {
  const parsed = parseFilters(filters);
  const where = ["c.celular IS NOT NULL", "TRIM(c.celular) <> ''"];
  const params = [];

  const dynamic = buildDynamicFilters("v", parsed, { includeYear: true, yearColumn: "anio" });
  where.push(...dynamic.clauses);
  params.push(...dynamic.params);

  const queryWithOptOut = `
    SELECT
      c.id AS client_id,
      c.nombre,
      c.apellido,
      c.celular,
      MAX(cs.id) AS session_id
    FROM clientes c
    INNER JOIN vehiculos v ON v.cliente_id = c.id
    LEFT JOIN conversation_sessions cs ON cs.client_id = c.id
    LEFT JOIN campaign_opt_outs oo
      ON oo.is_active = 1
     AND oo.revoked_at IS NULL
     AND (
       oo.client_id = c.id
       OR ${getPhoneDigitsSql("oo.phone_normalized")} = ${getPhoneDigitsSql("c.celular")}
     )
    WHERE ${where.join(" AND ")}
      AND oo.id IS NULL
    GROUP BY c.id, c.nombre, c.apellido, c.celular
    ORDER BY c.id DESC
  `;

  const queryFallback = `
    SELECT
      c.id AS client_id,
      c.nombre,
      c.apellido,
      c.celular,
      MAX(cs.id) AS session_id
    FROM clientes c
    INNER JOIN vehiculos v ON v.cliente_id = c.id
    LEFT JOIN conversation_sessions cs ON cs.client_id = c.id
    WHERE ${where.join(" AND ")}
    GROUP BY c.id, c.nombre, c.apellido, c.celular
    ORDER BY c.id DESC
  `;

  let rows = [];
  try {
    const [withOptOut] = await db.query(queryWithOptOut, params);
    rows = withOptOut;
  } catch (error) {
    if (!isOptOutSchemaMissing(error)) throw error;
    const [fallbackRows] = await db.query(queryFallback, params);
    rows = fallbackRows;
  }

  return rows
    .map((row) => ({
      client_id: Number(row.client_id),
      session_id: row.session_id ? Number(row.session_id) : null,
      phone: normalizePhone(row.celular),
      recipient_name: [row.nombre, row.apellido].filter(Boolean).join(" ").trim() || null,
    }))
    .filter((row) => Boolean(row.phone));
}

async function fetchVentasAudience(filters) {
  const parsed = parseFilters(filters);

  // Siembra base de intereses desde oportunidades vigentes para no depender solo de carga manual.
  await seedVentasInterestsFromOpportunities();

  const audienceByClient = new Map();

  const oppWhere = [
    "c.celular IS NOT NULL",
    "TRIM(c.celular) <> ''",
    "o.oportunidad_id REGEXP '^(OP|LD)-[0-9]+'",
    "NOT EXISTS (SELECT 1 FROM oportunidades child WHERE child.oportunidad_padre_id = o.id)",
  ];
  const oppParams = [];

  const oppDynamic = buildDynamicFilters("o", parsed, { includeYear: false, yearColumn: "anio" });
  oppWhere.push(...oppDynamic.clauses);
  oppParams.push(...oppDynamic.params);

  if (!parsed.anio) {
    const oppQueryWithOptOut = `
      SELECT
        c.id AS client_id,
        c.nombre,
        c.apellido,
        c.celular,
        MAX(cs.id) AS session_id
      FROM oportunidades o
      INNER JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN conversation_sessions cs ON cs.client_id = c.id
      LEFT JOIN campaign_opt_outs oo
        ON oo.is_active = 1
       AND oo.revoked_at IS NULL
       AND (
         oo.client_id = c.id
         OR ${getPhoneDigitsSql("oo.phone_normalized")} = ${getPhoneDigitsSql("c.celular")}
       )
      WHERE ${oppWhere.join(" AND ")}
        AND oo.id IS NULL
      GROUP BY c.id, c.nombre, c.apellido, c.celular
    `;

    const oppQueryFallback = `
      SELECT
        c.id AS client_id,
        c.nombre,
        c.apellido,
        c.celular,
        MAX(cs.id) AS session_id
      FROM oportunidades o
      INNER JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN conversation_sessions cs ON cs.client_id = c.id
      WHERE ${oppWhere.join(" AND ")}
      GROUP BY c.id, c.nombre, c.apellido, c.celular
    `;

    let opportunityRows = [];
    try {
      const [rowsWithOptOut] = await db.query(oppQueryWithOptOut, oppParams);
      opportunityRows = rowsWithOptOut;
    } catch (error) {
      if (!isOptOutSchemaMissing(error)) throw error;
      const [fallbackRows] = await db.query(oppQueryFallback, oppParams);
      opportunityRows = fallbackRows;
    }

    for (const row of opportunityRows) {
      const clientId = Number(row.client_id);
      audienceByClient.set(clientId, {
        client_id: clientId,
        session_id: row.session_id ? Number(row.session_id) : null,
        phone: normalizePhone(row.celular),
        recipient_name: [row.nombre, row.apellido].filter(Boolean).join(" ").trim() || null,
      });
    }
  }

  const interestWhere = ["c.celular IS NOT NULL", "TRIM(c.celular) <> ''", "i.active = 1"];
  const interestParams = [];
  const interestDynamic = buildDynamicFilters("i", parsed, { includeYear: true, yearColumn: "anio_interes" });
  interestWhere.push(...interestDynamic.clauses);
  interestParams.push(...interestDynamic.params);

  const interestQueryWithOptOut = `
    SELECT
      c.id AS client_id,
      c.nombre,
      c.apellido,
      c.celular,
      MAX(cs.id) AS session_id
    FROM client_interest_vehicles i
    INNER JOIN clientes c ON c.id = i.client_id
    LEFT JOIN conversation_sessions cs ON cs.client_id = c.id
    LEFT JOIN campaign_opt_outs oo
      ON oo.is_active = 1
     AND oo.revoked_at IS NULL
     AND (
       oo.client_id = c.id
       OR ${getPhoneDigitsSql("oo.phone_normalized")} = ${getPhoneDigitsSql("c.celular")}
     )
    WHERE ${interestWhere.join(" AND ")}
      AND oo.id IS NULL
    GROUP BY c.id, c.nombre, c.apellido, c.celular
  `;

  const interestQueryFallback = `
    SELECT
      c.id AS client_id,
      c.nombre,
      c.apellido,
      c.celular,
      MAX(cs.id) AS session_id
    FROM client_interest_vehicles i
    INNER JOIN clientes c ON c.id = i.client_id
    LEFT JOIN conversation_sessions cs ON cs.client_id = c.id
    WHERE ${interestWhere.join(" AND ")}
    GROUP BY c.id, c.nombre, c.apellido, c.celular
  `;

  let interestRows = [];
  try {
    const [rowsWithOptOut] = await db.query(interestQueryWithOptOut, interestParams);
    interestRows = rowsWithOptOut;
  } catch (error) {
    if (!isOptOutSchemaMissing(error)) throw error;
    const [fallbackRows] = await db.query(interestQueryFallback, interestParams);
    interestRows = fallbackRows;
  }

  for (const row of interestRows) {
    const clientId = Number(row.client_id);
    if (!audienceByClient.has(clientId)) {
      audienceByClient.set(clientId, {
        client_id: clientId,
        session_id: row.session_id ? Number(row.session_id) : null,
        phone: normalizePhone(row.celular),
        recipient_name: [row.nombre, row.apellido].filter(Boolean).join(" ").trim() || null,
      });
    }
  }

  return Array.from(audienceByClient.values()).filter((row) => Boolean(row.phone));
}

async function seedVentasInterestsFromOpportunities() {
  try {
    await db.query(
      `
      INSERT INTO client_interest_vehicles (
        client_id,
        marca_id,
        modelo_id,
        anio_interes,
        source,
        active,
        created_at,
        updated_at
      )
      SELECT DISTINCT
        o.cliente_id,
        o.marca_id,
        o.modelo_id,
        NULL AS anio_interes,
        'oportunidad' AS source,
        1 AS active,
        NOW() AS created_at,
        NOW() AS updated_at
      FROM oportunidades o
      LEFT JOIN client_interest_vehicles i
        ON i.client_id = o.cliente_id
       AND i.marca_id = o.marca_id
       AND i.modelo_id = o.modelo_id
       AND i.source = 'oportunidad'
      WHERE o.cliente_id IS NOT NULL
        AND o.marca_id IS NOT NULL
        AND o.modelo_id IS NOT NULL
        AND o.oportunidad_id REGEXP '^(OP|LD)-[0-9]+'
        AND NOT EXISTS (
          SELECT 1
          FROM oportunidades child
          WHERE child.oportunidad_padre_id = o.id
        )
        AND i.id IS NULL
      `
    );
  } catch (error) {
    if (isMissingTableError(error) || isMissingColumnError(error)) return;
    throw error;
  }
}

export async function syncVentasInterests() {
  await seedVentasInterestsFromOpportunities();

  const [rows] = await db.query(
    `
    SELECT COUNT(*) AS total
    FROM client_interest_vehicles
    WHERE source = 'oportunidad'
    `
  );

  return {
    total_seeded_interest_rows: Number(rows?.[0]?.total || 0),
  };
}

export async function resolveCampaignAudience({ campaignType, filters }) {
  if (!CAMPAIGN_TYPES.has(campaignType)) {
    throw new Error("Tipo de campaña inválido");
  }

  const recipients = campaignType === "postventa"
    ? await fetchPostventaAudience(filters)
    : await fetchVentasAudience(filters);

  return recipients;
}

export async function ensureSessionForRecipient({ sessionId, clientId, phone }) {
  if (sessionId) {
    const [rows] = await db.query(
      `
      SELECT id, phone, client_id
      FROM conversation_sessions
      WHERE id = ?
      LIMIT 1
      `,
      [sessionId]
    );

    if (rows?.[0]) return rows[0];
  }

  if (clientId) {
    const [rows] = await db.query(
      `
      SELECT id, phone, client_id
      FROM conversation_sessions
      WHERE client_id = ?
      ORDER BY id DESC
      LIMIT 1
      `,
      [clientId]
    );

    if (rows?.[0]) return rows[0];
  }

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return null;

  const [existing] = await db.query(
    `
    SELECT id, phone, client_id
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
      client_id,
      state,
      created_at,
      updated_at
    ) VALUES (?, ?, 'NO_HISTORIAL', NOW(), NOW())
    `,
    [normalizedPhone, clientId || null]
  );

  return {
    id: created.insertId,
    phone: normalizedPhone,
    client_id: clientId || null,
  };
}

async function insertOutboundLog({
  sessionId,
  phone,
  text,
  sourceChannel,
  idempotencyKey,
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
      ) VALUES (?, ?, 'MASS_CAMPAIGN', 'MASS_CAMPAIGN', NULL, ?, 'outbound', 'queued', ?, ?, 1, NULL, NOW())
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
      ) VALUES (?, ?, 'MASS_CAMPAIGN', 'MASS_CAMPAIGN', NULL, ?, 1, NULL, NOW())
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
      last_intent = 'MASS_CAMPAIGN',
      last_message_id = ?
    WHERE id = ?
    `,
    [messageId, sessionId]
  );
}

export async function queueCampaignRecipient({
  campaign,
  recipient,
  messageText,
  content,
}) {
  const optedOut = await isRecipientOptedOut({
    clientId: recipient.client_id,
    phone: recipient.phone_normalized || recipient.phone,
  });

  if (optedOut) {
    await db.query(
      `
      UPDATE campaign_recipients
      SET status = 'skipped', last_error = 'Cliente con opt-out activo', updated_at = NOW()
      WHERE id = ?
      `,
      [recipient.id]
    );

    return { status: "skipped" };
  }

  const resolvedSession = await ensureSessionForRecipient({
    sessionId: recipient.session_id,
    clientId: recipient.client_id,
    phone: recipient.phone_normalized || recipient.phone,
  });

  if (!resolvedSession?.id) {
    await db.query(
      `
      UPDATE campaign_recipients
      SET status = 'skipped', last_error = 'No se pudo resolver sesión/telefono', updated_at = NOW()
      WHERE id = ?
      `,
      [recipient.id]
    );

    return { status: "skipped" };
  }

  const idempotencyKey = `mass:${campaign.id}:${recipient.id}:${randomUUID()}`;

  const inserted = await insertOutboundLog({
    sessionId: resolvedSession.id,
    phone: resolvedSession.phone,
    text: messageText,
    sourceChannel: "whatsapp",
    idempotencyKey,
  });

  await updateSessionAfterOutbound({
    sessionId: resolvedSession.id,
    messageId: inserted.id,
  });

  const payload = {
    session_id: resolvedSession.id,
    phone: resolvedSession.phone,
    text: messageText,
    source: "mass_campaign",
    source_channel: "whatsapp",
    idempotency_key: idempotencyKey,
    campaign_id: campaign.id,
    campaign_type: campaign.campaign_type,
    campaign_recipient_id: recipient.id,
    campaign_name: campaign.campaign_name,
    template_mode: content?.template_mode || "texto",
    template_content: {
      image_url: content?.image_url || null,
      greeting: content?.greeting || null,
      body: content?.body || null,
      closing: content?.closing || null,
    },
    cta: content?.show_cta
      ? {
        enabled: true,
        type: "quick_reply",
        buttons: [
          {
            id: `contact_${campaign.id}_${recipient.id}`,
            title: "QUIERO QUE ME CONTACTEN",
            action: "contact",
          },
          {
            id: `stop_${campaign.id}_${recipient.id}`,
            title: "DETENER PROMOCIONES",
            action: "stop_promotions",
          },
        ],
      }
      : {
        enabled: false,
        type: null,
        buttons: [],
      },
    created_at: new Date().toISOString(),
  };

  try {
    const outbox = await enqueueOutbound({
      sessionId: resolvedSession.id,
      messageLogId: inserted.id,
      phone: resolvedSession.phone,
      source: "mass_campaign",
      sourceChannel: "whatsapp",
      idempotencyKey,
      externalMessageId: null,
      payload,
    });

    if (!outbox.enabled || !outbox.id) {
      await db.query(
        `
        UPDATE campaign_recipients
        SET status = 'failed', message_log_id = ?, last_error = 'Outbox no disponible', updated_at = NOW()
        WHERE id = ?
        `,
        [inserted.id, recipient.id]
      );
      return { status: "failed" };
    }

    await db.query(
      `
      UPDATE campaign_recipients
      SET
        session_id = ?,
        message_log_id = ?,
        outbox_id = ?,
        status = 'queued',
        sent_at = NOW(),
        last_error = NULL,
        updated_at = NOW()
      WHERE id = ?
      `,
      [resolvedSession.id, inserted.id, outbox.id, recipient.id]
    );

    return { status: "queued" };
  } catch (error) {
    const reason = isMissingTableError(error)
      ? "Tabla outbox no disponible"
      : error?.message || "Error encolando destinatario";

    await db.query(
      `
      UPDATE campaign_recipients
      SET status = 'failed', message_log_id = ?, last_error = ?, updated_at = NOW()
      WHERE id = ?
      `,
      [inserted.id, reason, recipient.id]
    );

    return { status: "failed" };
  }
}

export async function dispatchCampaign(campaignId) {
  const [campaignRows] = await db.query(
    `
    SELECT *
    FROM whatsapp_mass_campaigns
    WHERE id = ?
    LIMIT 1
    `,
    [campaignId]
  );

  const campaign = campaignRows?.[0];
  if (!campaign) throw new Error("Campaña no encontrada");

  const [recipientRows] = await db.query(
    `
    SELECT *
    FROM campaign_recipients
    WHERE campaign_id = ?
      AND status IN ('pending', 'failed')
    ORDER BY id ASC
    `,
    [campaignId]
  );

  await db.query(
    `
    UPDATE whatsapp_mass_campaigns
    SET status = 'running', started_at = COALESCE(started_at, NOW()), updated_at = NOW()
    WHERE id = ?
    `,
    [campaignId]
  );

  const content = campaign.content_json
    ? typeof campaign.content_json === "string"
      ? JSON.parse(campaign.content_json)
      : campaign.content_json
    : {};

  const messageText = String(content?.message || "").trim();
  if (!messageText) {
    throw new Error("La campaña no tiene mensaje");
  }

  let queued = 0;
  let failed = 0;
  let skipped = 0;

  for (const recipient of recipientRows) {
    // eslint-disable-next-line no-await-in-loop
    const result = await queueCampaignRecipient({
      campaign,
      recipient,
      messageText,
      content,
    });

    if (result.status === "queued") queued += 1;
    if (result.status === "failed") failed += 1;
    if (result.status === "skipped") skipped += 1;
  }

  await db.query(
    `
    UPDATE whatsapp_mass_campaigns
    SET
      status = 'completed',
      finished_at = NOW(),
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

  return {
    total: recipientRows.length,
    queued,
    failed,
    skipped,
  };
}

export function parseCampaignContent(content) {
  if (!content) return {};
  if (typeof content === "object") return content;
  try {
    return JSON.parse(content);
  } catch {
    return {};
  }
}

export function parseCampaignFilters(filters) {
  if (!filters) return {};
  if (typeof filters === "object") return filters;
  try {
    return JSON.parse(filters);
  } catch {
    return {};
  }
}
