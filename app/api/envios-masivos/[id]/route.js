import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";
import { parseCampaignContent, parseCampaignFilters } from "@/lib/massWhatsApp";

function isMissingColumnError(error) {
  return error?.code === "ER_BAD_FIELD_ERROR" || error?.errno === 1054;
}

function isMissingTableError(error) {
  return error?.code === "ER_NO_SUCH_TABLE" || error?.errno === 1146;
}

export async function GET(req, { params }) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const campaignId = Number(id);

    if (!Number.isFinite(campaignId) || campaignId <= 0) {
      return NextResponse.json({ message: "id inválido" }, { status: 400 });
    }

    const [campaignRows] = await db.query(
      `
      SELECT
        c.*,
        COALESCE(u.fullname, 'Sistema') AS created_by_name
      FROM whatsapp_mass_campaigns c
      LEFT JOIN usuarios u ON u.id = c.created_by_user_id
      WHERE c.id = ?
      LIMIT 1
      `,
      [campaignId]
    );

    const campaign = campaignRows?.[0];
    if (!campaign) {
      return NextResponse.json({ message: "Campaña no encontrada" }, { status: 404 });
    }

    const [statusRows] = await db.query(
      `
      SELECT status, COUNT(*) AS total
      FROM campaign_recipients
      WHERE campaign_id = ?
      GROUP BY status
      `,
      [campaignId]
    );

    const [recentRows] = await db.query(
      `
      SELECT
        cr.id,
        cr.client_id,
        cr.session_id,
        cr.phone_normalized,
        cr.recipient_name,
        cr.status,
        cr.sent_at,
        cr.delivered_at,
        cr.read_at,
        cr.responded_at,
        cr.last_error,
        c.nombre AS cliente_nombre,
        c.apellido AS cliente_apellido
      FROM campaign_recipients cr
      LEFT JOIN clientes c ON c.id = cr.client_id
      WHERE cr.campaign_id = ?
      ORDER BY cr.id DESC
      LIMIT 50
      `,
      [campaignId]
    );

    let ctaSummary = {
      contact: 0,
      stop_promotions: 0,
      unknown: 0,
      total: 0,
    };

    let ctaActionsRecent = [];

    try {
      const [ctaSummaryRows] = await db.query(
        `
        SELECT
          SUM(CASE WHEN action_type = 'contact' THEN 1 ELSE 0 END) AS contact,
          SUM(CASE WHEN action_type = 'stop_promotions' THEN 1 ELSE 0 END) AS stop_promotions,
          SUM(CASE WHEN action_type = 'unknown' THEN 1 ELSE 0 END) AS unknown,
          COUNT(*) AS total
        FROM campaign_recipient_actions
        WHERE campaign_id = ?
        `,
        [campaignId]
      );

      const summary = ctaSummaryRows?.[0] || {};
      ctaSummary = {
        contact: Number(summary.contact || 0),
        stop_promotions: Number(summary.stop_promotions || 0),
        unknown: Number(summary.unknown || 0),
        total: Number(summary.total || 0),
      };

      let actionRows = [];
      try {
        const [withJsonColumn] = await db.query(
          `
          SELECT
            a.id,
            a.campaign_recipient_id,
            a.session_id,
            a.client_id,
            a.phone_normalized,
            a.action_type,
            a.action_payload_json,
            a.created_at,
            cr.recipient_name,
            c.nombre AS cliente_nombre,
            c.apellido AS cliente_apellido
          FROM campaign_recipient_actions a
          LEFT JOIN campaign_recipients cr ON cr.id = a.campaign_recipient_id
          LEFT JOIN clientes c ON c.id = COALESCE(a.client_id, cr.client_id)
          WHERE a.campaign_id = ?
          ORDER BY a.id DESC
          LIMIT 20
          `,
          [campaignId]
        );
        actionRows = withJsonColumn;
      } catch (error) {
        if (!(isMissingTableError(error) || isMissingColumnError(error))) throw error;

        const [withLegacyPayload] = await db.query(
          `
          SELECT
            a.id,
            a.campaign_recipient_id,
            a.session_id,
            NULL AS client_id,
            NULL AS phone_normalized,
            a.action_type,
            a.payload AS action_payload_json,
            a.created_at,
            cr.recipient_name,
            c.nombre AS cliente_nombre,
            c.apellido AS cliente_apellido
          FROM campaign_recipient_actions a
          LEFT JOIN campaign_recipients cr ON cr.id = a.campaign_recipient_id
          LEFT JOIN clientes c ON c.id = cr.client_id
          WHERE a.campaign_id = ?
          ORDER BY a.id DESC
          LIMIT 20
          `,
          [campaignId]
        );
        actionRows = withLegacyPayload;
      }

      ctaActionsRecent = Array.isArray(actionRows)
        ? actionRows.map((row) => ({
          ...row,
          action_payload_json: (() => {
            if (!row?.action_payload_json) return null;
            if (typeof row.action_payload_json === "object") return row.action_payload_json;
            try {
              return JSON.parse(row.action_payload_json);
            } catch {
              return null;
            }
          })(),
        }))
        : [];
    } catch (error) {
      if (!(isMissingTableError(error) || isMissingColumnError(error))) throw error;
    }

    const statusSummary = {
      pending: 0,
      queued: 0,
      sent: 0,
      delivered: 0,
      read: 0,
      responded: 0,
      failed: 0,
      skipped: 0,
    };

    for (const row of statusRows || []) {
      const status = String(row.status || "").trim();
      if (Object.prototype.hasOwnProperty.call(statusSummary, status)) {
        statusSummary[status] = Number(row.total || 0);
      }
    }

    return NextResponse.json({
      campaign: {
        ...campaign,
        content_json: parseCampaignContent(campaign.content_json),
        filters_json: parseCampaignFilters(campaign.filters_json),
      },
      status_summary: statusSummary,
      recipients_recent: Array.isArray(recentRows) ? recentRows : [],
      cta_summary: ctaSummary,
      cta_actions_recent: ctaActionsRecent,
    });
  } catch (error) {
    console.error("GET /api/envios-masivos/[id] error:", error);
    return NextResponse.json({ message: "Error obteniendo detalle" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const campaignId = Number(id);

    if (!Number.isFinite(campaignId) || campaignId <= 0) {
      return NextResponse.json({ message: "id inválido" }, { status: 400 });
    }

    const [rows] = await db.query(
      "SELECT id, status FROM whatsapp_mass_campaigns WHERE id = ? LIMIT 1",
      [campaignId]
    );

    const campaign = rows?.[0];
    if (!campaign) {
      return NextResponse.json({ message: "Campaña no encontrada" }, { status: 404 });
    }

    if (campaign.status !== "scheduled") {
      return NextResponse.json(
        { message: `Solo se pueden eliminar campañas programadas. Estado actual: ${campaign.status}` },
        { status: 409 }
      );
    }

    await db.query("DELETE FROM campaign_recipients WHERE campaign_id = ?", [campaignId]);
    await db.query("DELETE FROM whatsapp_mass_campaigns WHERE id = ?", [campaignId]);

    return NextResponse.json({ message: "Campaña eliminada" });
  } catch (error) {
    console.error("DELETE /api/envios-masivos/[id] error:", error);
    return NextResponse.json({ message: "Error eliminando campaña" }, { status: 500 });
  }
}
