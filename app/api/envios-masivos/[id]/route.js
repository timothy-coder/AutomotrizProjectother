import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";
import { parseCampaignContent, parseCampaignFilters } from "@/lib/massWhatsApp";

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
    });
  } catch (error) {
    console.error("GET /api/envios-masivos/[id] error:", error);
    return NextResponse.json({ message: "Error obteniendo detalle" }, { status: 500 });
  }
}
