import { NextResponse } from "next/server";
import { markConversationAsRead } from "@/lib/chatwoot";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function POST(req, { params }) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    await markConversationAsRead(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Error marcando conversación como leída:", err);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
