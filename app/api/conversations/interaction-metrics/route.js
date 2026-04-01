import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

// GET /api/conversations/interaction-metrics
// Calcula el tiempo promedio de interacción por sesión de conversación.
// Una "sesión de interacción" es un período continuo de actividad donde
// no hay más de 5 horas de silencio entre mensajes consecutivos.
export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  try {
    // Paso 1: obtener todos los mensajes de conversaciones activas (open/pending),
    // ordenados por sesión y fecha.
    const [rows] = await db.query(
      `
      SELECT
        aal.session_id,
        aal.created_at
      FROM agent_actions_log aal
      INNER JOIN conversation_sessions cs ON cs.id = aal.session_id
      WHERE cs.assignment_status IN ('open', 'pending')
        AND aal.created_at IS NOT NULL
      ORDER BY aal.session_id, aal.created_at
      `
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json({ avg_interaction_minutes: null, total_sessions: 0 });
    }

    // Paso 2: agrupar mensajes en "períodos de interacción" usando el algoritmo gap-and-islands.
    // Si la diferencia entre dos mensajes consecutivos de la misma conversación supera
    // GAP_HOURS horas, se considera el inicio de una nueva sesión de interacción.
    const GAP_MS = 5 * 60 * 60 * 1000; // 5 horas en ms

    const sessions = [];
    let currentSessionId = null;
    let sessionStart = null;
    let sessionLast = null;

    for (const row of rows) {
      const ts = new Date(row.created_at).getTime();

      if (
        currentSessionId !== row.session_id ||
        (sessionLast !== null && ts - sessionLast > GAP_MS)
      ) {
        // Guardar sesión anterior si tuvo al menos 2 mensajes
        if (sessionStart !== null && sessionLast !== null && sessionLast > sessionStart) {
          sessions.push(sessionLast - sessionStart);
        }
        // Iniciar nueva sesión
        currentSessionId = row.session_id;
        sessionStart = ts;
        sessionLast = ts;
      } else {
        sessionLast = ts;
      }
    }

    // Guardar la última sesión
    if (sessionStart !== null && sessionLast !== null && sessionLast > sessionStart) {
      sessions.push(sessionLast - sessionStart);
    }

    if (sessions.length === 0) {
      return NextResponse.json({ avg_interaction_minutes: null, total_sessions: 0 });
    }

    const avgMs = sessions.reduce((acc, ms) => acc + ms, 0) / sessions.length;
    const avgMinutes = Math.round(avgMs / 60000);

    return NextResponse.json({
      avg_interaction_minutes: avgMinutes,
      total_sessions: sessions.length,
    });
  } catch (err) {
    console.error("Error calculando interaction-metrics:", err);
    return NextResponse.json(
      { message: "Error calculando métricas de interacción" },
      { status: 500 }
    );
  }
}
