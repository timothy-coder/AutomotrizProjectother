import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getTeams } from "@/lib/chatwoot";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  const decoded = auth.user;
  let roleName = decoded?.role || null;

  if (!roleName && decoded?.id) {
    try {
      const [rows] = await db.query(
        `SELECT r.name FROM usuarios u JOIN roles r ON r.id = u.role_id WHERE u.id = ? LIMIT 1`,
        [Number(decoded.id)]
      );
      roleName = rows[0]?.name || null;
    } catch (err) {
      console.error("[my-team] error resolviendo rol:", err.message);
      return NextResponse.json({ team: null });
    }
  }

  if (!roleName) return NextResponse.json({ team: null });

  const role = roleName.toLowerCase();
  if (role.includes("admin")) return NextResponse.json({ team: null, isAdmin: true });

  try {
    const [rows] = await db.query(
      `SELECT rcm.chatwoot_team_id
       FROM roles_chatwoot_mapping rcm
       JOIN roles r ON r.id = rcm.role_id
       WHERE LOWER(r.name) = LOWER(?)
       LIMIT 1`,
      [roleName]
    );
    const teamId = rows[0]?.chatwoot_team_id ?? null;
    if (!teamId) return NextResponse.json({ team: null });

    const teamsData = await getTeams();
    const teams = Array.isArray(teamsData) ? teamsData : (teamsData?.teams ?? []);
    const found = teams.find((t) => t.id === teamId) ?? null;

    return NextResponse.json({
      team: found
        ? { id: found.id, name: found.name }
        : { id: teamId, name: `Equipo ${teamId}` },
    });
  } catch (err) {
    console.error("[my-team] error:", err.message);
    return NextResponse.json({ team: null });
  }
}
