import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

/**
 * GET /api/roles/chatwoot-mapping
 * Retorna todos los roles con su mapeo Chatwoot (team_id / agent_id).
 * Roles sin mapeo devuelven chatwoot_team_id y chatwoot_agent_id como null.
 */
export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  try {
    const [rows] = await db.query(`
      SELECT
        r.id        AS role_id,
        r.name      AS role_name,
        r.description,
        m.chatwoot_team_id,
        m.chatwoot_agent_id,
        m.updated_at
      FROM roles r
      LEFT JOIN roles_chatwoot_mapping m ON m.role_id = r.id
      ORDER BY r.id ASC
    `);
    return NextResponse.json({ mappings: rows });
  } catch (err) {
    console.error("[roles/chatwoot-mapping GET]", err.message);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * PUT /api/roles/chatwoot-mapping
 * Crea o actualiza el mapeo de un rol.
 * Body: { role_id: number, chatwoot_team_id?: number|null, chatwoot_agent_id?: number|null }
 */
export async function PUT(req) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body JSON inválido" }, { status: 400 });
  }

  const roleId   = Number(body?.role_id);
  const teamId   = body?.chatwoot_team_id  != null ? Number(body.chatwoot_team_id)  : null;
  const agentId  = body?.chatwoot_agent_id != null ? Number(body.chatwoot_agent_id) : null;

  if (!Number.isInteger(roleId) || roleId < 1) {
    return NextResponse.json({ message: "role_id inválido" }, { status: 400 });
  }

  try {
    const [[role]] = await db.query("SELECT id FROM roles WHERE id = ? LIMIT 1", [roleId]);
    if (!role) {
      return NextResponse.json({ message: "Rol no encontrado" }, { status: 404 });
    }

    await db.query(
      `INSERT INTO roles_chatwoot_mapping (role_id, chatwoot_team_id, chatwoot_agent_id)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE
         chatwoot_team_id  = VALUES(chatwoot_team_id),
         chatwoot_agent_id = VALUES(chatwoot_agent_id)`,
      [roleId, teamId, agentId]
    );

    return NextResponse.json({ ok: true, role_id: roleId, chatwoot_team_id: teamId, chatwoot_agent_id: agentId });
  } catch (err) {
    console.error("[roles/chatwoot-mapping PUT]", err.message);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
