import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/ventas/route-dispatch
 *
 * Usado por n8n "Bot Taller v14" para:
 * 1. Verificar si el mensaje pertenece al flujo de ventas IA
 * 2. Si es ventas: disparar el webhook ventas-ia-inbound (fire & forget, sin esperar respuesta)
 * 3. Devolver { route: "ventas_ia"|"default" }
 *
 * Recibe el payload completo de Normalizar Todo para forwarding.
 * Autenticado con x-conversations-webhook-secret.
 */
export async function POST(req) {
  const secret = process.env.CONVERSATIONS_WEBHOOK_SECRET;
  const provided = req.headers.get("x-conversations-webhook-secret") || "";

  if (secret && provided !== secret) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const channel = body?.channel || "whatsapp";

  // Ventas IA solo aplica para WhatsApp — Instagram y Facebook siempre van al flujo normal
  if (channel !== "whatsapp") {
    return NextResponse.json({ route: "default", reason: "channel_not_whatsapp" });
  }

  const rawPhone = body?.phone || "";
  const phone = rawPhone.replace(/\D/g, "").trim();

  if (!phone) {
    return NextResponse.json({ route: "default", reason: "no_phone" });
  }

  const route = await resolveRoute(phone);

  if (route === "ventas_ia") {
    // Fire & forget: disparar webhook de ventas sin esperar respuesta
    const ventasUrl = process.env.N8N_VENTAS_INBOUND_URL || "https://n8n.app20.tech/webhook/ventas-ia-inbound";
    fetch(ventasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    }).catch(() => {});
  }

  return NextResponse.json({ route, dispatched: route === "ventas_ia" });
}

async function resolveRoute(phone) {
  // 1. Verificar sesión activa de ventas_ia (últimas 24h)
  try {
    const [sessionRows] = await db.query(
      `SELECT id FROM conversation_sessions
       WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
         AND source = 'ventas_ia'
         AND updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       ORDER BY updated_at DESC LIMIT 1`,
      [phone]
    );
    if (sessionRows?.[0]?.id) return "ventas_ia";
  } catch (e) {
    if (e?.code !== "ER_BAD_FIELD_ERROR" && e?.errno !== 1054) throw e;
  }

  // 2. Verificar campaña de tipo 'ventas' enviada en las últimas 72h
  try {
    const [campaignRows] = await db.query(
      `SELECT cr.id FROM campaign_recipients cr
       JOIN whatsapp_mass_campaigns c ON c.id = cr.campaign_id
       WHERE REPLACE(REPLACE(REPLACE(cr.phone_normalized, '+', ''), ' ', ''), '-', '') = ?
         AND c.tipo = 'ventas'
         AND cr.sent_at IS NOT NULL
         AND cr.sent_at >= DATE_SUB(NOW(), INTERVAL 72 HOUR)
         AND cr.status NOT IN ('failed')
       ORDER BY cr.sent_at DESC LIMIT 1`,
      [phone]
    );
    if (campaignRows?.[0]?.id) return "ventas_ia";
  } catch (e) {
    if (
      e?.code !== "ER_NO_SUCH_TABLE" && e?.errno !== 1146 &&
      e?.code !== "ER_BAD_FIELD_ERROR" && e?.errno !== 1054
    ) throw e;
  }

  return "default";
}
