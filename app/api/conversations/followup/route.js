import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

const VALID_CLOSURE_REASONS = [
  "sin_respuesta",
  "sin_informacion",
  "compro_otro",
  "alerta_no_atendida",
  "facturado",
];

function authenticateWebhook(req) {
  const secret = process.env.CONVERSATIONS_WEBHOOK_SECRET || "";
  const provided = req.headers.get("x-conversations-webhook-secret") || "";
  return secret && provided === secret;
}

/**
 * GET /api/conversations/followup?pending=1
 *
 * Retorna sesiones que necesitan follow-up (followup_next_at <= NOW(), followup_count < 3).
 * Incluye nombre del cliente si está registrado.
 * Auth: webhook secret (n8n) o sesión CRM.
 */
export async function GET(req) {
  const isWebhook = authenticateWebhook(req);
  if (!isWebhook) {
    const auth = authorizeConversation(req, "view");
    if (!auth.ok) return auth.response;
  }

  const { searchParams } = new URL(req.url);
  const pending = searchParams.get("pending") === "1";

  try {
    let query, params;

    if (pending) {
      query = `
        SELECT
          cs.id,
          cs.phone,
          cs.source,
          cs.followup_count,
          cs.followup_next_at,
          cs.closure_reason,
          TRIM(CONCAT(COALESCE(c.nombre, ''), ' ', COALESCE(c.apellido, ''))) AS nombre_cliente
        FROM conversation_sessions cs
        LEFT JOIN clientes c
          ON REPLACE(REPLACE(REPLACE(c.celular, '+', ''), ' ', ''), '-', '') = cs.phone
        WHERE cs.followup_next_at <= NOW()
          AND cs.followup_count < 3
          AND cs.closure_reason IS NULL
        ORDER BY cs.followup_next_at ASC
        LIMIT 50
      `;
      params = [];
    } else {
      query = `
        SELECT
          cs.id,
          cs.phone,
          cs.source,
          cs.followup_count,
          cs.followup_next_at,
          cs.closure_reason,
          cs.updated_at
        FROM conversation_sessions cs
        WHERE cs.followup_next_at IS NOT NULL
        ORDER BY cs.followup_next_at DESC
        LIMIT 100
      `;
      params = [];
    }

    const [rows] = await db.query(query, params);
    return NextResponse.json({ followups: rows });
  } catch (err) {
    console.error("[followup GET] DB error:", err.message);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * POST /api/conversations/followup
 *
 * Inicia el timer 3-3-3 para una sesión (followup_count=0, followup_next_at=NOW()+3días).
 * Llamado por Ventas IA cuando action=save_lead o Bot Taller cuando agenda cita.
 * Body: { phone: string }
 * Auth: webhook secret o sesión CRM.
 */
export async function POST(req) {
  const isWebhook = authenticateWebhook(req);
  if (!isWebhook) {
    const auth = authorizeConversation(req, "edit");
    if (!auth.ok) return auth.response;
  }

  const body = await req.json().catch(() => ({}));
  const phone = body?.phone?.replace(/[\s+\-]/g, "") || "";

  if (!phone) {
    return NextResponse.json({ message: "phone requerido" }, { status: 400 });
  }

  try {
    await db.query(
      `UPDATE conversation_sessions
         SET followup_count   = 0,
             followup_next_at = DATE_ADD(NOW(), INTERVAL 3 DAY),
             closure_reason   = NULL,
             updated_at       = NOW()
       WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
         AND (followup_next_at IS NULL OR closure_reason IS NOT NULL)`,
      [phone]
    );
    return NextResponse.json({ ok: true, phone, followup_next_at: "+3 days" });
  } catch (err) {
    console.error("[followup POST] DB error:", err.message);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * PUT /api/conversations/followup
 *
 * Registra que se envió un follow-up. Incrementa followup_count y agenda el próximo en 3 días.
 * Si followup_count llega a 3, setea closure_reason='sin_respuesta'.
 * Body: { phone: string, closure_reason?: string }
 * Auth: webhook secret o sesión CRM.
 */
export async function PUT(req) {
  const isWebhook = authenticateWebhook(req);
  if (!isWebhook) {
    const auth = authorizeConversation(req, "edit");
    if (!auth.ok) return auth.response;
  }

  const body = await req.json().catch(() => ({}));
  const phone = body?.phone?.replace(/[\s+\-]/g, "") || "";
  const closureReason = body?.closure_reason || null;

  if (!phone) {
    return NextResponse.json({ message: "phone requerido" }, { status: 400 });
  }

  if (closureReason && !VALID_CLOSURE_REASONS.includes(closureReason)) {
    return NextResponse.json(
      { message: `closure_reason inválido. Valores: ${VALID_CLOSURE_REASONS.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    if (closureReason) {
      // Cierre manual
      await db.query(
        `UPDATE conversation_sessions
           SET closure_reason   = ?,
               followup_next_at = NULL,
               updated_at       = NOW()
         WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?`,
        [closureReason, phone]
      );
      return NextResponse.json({ ok: true, phone, closed: true, closure_reason: closureReason });
    }

    // Incrementar y agendar próximo follow-up
    const [rows] = await db.query(
      `SELECT followup_count FROM conversation_sessions
       WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
       LIMIT 1`,
      [phone]
    );

    if (!rows[0]) {
      return NextResponse.json({ message: "Sesión no encontrada" }, { status: 404 });
    }

    const newCount = (rows[0].followup_count || 0) + 1;

    if (newCount >= 3) {
      await db.query(
        `UPDATE conversation_sessions
           SET followup_count   = ?,
               followup_next_at = NULL,
               closure_reason   = 'sin_respuesta',
               updated_at       = NOW()
         WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?`,
        [newCount, phone]
      );
      return NextResponse.json({ ok: true, phone, followup_count: newCount, closed: true, closure_reason: "sin_respuesta" });
    }

    await db.query(
      `UPDATE conversation_sessions
         SET followup_count   = ?,
             followup_next_at = DATE_ADD(NOW(), INTERVAL 3 DAY),
             updated_at       = NOW()
       WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?`,
      [newCount, phone]
    );
    return NextResponse.json({ ok: true, phone, followup_count: newCount, next_followup: "+3 days" });
  } catch (err) {
    console.error("[followup PUT] DB error:", err.message);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
