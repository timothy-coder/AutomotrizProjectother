import { NextResponse } from "next/server";
import { authorizeConversation } from "@/lib/conversationsAuth";
import { dispatchCampaign } from "@/lib/massWhatsApp";

export async function POST(req, { params }) {
  const auth = authorizeConversation(req, "create");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await params;
    const campaignId = Number(id);

    if (!Number.isFinite(campaignId) || campaignId <= 0) {
      return NextResponse.json({ message: "id inválido" }, { status: 400 });
    }

    const summary = await dispatchCampaign(campaignId);

    return NextResponse.json({
      message: "Campaña encolada",
      summary,
    });
  } catch (error) {
    console.error("POST /api/envios-masivos/[id]/dispatch error:", error);
    return NextResponse.json(
      { message: error?.message || "Error despachando campaña" },
      { status: 500 }
    );
  }
}
