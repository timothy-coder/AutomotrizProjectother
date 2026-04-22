import { NextResponse } from "next/server";
import { searchConversations } from "@/lib/chatwoot";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q")?.trim() || "";

  if (q.length < 2) {
    return NextResponse.json({ conversations: [] });
  }

  try {
    const data = await searchConversations(q);
    const conversations = data?.payload?.conversations ?? [];
    return NextResponse.json({ conversations });
  } catch (err) {
    console.error("[chatwoot/search GET]", err.message);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
