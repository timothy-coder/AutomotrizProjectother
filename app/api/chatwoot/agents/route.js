import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAgents } from "@/lib/chatwoot";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  try {
    const data = await getAgents();
    const agents = Array.isArray(data) ? data : (data?.agents ?? []);

    if (agents.length === 0) return NextResponse.json({ data: [] });

    // Enriquecer con datos CRM en una sola query (evitar N+1)
    const chatwootIds = agents.map((a) => a.id).filter(Boolean);
    const [crmRows] = await db.query(
      `SELECT u.chatwoot_agent_id, u.fullname, u.username, r.name AS role_name
       FROM usuarios u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.chatwoot_agent_id IN (?)`,
      [chatwootIds]
    );

    const crmByAgentId = {};
    for (const row of crmRows) {
      crmByAgentId[row.chatwoot_agent_id] = {
        fullname: row.fullname,
        username: row.username,
        role_name: row.role_name,
      };
    }

    const enriched = agents.map((a) => ({
      ...a,
      crm_user: crmByAgentId[a.id] ?? null,
    }));

    return NextResponse.json({ data: enriched });
  } catch (err) {
    console.error("[chatwoot/agents GET]", err.message);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
