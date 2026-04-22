import { NextResponse } from "next/server";
import { getLabels } from "@/lib/chatwoot";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function GET(req, { params }) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const data = await getLabels(id);
    const labels = data?.payload ?? [];
    return NextResponse.json({ labels });
  } catch (err) {
    console.error("Error obteniendo labels de conversación:", err);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
