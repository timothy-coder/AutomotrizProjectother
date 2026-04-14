import { NextResponse } from "next/server";
import { getMessageTemplates } from "@/lib/chatwoot";
import { authorizeConversation } from "@/lib/conversationsAuth";

function authenticateWebhook(req) {
  const secret = process.env.CONVERSATIONS_WEBHOOK_SECRET || "";
  const provided = req.headers.get("x-conversations-webhook-secret") || "";
  return secret && provided === secret;
}

export async function GET(req) {
  const isWebhook = authenticateWebhook(req);
  if (!isWebhook) {
    const auth = authorizeConversation(req, "view");
    if (!auth.ok) return auth.response;
  }

  const { searchParams } = new URL(req.url);
  const inboxId = searchParams.get("inbox_id");

  if (!inboxId || isNaN(Number(inboxId))) {
    return NextResponse.json({ message: "inbox_id requerido" }, { status: 400 });
  }

  try {
    const data = await getMessageTemplates(inboxId);
    // Chatwoot devuelve un array directo o { payload: [...] } según la versión
    const templates = Array.isArray(data) ? data : (Array.isArray(data?.payload) ? data.payload : []);
    return NextResponse.json({ templates });
  } catch (err) {
    console.error("Error obteniendo plantillas de Chatwoot:", err.message);
    return NextResponse.json({ message: "Error interno del servidor", detail: err.message }, { status: 500 });
  }
}
