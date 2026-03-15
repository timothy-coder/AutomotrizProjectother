import { NextResponse } from "next/server";
import { authorizeConversation } from "@/lib/conversationsAuth";
import { syncVentasInterests } from "@/lib/massWhatsApp";

export async function POST(req) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  try {
    const result = await syncVentasInterests();

    return NextResponse.json({
      message: "Intereses de ventas sincronizados",
      ...result,
    });
  } catch (error) {
    console.error("POST /api/envios-masivos/sync-intereses error:", error);
    return NextResponse.json(
      { message: "Error sincronizando intereses" },
      { status: 500 }
    );
  }
}
