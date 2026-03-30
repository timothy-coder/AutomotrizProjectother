import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

function isMissingTableError(error) {
  return error?.code === "ER_NO_SUCH_TABLE" || error?.errno === 1146;
}

// GET /api/conversations/audit?session_id=1&limit=30
export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const sessionId = Number(searchParams.get("session_id"));
    const limit = Math.max(1, Math.min(Number(searchParams.get("limit")) || 30, 200));

    if (!sessionId || Number.isNaN(sessionId)) {
      return NextResponse.json({ message: "session_id inválido" }, { status: 400 });
    }

    try {
      const [rows] = await db.query(
        `
        SELECT
          a.id,
          a.session_id,
          a.action_type,
          a.actor_user_id,
          a.actor_role,
          a.changes_json,
          a.metadata_json,
          a.created_at,
          u.fullname AS actor_name
        FROM conversation_audit_log a
        LEFT JOIN usuarios u ON u.id = a.actor_user_id
        WHERE a.session_id = ?
        ORDER BY a.id DESC
        LIMIT ?
        `,
        [sessionId, limit]
      );

      const parsed = (Array.isArray(rows) ? rows : []).map((r) => {
        let changes = null;
        let metadata = null;
        try { changes = r.changes_json ? JSON.parse(r.changes_json) : null; } catch { changes = r.changes_json; }
        try { metadata = r.metadata_json ? JSON.parse(r.metadata_json) : null; } catch { metadata = r.metadata_json; }
        return { ...r, changes, metadata };
      });

      return NextResponse.json(parsed);
    } catch (error) {
      if (!isMissingTableError(error)) throw error;
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error("❌ ERROR audit conversations:", error);
    return NextResponse.json(
      { message: "Error cargando auditoría" },
      { status: 500 }
    );
  }
}
