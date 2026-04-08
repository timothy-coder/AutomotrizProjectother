import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { normalizePhone } from "@/lib/phoneUtils";

/**
 * PUT /api/ventas/route-dispatch
 *
 * Limpia la sesión ventas_ia de un teléfono (+ conversación) para que el
 * siguiente mensaje sea atendido por el taller (ruta default).
 * Llamado por el flujo de ventas cuando el agente devuelve redirect_taller.
 *
 * Body: { phone: "51912528990", conversation_id?: 12345 }
 * Auth: x-conversations-webhook-secret
 */
export async function PUT(req) {
  const secret = process.env.CONVERSATIONS_WEBHOOK_SECRET;
  const provided = req.headers.get("x-conversations-webhook-secret") || "";

  if (!secret || provided !== secret) {
    console.warn("[route-dispatch PUT] Intento no autorizado — CONVERSATIONS_WEBHOOK_SECRET inválido o no seteado");
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const phone = normalizePhone(body?.phone);
  const conversationId = Number(body?.conversation_id) || 0;

  if (!phone) {
    return NextResponse.json({ message: "phone requerido" }, { status: 400 });
  }

  try {
    await db.query(
      `UPDATE conversation_sessions
       SET source = 'manual', updated_at = NOW()
       WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
         AND conversation_id = ?
         AND source = 'ventas_ia'`,
      [phone, conversationId]
    );
  } catch (e) {
    console.error("[route-dispatch PUT] DB error:", e.message);
    return NextResponse.json({ ok: false, message: "Error actualizando sesión" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, phone, conversation_id: conversationId, cleared: true });
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

  if (!secret || provided !== secret) {
    console.warn("[route-dispatch POST] Intento no autorizado — CONVERSATIONS_WEBHOOK_SECRET inválido o no seteado");
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const conversationId = Number(body?.conversation_id) || 0;
  const phone = normalizePhone(body?.phone);

  if (!phone) {
    return NextResponse.json({ message: "phone requerido", route: "default" }, { status: 400 });
  }

  try {
    // ── Forzar sesión ventas_ia (llamado desde bot taller tras redirect_ventas) ──
    if (body?.force_ventas === true) {
      await createVentasSession(phone, conversationId);
      await clearVentasHistory(phone);
      return NextResponse.json({ ok: true, route: "ventas_ia", forced: true });
    }

    const text = body?.text || "";
    const _dbg = process.env.DEBUG_ROUTE_DISPATCH === "1";
    if (_dbg) console.error("[route-dispatch] phone=%s convId=%s text=%s", phone, conversationId, text?.substring(0, 50));

    // ── Verificar sesión de ventas activa PRIMERO (últimas 24h) ─────────────
    // Si el usuario ya está en ventas_ia, TODOS sus mensajes van a ventas
    // sin importar si parecen selecciones de menú ("2", "servicio", etc.)
    const ventasRoute = await resolveVentasRoute(phone, conversationId, _dbg);
    if (ventasRoute === "ventas_ia") {
      await touchSession(phone, conversationId, "ventas_ia");
      return NextResponse.json({ route: "ventas_ia", dispatched: false });
    }

    // ── Verificar si hay sesión de taller activa reciente (últimas 4h) ────────
    // Si el cliente lleva menos de 4h en el taller, continuar sin mostrar menú
    const tallerActivo = await checkTallerActivo(phone, conversationId);
    if (tallerActivo) {
      await touchSession(phone, conversationId);
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
      // Limpiar historial previo para que el agente IA empiece desde cero.
      await createVentasSession(phone, conversationId);
      await clearVentasHistory(phone);
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
    // El texto del menú es configurable via env var VENTAS_MENU_TEXT.
    // Usar {nombre} como placeholder para el nombre del cliente.
    const saludo = clienteNombre
      ? `¡Hola, ${clienteNombre}! 😊 ¡Qué gusto saludarte de nuevo!`
      : "¡Hola! 😊 ¡Bienvenido/a!";

    const agentCfg = await getAgentMenuConfig();
    const agentName = agentCfg.agent_name || "Carlos";
    const dealerName = agentCfg.dealer_name || "Taller Automotriz";

    const defaultMenuBody =
      `Soy *${agentName}* 🤖, tu asesor virtual de *${dealerName}* 🔧🚗\n` +
      `Estoy aquí para ayudarte con todo lo que necesites. ¿En qué te puedo ayudar hoy?\n\n` +
      `Por favor, elige una opción:\n\n` +
      `1️⃣ *Comprar un vehículo nuevo* 🚘\n` +
      `2️⃣ *Mantenimiento, citas o taller* 🔩\n\n` +
      `Responde con el *número* de tu opción. ¡Estamos para servirte! ✅`;

    const menuBody = process.env.VENTAS_MENU_TEXT
      ? process.env.VENTAS_MENU_TEXT.replace(/\{nombre\}/g, clienteNombre || "")
      : defaultMenuBody;

    const menuText = `${saludo}\n\n${menuBody}`;

    return NextResponse.json({
      route: "new_client_menu",
      menu_text: menuText,
      phone,
      cliente_nombre: clienteNombre,
    });
  } catch (error) {
    console.error("ERROR POST /api/ventas/route-dispatch:", error);
    return NextResponse.json({ route: "default", reason: "server_error" }, { status: 500 });
  }
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

  // "3" ya no está en el menú — solo keywords naturales redirigen a asesor
  if (
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
// Prioriza la conversación exacta (conversation_id); si no existe, busca
// por teléfono (campaña de ventas reciente).
async function resolveVentasRoute(phone, conversationId = 0, debug = false) {
  try {
    if (debug) {
      const [allRows] = await db.query(
        `SELECT id, phone, conversation_id, source, updated_at
         FROM conversation_sessions
         WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
         ORDER BY updated_at DESC LIMIT 5`,
        [phone]
      );
      console.error("[resolveVentasRoute] phone=%s convId=%s allSessions=%j", phone, conversationId, allRows);
    }

    const [rows] = await db.query(
      `SELECT id FROM conversation_sessions
       WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
         AND (conversation_id = ? OR conversation_id = 0)
         AND source = 'ventas_ia'
         AND updated_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
       ORDER BY updated_at DESC LIMIT 1`,
      [phone, conversationId]
    );
    if (debug) console.error("[resolveVentasRoute] ventasMatch=%j", rows);
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
    if (e?.code === "ER_NO_SUCH_TABLE" || e?.errno === 1146 ||
        e?.code === "ER_BAD_FIELD_ERROR" || e?.errno === 1054) {
      console.error("[resolveVentasRoute] campaign table/field missing:", e.code);
    } else {
      throw e;
    }
  }

  return "default";
}

// ── Verificar si tiene actividad de taller reciente (últimas 4h) ──────────
// Evita mostrar el menú en medio de una conversación activa del taller.
// Filtra por conversation_id cuando está disponible.
async function checkTallerActivo(phone, conversationId = 0) {
  try {
    const [rows] = await db.query(
      `SELECT id FROM conversation_sessions
       WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
         AND (conversation_id = ? OR conversation_id = 0)
         AND (source IS NULL OR source NOT IN ('ventas_ia'))
         AND updated_at >= DATE_SUB(NOW(), INTERVAL 4 HOUR)
       ORDER BY updated_at DESC LIMIT 1`,
      [phone, conversationId]
    );
    return rows.length > 0;
  } catch (e) {
    if (e?.code === "ER_BAD_FIELD_ERROR" || e?.errno === 1054) {
      // Columna source o conversation_id no existe, fallback sin ellas
      try {
        const [rows] = await db.query(
          `SELECT id FROM conversation_sessions
           WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
             AND updated_at >= DATE_SUB(NOW(), INTERVAL 4 HOUR)
           ORDER BY updated_at DESC LIMIT 1`,
          [phone]
        );
        return rows.length > 0;
      } catch (fallbackErr) {
        console.error("[checkTallerActivo] fallback query failed:", fallbackErr);
        return false;
      }
    }
    throw e;
  }
}

// ── Leer nombre del agente y concesionaria desde agent_prompt_config ──────
async function getAgentMenuConfig() {
  try {
    const [rows] = await db.query(
      "SELECT agent_name, dealer_name FROM agent_prompt_config WHERE agent_key = 'taller' AND is_active = 1 LIMIT 1"
    );
    return rows[0] || {};
  } catch (err) {
    console.error("[getAgentMenuConfig] DB error:", err);
    return {};
  }
}

// ── Crear/actualizar sesión ventas_ia ─────────────────────────────────────
async function createVentasSession(phone, conversationId = 0) {
  // Migrate legacy rows (conversation_id=0) to the actual Chatwoot conversation ID
  if (conversationId > 0) {
    try {
      const [upd] = await db.query(
        `UPDATE conversation_sessions
         SET conversation_id = ?, source = 'ventas_ia', updated_at = NOW(),
             followup_next_at = DATE_ADD(NOW(), INTERVAL 3 DAY),
             followup_count = 0, closure_reason = NULL
         WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
           AND conversation_id = 0`,
        [conversationId, phone]
      );
      if (upd?.affectedRows > 0) return;
    } catch (e) {
      if (e?.code === "ER_BAD_FIELD_ERROR" || e?.errno === 1054) {
        const [upd] = await db.query(
          `UPDATE conversation_sessions
           SET conversation_id = ?, source = 'ventas_ia', updated_at = NOW()
           WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
             AND conversation_id = 0`,
          [conversationId, phone]
        );
        if (upd?.affectedRows > 0) return;
      } else { throw e; }
    }
  }
  try {
    await db.query(
      `INSERT INTO conversation_sessions (phone, conversation_id, source, created_at, updated_at, followup_next_at, followup_count)
       VALUES (?, ?, 'ventas_ia', NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 3 DAY), 0)
       ON DUPLICATE KEY UPDATE source = 'ventas_ia', updated_at = NOW(),
         followup_next_at = DATE_ADD(NOW(), INTERVAL 3 DAY),
         followup_count = 0, closure_reason = NULL`,
      [phone, conversationId]
    );
  } catch (e) {
    if (e?.code === "ER_BAD_FIELD_ERROR" || e?.errno === 1054) {
      await db.query(
        `INSERT INTO conversation_sessions (phone, conversation_id, source, created_at, updated_at)
         VALUES (?, ?, 'ventas_ia', NOW(), NOW())
         ON DUPLICATE KEY UPDATE source = 'ventas_ia', updated_at = NOW()`,
        [phone, conversationId]
      );
    } else { throw e; }
  }
}


// ── Limpiar historial de ventas_sessions para empezar conversación desde cero ─
// Seteamos paso_actual=2 porque el menú de bienvenida (paso 1) ya lo muestra
// route-dispatch. Inicializamos el historial con contexto para que el LLM sepa
// que el usuario ya eligió "comprar vehículo" y arranque con el perfilamiento.
async function clearVentasHistory(phone) {
  const seedHistory = JSON.stringify([
    { role: "user", content: "Quiero comprar un vehículo nuevo" },
    { role: "assistant", content: "¡Excelente elección! 🚗✨ Me encantaría ayudarte a encontrar el vehículo perfecto. ¿Me permite hacerle algunas preguntas para encontrar el vehículo ideal para usted? 😊" }
  ]);
  try {
    await db.query(
      `INSERT INTO ventas_sessions (phone, history_json, paso_actual)
       VALUES (?, ?, 2)
       ON DUPLICATE KEY UPDATE history_json = VALUES(history_json), paso_actual = 2`,
      [phone, seedHistory]
    );
  } catch (e) {
    if (e?.code === "ER_NO_SUCH_TABLE" || e?.errno === 1146) {
      console.warn("[clearVentasHistory] ventas_sessions table not found, skipping");
    } else {
      console.error("[clearVentasHistory] error:", e.message);
    }
  }
}

// ── Actualizar updated_at en cada mensaje para mantener la sesión viva ────
// También resetea el timer de follow-up 3-3-3: cada mensaje del cliente
// empuja followup_next_at 3 días hacia adelante y resetea el contador.
async function touchSession(phone, conversationId = 0, source = null) {
  const sourceClause = source ? "AND source = ?" : "";
  const params = source
    ? [phone, conversationId, source]
    : [phone, conversationId];
  try {
    await db.query(
      `UPDATE conversation_sessions
         SET updated_at       = NOW(),
             followup_next_at = DATE_ADD(NOW(), INTERVAL 3 DAY),
             followup_count   = 0,
             closure_reason   = NULL
       WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
         AND (conversation_id = ? OR conversation_id = 0)
         ${sourceClause}
       ORDER BY updated_at DESC LIMIT 1`,
      params
    );
  } catch (e) {
    if (e?.code === "ER_BAD_FIELD_ERROR" || e?.errno === 1054) {
      // followup columns not yet migrated — update only updated_at
      await db.query(
        `UPDATE conversation_sessions SET updated_at = NOW()
         WHERE REPLACE(REPLACE(REPLACE(phone, '+', ''), ' ', ''), '-', '') = ?
           AND (conversation_id = ? OR conversation_id = 0)
           ${sourceClause}
         ORDER BY updated_at DESC LIMIT 1`,
        params
      ).catch(err => console.error("[touchSession] fallback error:", err.message));
    } else {
      console.error("[touchSession] error:", e.message);
    }
  }
}
