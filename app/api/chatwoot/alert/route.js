import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assignConversation, addLabel } from "@/lib/chatwoot";
import { authorizeConversation } from "@/lib/conversationsAuth";
import { broadcastSseEvent } from "@/lib/chatwootSse";

const VALID_ALERT_TYPES = [
  "planchado_pintura",
  "garantia_recall",
  "mostrador_repuesto",
  "precio_exacto",
  "documentos_financiamiento",
  "test_drive",
  "pedido_especial",
  "queja",
  "duplicado_comprobante",
  "cita_postventa",
];

function authenticateWebhook(req) {
  const secret = process.env.CONVERSATIONS_WEBHOOK_SECRET || "";
  const provided = req.headers.get("x-conversations-webhook-secret") || "";
  return secret && provided === secret;
}

/**
 * POST /api/chatwoot/alert
 *
 * Recibe una alerta de un agente IA (n8n) o del CRM y:
 * 1. Busca la configuración de ruteo en alert_routing
 * 2. Asigna la conversación al agente/equipo correspondiente en Chatwoot
 * 3. Agrega un label a la conversación
 *
 * Body: { conversation_id: string|number, alert_type: string }
 * Auth: x-conversations-webhook-secret (n8n) o sesión CRM
 */
export async function POST(req) {
  const isWebhook = authenticateWebhook(req);
  if (!isWebhook) {
    const auth = authorizeConversation(req, "edit");
    if (!auth.ok) return auth.response;
  }

  const body = await req.json().catch(() => ({}));
  const { conversation_id, alert_type } = body;

  if (!conversation_id) {
    return NextResponse.json({ message: "conversation_id requerido" }, { status: 400 });
  }
  if (!alert_type || !VALID_ALERT_TYPES.includes(alert_type)) {
    return NextResponse.json(
      { message: `alert_type inválido. Valores permitidos: ${VALID_ALERT_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  let routing;
  try {
    const [rows] = await db.query(
      "SELECT chatwoot_team_id, chatwoot_agent_id, label FROM alert_routing WHERE alert_type = ? LIMIT 1",
      [alert_type]
    );
    routing = rows[0] || null;
  } catch (err) {
    console.error("[alert POST] DB error:", err.message);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }

  if (!routing) {
    console.warn(`[alert POST] Sin configuración para alert_type=${alert_type}`);
    return NextResponse.json({ ok: true, routed: false, reason: "no_routing_config" });
  }

  const errors = [];

  if (routing.chatwoot_agent_id) {
    try {
      await assignConversation(conversation_id, { agentId: routing.chatwoot_agent_id });
    } catch (e) {
      errors.push(`assign_agent: ${e.message}`);
      console.error("[alert POST] assign agent error:", e.message);
    }
  } else if (routing.chatwoot_team_id) {
    try {
      await assignConversation(conversation_id, { teamId: routing.chatwoot_team_id });
    } catch (e) {
      errors.push(`assign_team: ${e.message}`);
      console.error("[alert POST] assign team error:", e.message);
    }
  }

  if (routing.label) {
    try {
      await addLabel(conversation_id, routing.label);
    } catch (e) {
      errors.push(`add_label: ${e.message}`);
      console.error("[alert POST] add label error:", e.message);
    }
  }

  if (errors.length === 0) {
    broadcastSseEvent(
      "bot_alert",
      {
        conversation_id: Number(conversation_id),
        alert_type,
        timestamp: new Date().toISOString(),
      },
      routing.chatwoot_team_id ?? null
    );
  }

  return NextResponse.json({
    ok: errors.length === 0,
    conversation_id,
    alert_type,
    routed: true,
    ...(errors.length > 0 && { errors }),
  });
}

/**
 * GET /api/chatwoot/alert
 *
 * Lista la configuración actual de ruteo de alertas.
 * Solo accesible con sesión CRM autenticada.
 */
export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  try {
    const [rows] = await db.query(
      "SELECT id, alert_type, chatwoot_team_id, chatwoot_agent_id, label, descripcion FROM alert_routing ORDER BY id ASC"
    );
    return NextResponse.json({ alertas: rows });
  } catch (err) {
    console.error("[alert GET] DB error:", err.message);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * PUT /api/chatwoot/alert
 *
 * Actualiza la configuración de ruteo de un tipo de alerta.
 * Body: { alert_type, chatwoot_team_id?, chatwoot_agent_id?, label? }
 */
export async function PUT(req) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { alert_type, chatwoot_team_id, chatwoot_agent_id, label } = body;

  if (!alert_type || !VALID_ALERT_TYPES.includes(alert_type)) {
    return NextResponse.json(
      { message: `alert_type inválido. Valores permitidos: ${VALID_ALERT_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    await db.query(
      `UPDATE alert_routing
         SET chatwoot_team_id  = ?,
             chatwoot_agent_id = ?,
             label             = COALESCE(?, label),
             updated_at        = NOW()
       WHERE alert_type = ?`,
      [
        chatwoot_team_id  ?? null,
        chatwoot_agent_id ?? null,
        typeof label === "string" ? label.trim() || null : null,
        alert_type,
      ]
    );
    return NextResponse.json({ message: "Configuración actualizada" });
  } catch (err) {
    console.error("[alert PUT] DB error:", err.message);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
