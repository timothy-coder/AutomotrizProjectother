import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/conversations/timeline?session_id=1
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        { message: "session_id es requerido" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      `
      SELECT 
        al.id,
        al.created_at,
        al.request_text AS pregunta,
        al.response_text AS respuesta,
        al.action_type,
        al.intent,
        al.success,
        al.error_message
      FROM agent_actions_log al
      JOIN conversation_sessions cs ON al.session_id = cs.id
      WHERE al.session_id = ?
      ORDER BY al.id
      `,
      [sessionId]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("❌ ERROR timeline:", error);
    return NextResponse.json(
      { message: "Error cargando timeline" },
      { status: 500 }
    );
  }
}
