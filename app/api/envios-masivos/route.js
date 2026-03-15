import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";
import {
  dispatchCampaign,
  parseCampaignContent,
  parseCampaignFilters,
  resolveCampaignAudience,
} from "@/lib/massWhatsApp";

const MAX_RECIPIENTS_PER_CAMPAIGN = 2000;

function normalizeCampaignType(value) {
  const type = String(value || "").trim().toLowerCase();
  return ["ventas", "postventa"].includes(type) ? type : null;
}

function normalizeSendType(value) {
  const sendType = String(value || "personalizado").trim().toLowerCase();
  return sendType === "personalizado" ? sendType : null;
}

function parseDateTime(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function formatDateTimeForMySQL(dateObj) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  const hour = String(dateObj.getHours()).padStart(2, "0");
  const minute = String(dateObj.getMinutes()).padStart(2, "0");
  const second = String(dateObj.getSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  try {
    const [rows] = await db.query(
      `
      SELECT
        c.id,
        c.campaign_uuid,
        c.campaign_name,
        c.campaign_type,
        c.channel,
        c.send_type,
        c.status,
        c.send_now,
        c.scheduled_at,
        c.started_at,
        c.finished_at,
        c.total_impacted,
        c.total_responded,
        c.created_by_user_id,
        c.created_at,
        c.updated_at,
        COALESCE(u.fullname, 'Sistema') AS created_by_name,
        COALESCE(agg.sent_count, 0) AS sent_count,
        COALESCE(agg.responded_count, 0) AS responded_count
      FROM whatsapp_mass_campaigns c
      LEFT JOIN usuarios u ON u.id = c.created_by_user_id
      LEFT JOIN (
        SELECT
          campaign_id,
          SUM(CASE WHEN status IN ('queued','sent','delivered','read','responded') THEN 1 ELSE 0 END) AS sent_count,
          SUM(CASE WHEN status = 'responded' THEN 1 ELSE 0 END) AS responded_count
        FROM campaign_recipients
        GROUP BY campaign_id
      ) agg ON agg.campaign_id = c.id
      ORDER BY c.id DESC
      LIMIT 200
      `
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/envios-masivos error:", error);
    return NextResponse.json(
      { message: "Error al listar envíos masivos" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  const auth = authorizeConversation(req, "create");
  if (!auth.ok) return auth.response;

  const conn = await db.getConnection();

  try {
    const body = await req.json();

    const campaignName = String(body?.campaign_name || "").trim();
    const campaignType = normalizeCampaignType(body?.campaign_type);
    const sendType = normalizeSendType(body?.send_type);
    const sendNow = Boolean(body?.send_now);
    const scheduledAtDate = parseDateTime(body?.scheduled_at);
    const filters = body?.filters && typeof body.filters === "object" ? body.filters : {};
    const content = body?.content && typeof body.content === "object" ? body.content : {};
    const message = String(content?.message || "").trim();
    const templateMode = String(content?.template_mode || "texto").trim();
    const imageUrl = String(content?.image_url || "").trim();

    if (!campaignName) {
      return NextResponse.json({ message: "campaign_name es requerido" }, { status: 400 });
    }

    if (!campaignType) {
      return NextResponse.json({ message: "campaign_type inválido" }, { status: 400 });
    }

    if (!sendType) {
      return NextResponse.json({ message: "send_type inválido" }, { status: 400 });
    }

    if (!message) {
      return NextResponse.json({ message: "content.message es requerido" }, { status: 400 });
    }

    if (templateMode === "imagen_texto" && !imageUrl) {
      return NextResponse.json(
        { message: "Debes subir una imagen cuando la plantilla es imagen y texto" },
        { status: 400 }
      );
    }

    if (!sendNow && !scheduledAtDate) {
      return NextResponse.json(
        { message: "Debe indicar scheduled_at o activar send_now" },
        { status: 400 }
      );
    }

    const recipients = await resolveCampaignAudience({
      campaignType,
      filters,
    });

    if (!recipients.length) {
      return NextResponse.json(
        { message: "No se encontraron destinatarios con los filtros seleccionados" },
        { status: 400 }
      );
    }

    if (recipients.length > MAX_RECIPIENTS_PER_CAMPAIGN) {
      return NextResponse.json(
        { message: `Máximo ${MAX_RECIPIENTS_PER_CAMPAIGN} destinatarios por campaña` },
        { status: 400 }
      );
    }

    const createdByUserId = Number(auth.user?.id || 0) || null;

    await conn.beginTransaction();

    const [insertResult] = await conn.query(
      `
      INSERT INTO whatsapp_mass_campaigns (
        campaign_uuid,
        campaign_name,
        campaign_type,
        channel,
        send_type,
        status,
        send_now,
        scheduled_at,
        content_json,
        filters_json,
        total_impacted,
        total_responded,
        created_by_user_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, 'whatsapp', ?, ?, ?, ?, ?, ?, 0, 0, ?, NOW(), NOW())
      `,
      [
        randomUUID(),
        campaignName,
        campaignType,
        sendType,
        sendNow ? "running" : "scheduled",
        sendNow ? 1 : 0,
        sendNow ? null : formatDateTimeForMySQL(scheduledAtDate),
        JSON.stringify({ ...content, template_mode: content?.template_mode || "texto" }),
        JSON.stringify(filters),
        createdByUserId,
      ]
    );

    const campaignId = insertResult.insertId;

    for (const recipient of recipients) {
      // eslint-disable-next-line no-await-in-loop
      await conn.query(
        `
        INSERT INTO campaign_recipients (
          campaign_id,
          client_id,
          session_id,
          phone_normalized,
          recipient_name,
          status,
          created_at,
          updated_at
        ) VALUES (?, ?, ?, ?, ?, 'pending', NOW(), NOW())
        `,
        [
          campaignId,
          recipient.client_id,
          recipient.session_id,
          recipient.phone,
          recipient.recipient_name,
        ]
      );
    }

    await conn.query(
      `
      UPDATE whatsapp_mass_campaigns
      SET total_impacted = ?, updated_at = NOW()
      WHERE id = ?
      `,
      [recipients.length, campaignId]
    );

    await conn.commit();

    let dispatchSummary = null;
    if (sendNow) {
      dispatchSummary = await dispatchCampaign(campaignId);
    }

    const [rows] = await db.query(
      `
      SELECT *
      FROM whatsapp_mass_campaigns
      WHERE id = ?
      LIMIT 1
      `,
      [campaignId]
    );

    const campaign = rows?.[0] || null;

    return NextResponse.json(
      {
        message: sendNow ? "Campaña creada y encolada" : "Campaña programada",
        campaign: {
          ...campaign,
          content_json: parseCampaignContent(campaign?.content_json),
          filters_json: parseCampaignFilters(campaign?.filters_json),
        },
        summary: dispatchSummary,
      },
      { status: 201 }
    );
  } catch (error) {
    try {
      await conn.rollback();
    } catch {
      // Ignorar si no hay transacción activa
    }
    console.error("POST /api/envios-masivos error:", error);
    return NextResponse.json(
      { message: "Error creando envío masivo" },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}
