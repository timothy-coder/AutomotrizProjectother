import { NextResponse } from "next/server";
import { getAgents } from "@/lib/chatwoot";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  try {
    const data = await getAgents();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[chatwoot/agents GET]", err.message);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
