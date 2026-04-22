import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assignConversation } from "@/lib/chatwoot";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function PUT(req, { params }) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  const { id } = await params;

  if (!id || isNaN(Number(id))) {
    return NextResponse.json({ message: "ID de conversación inválido" }, { status: 400 });
  }

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

  if (agent_id !== undefined && (isNaN(Number(agent_id)) || Number(agent_id) <= 0)) {
    return NextResponse.json({ message: "agent_id debe ser un número positivo" }, { status: 400 });
  }

  if (team_id !== undefined && (isNaN(Number(team_id)) || Number(team_id) <= 0)) {
    return NextResponse.json({ message: "team_id debe ser un número positivo" }, { status: 400 });
  }

  // Si viene agent_id sin team_id, buscar el equipo del agente automáticamente
  let resolvedTeamId = team_id ?? null;
  if (agent_id && !team_id) {
    try {
      const [rows] = await db.query(
        `SELECT rcm.chatwoot_team_id
         FROM usuarios u
         JOIN roles_chatwoot_mapping rcm ON rcm.role_id = u.role_id
         WHERE u.chatwoot_agent_id = ?
         LIMIT 1`,
        [Number(agent_id)]
      );
      resolvedTeamId = rows[0]?.chatwoot_team_id ?? null;
    } catch (err) {
      console.error("[assign] error resolviendo equipo del agente:", err.message);
    }
  }

  try {
    const data = await assignConversation(id, {
      agentId: agent_id,
      teamId: resolvedTeamId,
    });
    return NextResponse.json({ data });
  } catch (err) {
    console.error("Error al asignar conversación:", err.message);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
