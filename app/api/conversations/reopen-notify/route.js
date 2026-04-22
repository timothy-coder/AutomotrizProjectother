import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function authenticateWebhook(req) {
  const secret = process.env.CONVERSATIONS_WEBHOOK_SECRET || "";
  const provided = req.headers.get("x-conversations-webhook-secret") || "";
  return secret && provided === secret;
}

/**
 * GET /api/conversations/reopen-notify?pending=1
 *
 * Retorna sesiones con pending_reopen=1 (clientes que escribieron fuera de horario).
 * Llamado por el cron n8n al inicio de la jornada laboral.
 * Auth: webhook secret.
 */
export async function GET(req) {
  if (!authenticateWebhook(req)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    const [rows] = await db.query(`
      SELECT
        cs.id,
        cs.phone,
        cs.conversation_id,
        cs.source,
        cs.updated_at,
        TRIM(CONCAT(COALESCE(c.nombre, ''), ' ', COALESCE(c.apellido, ''))) AS nombre_cliente
      FROM conversation_sessions cs
      LEFT JOIN clientes c
        ON REPLACE(REPLACE(REPLACE(c.celular, '+', ''), ' ', ''), '-', '') = cs.phone COLLATE utf8mb4_unicode_ci
      WHERE cs.pending_reopen = 1
      ORDER BY cs.updated_at ASC
      LIMIT 50
    `);
    return NextResponse.json({ sessions: rows });
  } catch (err) {
    console.error("[reopen-notify GET] DB error:", err.message);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}

/**
 * PUT /api/conversations/reopen-notify
 *
 * Marca una sesión como notificada (pending_reopen=0).
 * Body: { phone: string }
 * Auth: webhook secret.
 */
export async function PUT(req) {
  if (!authenticateWebhook(req)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const phone = body?.phone?.replace(/[\s+\-]/g, "") || "";

  if (!phone) {
    return NextResponse.json({ message: "phone requerido" }, { status: 400 });
  }

  try {
    await db.query(
      `UPDATE conversation_sessions
         SET pending_reopen = 0, updated_at = NOW()
       WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
         AND pending_reopen = 1`,
      [phone]
    );
    return NextResponse.json({ ok: true, phone });
  } catch (err) {
    console.error("[reopen-notify PUT] DB error:", err.message);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
