import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const MENU_TEXT =
  "¡Hola! 👋 Bienvenido/a.\n¿En qué te podemos ayudar hoy?\n\n" +
  "1️⃣ Quiero comprar un vehículo nuevo\n" +
  "2️⃣ Mantenimiento, citas o taller\n" +
  "3️⃣ Hablar con un asesor\n\n" +
  "Responde con el número de tu opción.";

/**
 * PATCH /api/ventas/route-dispatch
 *
 * Limpia la sesión ventas_ia de un teléfono para que el siguiente mensaje
 * sea atendido por el taller (ruta default). Llamado por el flujo de ventas
 * cuando el agente devuelve redirect_taller.
 *
 * Body: { phone: "51912528990" }
 * Auth: x-ventas-webhook-secret
 */
export async function PATCH(req) {
  const secret = process.env.VENTAS_WEBHOOK_SECRET;
  const provided = req.headers.get("x-ventas-webhook-secret") || "";

  if (secret && provided !== secret) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const phone = String(body?.phone || "").replace(/\D/g, "").trim();

  if (!phone) {
    return NextResponse.json({ message: "phone requerido" }, { status: 400 });
  }

  try {
    await db.query(
      `UPDATE conversation_sessions
       SET source = 'manual', updated_at = NOW()
       WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
         AND source = 'ventas_ia'`,
      [phone]
    );
  } catch (e) {
    console.error("[route-dispatch PATCH] DB error:", e.message);
    return NextResponse.json({ ok: false, error: e.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, phone, cleared: true });
}

/**
 * POST /api/ventas/route-dispatch
 *
 * Usado por n8n "Bot Taller v14" para:
 * 1. Verificar si el mensaje pertenece al flujo de ventas IA
 * 2. Si es ventas: disparar el webhook ventas-ia-inbound (fire & forget)
 * 3. Si es cliente nuevo sin selección: devolver menú de bienvenida
 * 4. Devolver { route: "ventas_ia"|"new_client_menu"|"default" }
 */
export async function POST(req) {
  const secret = process.env.CONVERSATIONS_WEBHOOK_SECRET;
  const provided = req.headers.get("x-conversations-webhook-secret") || "";

  if (secret && provided !== secret) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const channel = body?.channel || "whatsapp";

  // Ventas IA y menú solo aplican para WhatsApp
  if (channel !== "whatsapp") {
    return NextResponse.json({ route: "default", reason: "channel_not_whatsapp" });
  }

  const rawPhone = body?.phone || "";
  const phone = rawPhone.replace(/\D/g, "").trim();

  if (!phone) {
    return NextResponse.json({ route: "default", reason: "no_phone" });
  }

  // ── Cliente nuevo (sin sesión previa) ────────────────────────────────────
  const hasSession = await checkHasSession(phone);
  if (!hasSession) {
    const selection = detectMenuSelection(body?.text || "");

    if (selection === "1") {
      // Eligió ventas → crear sesión y despachar al agente de ventas
      await createVentasSession(phone);
      const ventasUrl =
        process.env.N8N_VENTAS_INBOUND_URL ||
        "https://n8n.app20.tech/webhook/ventas-ia-inbound";
      fetch(ventasUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(5000),
      }).catch(() => {});
      return NextResponse.json({ route: "ventas_ia", dispatched: true, is_new_client: true });
    }

    if (selection === "taller") {
      // Eligió taller o asesor → flujo normal del taller
      return NextResponse.json({ route: "default", reason: "new_client_taller_selected" });
    }

    // Primer mensaje sin selección válida → mostrar menú de bienvenida
    return NextResponse.json({
      route: "new_client_menu",
      menu_text: MENU_TEXT,
      phone,
    });
  }

  // ── Cliente existente → lógica normal de routing ─────────────────────────
  const route = await resolveRoute(phone);

  if (route === "ventas_ia") {
    const ventasUrl =
      process.env.N8N_VENTAS_INBOUND_URL ||
      "https://n8n.app20.tech/webhook/ventas-ia-inbound";
    fetch(ventasUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    }).catch(() => {});
  }

  return NextResponse.json({ route, dispatched: route === "ventas_ia" });
}

// ── Detectar selección del menú ───────────────────────────────────────────
function detectMenuSelection(text) {
  const clean = text.trim().toLowerCase();
  if (clean === "1" || clean.startsWith("1.") || clean.includes("comprar") || clean.includes("vehículo nuevo") || clean.includes("vehiculo nuevo")) return "1";
  if (clean === "2" || clean === "3" || clean.startsWith("2.") || clean.startsWith("3.") || clean.includes("mantenimiento") || clean.includes("taller") || clean.includes("cita") || clean.includes("asesor")) return "taller";
  return null;
}

// ── Verificar si el teléfono tiene historial de sesión ───────────────────
async function checkHasSession(phone) {
  const [rows] = await db.query(
    `SELECT id FROM conversation_sessions
     WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
     LIMIT 1`,
    [phone]
  );
  return rows.length > 0;
}

// ── Crear sesión ventas_ia para cliente nuevo ─────────────────────────────
async function createVentasSession(phone) {
  await db.query(
    `INSERT INTO conversation_sessions (phone, source, created_at, updated_at)
     VALUES (?, 'ventas_ia', NOW(), NOW())
     ON DUPLICATE KEY UPDATE source = 'ventas_ia', updated_at = NOW()`,
    [phone]
  );
}

// ── Routing para clientes existentes ─────────────────────────────────────
async function resolveRoute(phone) {
  // 1. Sesión activa de ventas_ia (últimas 24h)
  try {
    const [rows] = await db.query(
      `SELECT id FROM conversation_sessions
       WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
         AND source = 'ventas_ia'
         AND updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       ORDER BY updated_at DESC LIMIT 1`,
      [phone]
    );
    if (rows?.[0]?.id) return "ventas_ia";
  } catch (e) {
    if (e?.code !== "ER_BAD_FIELD_ERROR" && e?.errno !== 1054) throw e;
  }

  // 2. Campaña de tipo 'ventas' enviada en las últimas 72h
  try {
    const [rows] = await db.query(
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
    if (rows?.[0]?.id) return "ventas_ia";
  } catch (e) {
    if (
      e?.code !== "ER_NO_SUCH_TABLE" && e?.errno !== 1146 &&
      e?.code !== "ER_BAD_FIELD_ERROR" && e?.errno !== 1054
    ) throw e;
  }

  return "default";
}
