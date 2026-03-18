import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/ventas/route-check?phone=51999000111
 *
 * Usado por n8n "Bot Taller v14" para saber si un mensaje entrante
 * debe ser procesado por el agente de ventas IA o por el flujo normal.
 *
 * Autenticado con x-conversations-webhook-secret (mismo secret del webhook existente).
 *
 * Respuesta:
 * {
 *   route: "ventas_ia" | "default",
 *   reason: string,
 *   session_id?: number
 * }
 *
 * Lógica de routing (orden de prioridad):
 * 1. Si existe sesión activa con source = 'ventas_ia' (actualizada en las últimas 24h) → ventas_ia
 * 2. Si el teléfono recibió una campaña de tipo 'ventas' en las últimas 72h → ventas_ia
 * 3. Todo lo demás → default
 */
export async function GET(req) {
  const secret = process.env.CONVERSATIONS_WEBHOOK_SECRET;
  const provided = req.headers.get("x-conversations-webhook-secret") || "";

  if (secret && provided !== secret) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const rawPhone = searchParams.get("phone") || "";
  const phone = rawPhone.replace(/\D/g, "").trim();

  if (!phone) {
    return NextResponse.json(
      { message: "phone es requerido" },
      { status: 400 }
    );
  }

  // 1. Verificar si hay sesión activa de ventas_ia (últimas 24h)
  try {
    const [sessionRows] = await db.query(
      `
      SELECT id
      FROM conversation_sessions
      WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
        AND source = 'ventas_ia'
        AND updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
      ORDER BY updated_at DESC
      LIMIT 1
      `,
      [phone]
    );

    if (sessionRows?.[0]?.id) {
      return NextResponse.json({
        route: "ventas_ia",
        reason: "active_ventas_session",
        session_id: sessionRows[0].id,
      });
    }
  } catch (error) {
    // Si la columna source no existe aún (migración pendiente), saltamos esta verificación
    if (error?.code !== "ER_BAD_FIELD_ERROR" && error?.errno !== 1054) throw error;
  }

  // 2. Verificar si el teléfono recibió una campaña de tipo 'ventas' en las últimas 72h
  try {
    const [campaignRows] = await db.query(
      `
      SELECT cr.id
      FROM campaign_recipients cr
      JOIN whatsapp_mass_campaigns c ON c.id = cr.campaign_id
      WHERE REPLACE(REPLACE(REPLACE(cr.phone_normalized, '+', ''), ' ', ''), '-', '') = ?
        AND c.tipo = 'ventas'
        AND cr.sent_at IS NOT NULL
        AND cr.sent_at >= DATE_SUB(NOW(), INTERVAL 72 HOUR)
        AND cr.status NOT IN ('failed')
      ORDER BY cr.sent_at DESC
      LIMIT 1
      `,
      [phone]
    );

    if (campaignRows?.[0]?.id) {
      return NextResponse.json({
        route: "ventas_ia",
        reason: "ventas_campaign_recipient",
        campaign_recipient_id: campaignRows[0].id,
      });
    }
  } catch (error) {
    // Si la tabla no existe aún, continuar con default
    if (
      error?.code !== "ER_NO_SUCH_TABLE" &&
      error?.errno !== 1146 &&
      error?.code !== "ER_BAD_FIELD_ERROR" &&
      error?.errno !== 1054
    ) {
      throw error;
    }
  }

  return NextResponse.json({ route: "default", reason: "no_ventas_context" });
}
