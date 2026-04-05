import { NextResponse } from "next/server";
import { updateConversationStatus } from "@/lib/chatwoot";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function POST(req, { params }) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  const { id } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body JSON inválido" }, { status: 400 });
  }
  const { status } = body;
  const allowed = ["open", "resolved", "pending", "snoozed"];
  if (!allowed.includes(status)) {
    return NextResponse.json(
      { message: `status debe ser uno de: ${allowed.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const data = await updateConversationStatus(id, status);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error al actualizar estado de conversación:", err);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
