import { NextResponse } from "next/server";
import { db } from "@/lib/db";

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
 * 1. Verificar si el mensaje pertenece al flujo de ventas IA activo (últimas 24h)
 * 2. Si está en ventas: disparar el webhook ventas-ia-inbound (fire & forget)
 * 3. Si está en taller activo (últimas 4h): continuar en taller sin menú
 * 4. Si no hay sesión activa reciente: mostrar menú de bienvenida
 * 5. Si el cliente ya seleccionó opción del menú: rutear al flujo correcto
 *
 * route responses:
 *   "ventas_ia"       → el Taller v14 debe saltarse su lógica IA (ya se despachó)
 *   "new_client_menu" → el Taller v14 debe enviar menu_text al cliente
 *   "default"         → el Taller v14 continúa con su agente IA normal
 */
export async function POST(req) {
  const secret = process.env.CONVERSATIONS_WEBHOOK_SECRET;
  const provided = req.headers.get("x-conversations-webhook-secret") || "";

  if (secret && provided !== secret) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const body = await req.json();
  const channel = body?.channel || "whatsapp";

  const rawPhone = body?.phone || "";
  const phone = rawPhone.replace(/\D/g, "").trim();

  if (!phone) {
    return NextResponse.json({ route: "default", reason: "no_phone" });
  }

  // ── Forzar sesión ventas_ia (llamado desde bot taller tras redirect_ventas) ──
  if (body?.force_ventas === true) {
    await createVentasSession(phone);
    return NextResponse.json({ ok: true, route: "ventas_ia", forced: true });
  }

  // Ventas IA y menú solo aplican para WhatsApp
  if (channel !== "whatsapp") {
    return NextResponse.json({ route: "default", reason: "channel_not_whatsapp" });
  }

  const text = body?.text || "";

  // ── Si el mensaje es claramente de taller, ignorar sesión de ventas ───────
  const esMensajeTaller = detectMenuSelection(text) === "taller";

  // ── Verificar si hay sesión de ventas activa (últimas 24h) ────────────────
  // IMPORTANTE: solo retornamos la ruta, NO despachamos aquí.
  // El Taller v14 es quien hace el dispatch a Ventas IA para evitar doble envío.
  if (!esMensajeTaller) {
    const ventasRoute = await resolveVentasRoute(phone);
    if (ventasRoute === "ventas_ia") {
      return NextResponse.json({ route: "ventas_ia", dispatched: false });
    }
  }

  // ── Verificar si hay sesión de taller activa reciente (últimas 4h) ────────
  // Si el cliente lleva menos de 4h en el taller, continuar sin mostrar menú
  const tallerActivo = await checkTallerActivo(phone);
  if (tallerActivo) {
    return NextResponse.json({ route: "default", reason: "taller_activo" });
  }

  // ── Sin sesión activa reciente → detectar selección o mostrar menú ────────
  const selection = detectMenuSelection(text);
  const clienteRow = await lookupCliente(phone);
  const clienteNombre = clienteRow
    ? [clienteRow.nombre, clienteRow.apellido].filter(Boolean).join(" ").trim()
    : null;

  if (selection === "1") {
    // Opción 1: Comprar vehículo → flujo Ventas IA
    // Solo creamos la sesión; el Taller v14 hace el dispatch para evitar doble envío.
    await createVentasSession(phone);
    return NextResponse.json({
      route: "ventas_ia",
      dispatched: false,
      is_new_client: !clienteRow,
    });
  }

  if (selection === "taller") {
    // Opción 2: Taller/mantenimiento → flujo Taller normal
    return NextResponse.json({ route: "default", reason: "taller_selected" });
  }

  if (selection === "asesor") {
    // Opción 3: Hablar con asesor → taller responde (agente lo puede escalar)
    return NextResponse.json({ route: "default", reason: "asesor_selected" });
  }

  // ── Sin selección válida → mostrar menú de bienvenida ────────────────────
  const saludo = clienteNombre
    ? `¡Hola, ${clienteNombre}! 👋 Bienvenido/a de nuevo.`
    : "¡Hola! 👋 Bienvenido/a.";
  const menuText =
    `${saludo}\n¿En qué te podemos ayudar hoy?\n\n` +
    "1️⃣ Quiero comprar un vehículo nuevo\n" +
    "2️⃣ Mantenimiento, citas o taller\n" +
    "3️⃣ Hablar con un asesor\n\n" +
    "Responde con el número de tu opción.";

  return NextResponse.json({
    route: "new_client_menu",
    menu_text: menuText,
    phone,
    cliente_nombre: clienteNombre,
  });
}

// ── Detectar selección del menú ───────────────────────────────────────────
function detectMenuSelection(text) {
  const clean = (text || "").trim().toLowerCase();

  if (
    clean === "1" ||
    clean.startsWith("1.") ||
    clean.startsWith("1 ") ||
    clean.includes("comprar") ||
    clean.includes("vehículo nuevo") ||
    clean.includes("vehiculo nuevo") ||
    clean.includes("carro nuevo") ||
    clean.includes("auto nuevo")
  ) {
    return "1";
  }

  if (
    clean === "2" ||
    clean.startsWith("2.") ||
    clean.startsWith("2 ") ||
    clean.includes("mantenimiento") ||
    clean.includes("taller") ||
    clean.includes("cita") ||
    clean.includes("reparacion") ||
    clean.includes("reparación") ||
    clean.includes("servicio")
  ) {
    return "taller";
  }

  if (
    clean === "3" ||
    clean.startsWith("3.") ||
    clean.startsWith("3 ") ||
    clean.includes("asesor") ||
    clean.includes("agente") ||
    clean.includes("persona") ||
    clean.includes("humano")
  ) {
    return "asesor";
  }

  return null;
}

// ── Buscar cliente registrado por teléfono ────────────────────────────────
async function lookupCliente(phone) {
  const [rows] = await db.query(
    `SELECT nombre, apellido FROM clientes
     WHERE REPLACE(REPLACE(REPLACE(celular, '+', ''), ' ', ''), '-', '') = ?
     LIMIT 1`,
    [phone]
  );
  return rows[0] || null;
}

// ── Verificar si tiene sesión de ventas_ia activa en las últimas 24h ──────
async function resolveVentasRoute(phone) {
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

  // Campaña de tipo 'ventas' enviada en las últimas 72h
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

// ── Verificar si tiene actividad de taller reciente (últimas 4h) ──────────
// Evita mostrar el menú en medio de una conversación activa del taller
async function checkTallerActivo(phone) {
  try {
    const [rows] = await db.query(
      `SELECT id FROM conversation_sessions
       WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
         AND (source IS NULL OR source NOT IN ('ventas_ia'))
         AND updated_at >= DATE_SUB(NOW(), INTERVAL 4 HOUR)
       ORDER BY updated_at DESC LIMIT 1`,
      [phone]
    );
    return rows.length > 0;
  } catch (e) {
    if (e?.code === "ER_BAD_FIELD_ERROR" || e?.errno === 1054) {
      // Columna source no existe, fallback: verificar solo updated_at
      try {
        const [rows] = await db.query(
          `SELECT id FROM conversation_sessions
           WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
             AND updated_at >= DATE_SUB(NOW(), INTERVAL 4 HOUR)
           ORDER BY updated_at DESC LIMIT 1`,
          [phone]
        );
        return rows.length > 0;
      } catch (_) {
        return false;
      }
    }
    throw e;
  }
}

// ── Crear/actualizar sesión ventas_ia ─────────────────────────────────────
async function createVentasSession(phone) {
  await db.query(
    `INSERT INTO conversation_sessions (phone, source, created_at, updated_at)
     VALUES (?, 'ventas_ia', NOW(), NOW())
     ON DUPLICATE KEY UPDATE source = 'ventas_ia', updated_at = NOW()`,
    [phone]
  );
}

