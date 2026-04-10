import { NextResponse } from "next/server";
import { getMessageTemplates } from "@/lib/chatwoot";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

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
  } catch {
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
