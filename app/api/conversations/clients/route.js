import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

function isMissingColumnError(error) {
  return error?.code === "ER_BAD_FIELD_ERROR" || error?.errno === 1054;
}

// GET /api/conversations/clients
export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  try {
    try {
      const [rows] = await db.query(`
        SELECT 
          cs.id AS session_id,
          cs.client_id,
          cs.phone,
          cs.state,
          cs.last_intent,
          cs.updated_at,
          cs.last_read_message_id,
          cs.assigned_agent_id,
          cs.assignment_status,
          cs.priority_level,
          cs.sla_due_at,

          CASE
            WHEN cs.sla_due_at IS NOT NULL AND cs.sla_due_at < NOW() AND COALESCE(cs.assignment_status, 'unassigned') <> 'closed'
            THEN 1
            ELSE 0
          END AS is_overdue,

          (
            SELECT COUNT(*)
            FROM agent_actions_log u
            WHERE u.session_id = cs.id
              AND u.id > COALESCE(cs.last_read_message_id, 0)
              AND (
                u.message_direction = 'inbound'
                OR (
                  u.message_direction IS NULL
                  AND u.request_text IS NOT NULL
                  AND u.request_text <> ''
                )
              )
          ) AS unread_count,

          lm.ultimomensaje,
          lm.last_message_at,
          lm.message_status,
          lm.source_channel,

          CONCAT(c.nombre,' ',c.apellido) AS cliente_nombre,
          c.celular,
          c.email,
          u.fullname AS assigned_agent_name,

          cs.context_json AS ultimo_contexto

        FROM conversation_sessions cs
        LEFT JOIN clientes c 
          ON cs.client_id = c.id
        LEFT JOIN usuarios u
          ON u.id = cs.assigned_agent_id

        LEFT JOIN (
          SELECT
            al.session_id,
            COALESCE(NULLIF(al.response_text, ''), NULLIF(al.request_text, ''), 'Sin mensajes') AS ultimomensaje,
            al.created_at AS last_message_at,
            al.message_status,
            al.source_channel
          FROM agent_actions_log al
          INNER JOIN (
            SELECT session_id, MAX(id) AS max_id
            FROM agent_actions_log
            GROUP BY session_id
          ) mx ON mx.max_id = al.id
        ) lm ON lm.session_id = cs.id

        ORDER BY COALESCE(lm.last_message_at, cs.updated_at) DESC
      `);

      rows.sort((a, b) => {
        const overdueDiff = Number(b?.is_overdue || 0) - Number(a?.is_overdue || 0);
        if (overdueDiff !== 0) return overdueDiff;

        const unreadDiff = Number(b?.unread_count || 0) - Number(a?.unread_count || 0);
        if (unreadDiff !== 0) return unreadDiff;

        const priorities = { urgent: 4, high: 3, normal: 2, low: 1 };
        const prioDiff = (priorities[b?.priority_level] || 0) - (priorities[a?.priority_level] || 0);
        if (prioDiff !== 0) return prioDiff;

        const aDate = new Date(a?.last_message_at || a?.updated_at || 0).getTime();
        const bDate = new Date(b?.last_message_at || b?.updated_at || 0).getTime();
        return bDate - aDate;
      });

      return NextResponse.json(rows);
    } catch (error) {
      if (!isMissingColumnError(error)) throw error;

      const [legacyRows] = await db.query(`
        SELECT 
          cs.id AS session_id,
          cs.client_id,
          cs.phone,
          cs.state,
          cs.last_intent,
          cs.updated_at,
          NULL AS last_read_message_id,
          NULL AS assigned_agent_id,
          'unassigned' AS assignment_status,
          'normal' AS priority_level,
          NULL AS sla_due_at,
          0 AS is_overdue,
          0 AS unread_count,

          lm.ultimomensaje,
          lm.last_message_at,
          NULL AS message_status,
          NULL AS source_channel,

          CONCAT(c.nombre,' ',c.apellido) AS cliente_nombre,
          c.celular,
          c.email,
          NULL AS assigned_agent_name,

          cs.context_json AS ultimo_contexto

        FROM conversation_sessions cs
        LEFT JOIN clientes c 
          ON cs.client_id = c.id

        LEFT JOIN (
          SELECT
            al.session_id,
            COALESCE(NULLIF(al.response_text, ''), NULLIF(al.request_text, ''), 'Sin mensajes') AS ultimomensaje,
            al.created_at AS last_message_at
          FROM agent_actions_log al
          INNER JOIN (
            SELECT session_id, MAX(id) AS max_id
            FROM agent_actions_log
            GROUP BY session_id
          ) mx ON mx.max_id = al.id
        ) lm ON lm.session_id = cs.id

        ORDER BY COALESCE(lm.last_message_at, cs.updated_at) DESC
      `);

      return NextResponse.json(legacyRows);
    }

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error obteniendo conversaciones con clientes" },
      { status: 500 }
    );
  }
}
