import { NextResponse } from "next/server";
import { assignConversation } from "@/lib/chatwoot";
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
  const { agent_id, team_id } = body;

  if (!agent_id && !team_id) {
    return NextResponse.json(
      { message: "Se requiere agent_id o team_id" },
      { status: 400 }
    );
  }

  try {
    const data = await assignConversation(id, { agentId: agent_id, teamId: team_id });
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error al asignar conversación:", err);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
