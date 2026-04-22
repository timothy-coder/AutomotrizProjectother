import { NextResponse } from "next/server";
import { getMessages, sendMessage, sendMessageWithAttachment } from "@/lib/chatwoot";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function GET(req, { params }) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const data = await getMessages(id);
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error al obtener mensajes:", err);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  // Soportar auth por webhook secret (para llamadas desde n8n)
  const providedSecret = req.headers.get("x-conversations-webhook-secret") || "";
  const expectedSecret = process.env.CONVERSATIONS_WEBHOOK_SECRET || "";
  const isWebhookAuth = expectedSecret && providedSecret === expectedSecret;

  if (!isWebhookAuth) {
    const auth = authorizeConversation(req, "edit");
    if (!auth.ok) return auth.response;
  }

  const { id } = await params;

  const contentType = req.headers.get("content-type") || "";

  if (contentType.includes("multipart/form-data")) {
    let form;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ message: "FormData inválido" }, { status: 400 });
    }
    const file = form.get("file");
    if (!file || typeof file === "string") {
      return NextResponse.json({ message: "file requerido en multipart" }, { status: 400 });
    }
    const content = form.get("content") || "";
    const isPrivate = form.get("private") === "true";
    try {
      const data = await sendMessageWithAttachment(id, { content, file, isPrivate });
      return NextResponse.json(data);
    } catch {
      return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
    }
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: "Body JSON inválido" }, { status: 400 });
  }
  const { content, private: isPrivate = false } = body;

  if (!content?.trim()) {
    return NextResponse.json({ message: "content requerido" }, { status: 400 });
  }

  try {
    const data = await sendMessage(id, content, { private: isPrivate });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
