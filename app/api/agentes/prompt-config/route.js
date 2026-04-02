import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

const AGENT_KEYS_VALIDOS = ["taller", "ventas", "presales"];

const MAX_CONSIDERACIONES_LENGTH = 4000;

// Patrones que indican intento de prompt injection
const INJECTION_PATTERNS = [
  /ignore\s+(all\s+)?previous\s+instructions?/i,
  /forget\s+(all\s+)?(previous\s+)?instructions?/i,
  /you\s+are\s+now\s+(a\s+)?/i,
  /act\s+as\s+(a\s+|if\s+)/i,
  /\bsystem\s*:\s*/i,
  /\bDAN\b/,
  /jailbreak/i,
];

function detectInjection(text) {
  if (!text) return null;
  for (const pattern of INJECTION_PATTERNS) {
    if (pattern.test(text)) return pattern.toString();
  }
  return null;
}

// Columnas que el agente de IA puede leer (devueltas a n8n)
const AGENT_CONFIG_COLUMNS = "agent_key, agent_name, taller_name, dealer_name, consideraciones, is_active";

// Autentica llamadas desde n8n via webhook secret
function authenticateWebhook(req) {
  const secret = req.headers.get("x-conversations-webhook-secret") || "";
  const expected = process.env.CONVERSATIONS_WEBHOOK_SECRET || "";
  return expected && secret === expected;
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const agentKey = searchParams.get("agent");

  // Si viene con webhook secret (llamada desde n8n), responde directamente
  if (authenticateWebhook(req)) {
    if (!agentKey || !AGENT_KEYS_VALIDOS.includes(agentKey)) {
      return NextResponse.json({ consideraciones: null, agent_name: null, taller_name: null, dealer_name: null });
    }
    try {
      const [rows] = await db.query(
        "SELECT agent_key, agent_name, taller_name, dealer_name, consideraciones, is_active FROM agent_prompt_config WHERE agent_key = ? AND is_active = 1 LIMIT 1",
        [agentKey]
      );
      const row = rows[0] || {};
      return NextResponse.json({
        agent_name:      row.agent_name      || null,
        taller_name:     row.taller_name     || null,
        dealer_name:     row.dealer_name     || null,
        consideraciones: row.consideraciones || null,
      });
    } catch (err) {
      console.error("[GET prompt-config webhook]", err);
      return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
    }
  }

  // Para el CRM: requiere sesión autenticada
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  try {
    if (agentKey) {
      if (!AGENT_KEYS_VALIDOS.includes(agentKey)) {
        return NextResponse.json({ message: "agent_key inválido" }, { status: 400 });
      }
      const [rows] = await db.query(
        "SELECT agent_key, display_name, agent_name, taller_name, dealer_name, consideraciones, is_active, updated_at, updated_by FROM agent_prompt_config WHERE agent_key = ? LIMIT 1",
        [agentKey]
      );
      return NextResponse.json({ agente: rows[0] || null });
    }

    const [rows] = await db.query(
      "SELECT agent_key, display_name, agent_name, taller_name, dealer_name, consideraciones, is_active, updated_at, updated_by FROM agent_prompt_config ORDER BY id ASC"
    );
    return NextResponse.json({ agentes: rows });
  } catch (err) {
    console.error("[GET prompt-config]", err);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}

export async function PUT(req) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { agent_key, agent_name, taller_name, dealer_name, consideraciones } = body;

  if (!agent_key || !AGENT_KEYS_VALIDOS.includes(agent_key)) {
    return NextResponse.json({ message: "agent_key inválido" }, { status: 400 });
  }

  // Validar longitud máxima de consideraciones
  if (typeof consideraciones === "string" && consideraciones.length > MAX_CONSIDERACIONES_LENGTH) {
    return NextResponse.json(
      { message: `Las consideraciones no pueden superar ${MAX_CONSIDERACIONES_LENGTH} caracteres` },
      { status: 400 }
    );
  }

  // Detectar patrones de prompt injection
  const injectionMatch = detectInjection(consideraciones);
  if (injectionMatch) {
    console.warn(`[prompt-config PUT] Posible prompt injection detectado por ${auth.user?.email} en agent_key=${agent_key}`);
    return NextResponse.json(
      { message: "El contenido de las consideraciones contiene patrones no permitidos" },
      { status: 400 }
    );
  }

  const updatedBy = auth.user?.email || auth.user?.username || "crm_user";

  try {
    await db.query(
      `UPDATE agent_prompt_config
       SET consideraciones = ?,
           agent_name      = COALESCE(?, agent_name),
           taller_name     = COALESCE(?, taller_name),
           dealer_name     = COALESCE(?, dealer_name),
           updated_by      = ?
       WHERE agent_key = ?`,
      [
        typeof consideraciones === "string" ? consideraciones.trim() || null : null,
        typeof agent_name   === "string" ? agent_name.trim()   || null : null,
        typeof taller_name  === "string" ? taller_name.trim()  || null : null,
        typeof dealer_name  === "string" ? dealer_name.trim()  || null : null,
        updatedBy,
        agent_key,
      ]
    );
    return NextResponse.json({ message: "Configuración guardada" });
  } catch (err) {
    console.error("[PUT prompt-config]", err);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
