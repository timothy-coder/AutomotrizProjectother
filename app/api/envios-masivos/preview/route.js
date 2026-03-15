import { NextResponse } from "next/server";
import { authorizeConversation } from "@/lib/conversationsAuth";
import { resolveCampaignAudience } from "@/lib/massWhatsApp";

function normalizeCampaignType(value) {
  const type = String(value || "").trim().toLowerCase();
  return ["ventas", "postventa"].includes(type) ? type : null;
}

export async function POST(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json();
    const campaignType = normalizeCampaignType(body?.campaign_type);
    const filters = body?.filters && typeof body.filters === "object" ? body.filters : {};

    if (!campaignType) {
      return NextResponse.json({ message: "campaign_type inválido" }, { status: 400 });
    }

    const recipients = await resolveCampaignAudience({
      campaignType,
      filters,
    });

    return NextResponse.json({
      total: recipients.length,
      sample: recipients.slice(0, 20),
    });
  } catch (error) {
    console.error("POST /api/envios-masivos/preview error:", error);
    return NextResponse.json(
      { message: "Error calculando audiencia" },
      { status: 500 }
    );
  }
}
