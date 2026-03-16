import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";
import { dispatchCampaign } from "@/lib/massWhatsApp";

const MAX_BATCH = 20;

function buildUnauthorizedResponse() {
  return NextResponse.json({ message: "No autorizado" }, { status: 401 });
}

function normalizeLimit(rawValue) {
  const parsed = Number(rawValue);
  if (!Number.isFinite(parsed) || parsed <= 0) return 10;
  return Math.min(parsed, MAX_BATCH);
}

function hasInternalSecret(req) {
  const expected = String(process.env.CONVERSATIONS_OUTBOX_SECRET || "").trim();
  if (!expected) return false;

  const received = String(req.headers.get("x-conversations-outbox-secret") || "").trim();
  return received && received === expected;
}

export async function POST(req) {
  const hasSecret = hasInternalSecret(req);
  if (!hasSecret) {
    const auth = authorizeConversation(req, "create");
    if (!auth.ok) return buildUnauthorizedResponse();
  }

  try {
    const url = new URL(req.url);
    let bodyLimit = null;
    try {
      const body = await req.json();
      bodyLimit = body?.limit;
    } catch {
      bodyLimit = null;
    }

    const limit = normalizeLimit(url.searchParams.get("limit") || bodyLimit);

    const [rows] = await db.query(
      `
      SELECT id
      FROM whatsapp_mass_campaigns
      WHERE status = 'scheduled'
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= NOW()
      ORDER BY scheduled_at ASC, id ASC
      LIMIT ?
      `,
      [limit]
    );

    const campaigns = Array.isArray(rows) ? rows : [];

    const results = [];
    for (const row of campaigns) {
      try {
        // eslint-disable-next-line no-await-in-loop
        const summary = await dispatchCampaign(Number(row.id));
        results.push({ id: row.id, status: "ok", summary });
      } catch (error) {
        results.push({ id: row.id, status: "error", message: error?.message || "Error" });
      }
    }

    return NextResponse.json({
      processed: campaigns.length,
      results,
    });
  } catch (error) {
    console.error("POST /api/envios-masivos/process-scheduled error:", error);
    return NextResponse.json({ message: "Error procesando campañas" }, { status: 500 });
  }
}
