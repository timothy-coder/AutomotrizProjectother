import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getConversations } from "@/lib/chatwoot";
import { authorizeConversation } from "@/lib/conversationsAuth";

async function resolveTeamId(decoded) {
  const role = String(decoded?.role || "").toLowerCase();
  if (role.includes("admin")) return null; // admin ve todo

  try {
    const [rows] = await db.query(
      `SELECT rcm.chatwoot_team_id
       FROM roles_chatwoot_mapping rcm
       JOIN roles r ON r.id = rcm.role_id
       WHERE LOWER(r.name) = LOWER(?)
       LIMIT 1`,
      [decoded.role || ""]
    );
    return rows[0]?.chatwoot_team_id ?? null;
  } catch (err) {
    console.error("[conversations GET] error resolviendo equipo:", err.message);
    return null;
  }
}

export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status") || "open";
  const inboxId = searchParams.get("inbox_id") ?? undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);

  const allowed = ["open", "resolved", "pending", "snoozed"];
  if (!allowed.includes(statusParam)) {
    return NextResponse.json(
      { message: `status debe ser uno de: ${allowed.join(", ")}` },
      { status: 400 }
    );
  }

  // Determinar team_id efectivo: query param explícito > mapping del rol > sin filtro (admin)
  const explicitTeamId = searchParams.get("team_id") ?? null;
  const teamId = explicitTeamId ?? (await resolveTeamId(auth.user))?.toString() ?? undefined;

  try {
    const data = await getConversations({
      status: statusParam,
      inboxId,
      teamId,
      page,
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error al obtener conversaciones:", err);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
