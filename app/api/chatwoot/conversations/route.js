import { NextResponse } from "next/server";
import { getConversations } from "@/lib/chatwoot";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const statusParam = searchParams.get("status") || "open";
  const inboxId = searchParams.get("inbox_id") ?? undefined;
  const teamId = searchParams.get("team_id") ?? undefined;
  const page = parseInt(searchParams.get("page") || "1", 10);

  // Validate status param
  const allowed = ["open", "resolved", "pending", "snoozed"];
  if (!allowed.includes(statusParam)) {
    return NextResponse.json(
      { message: `status debe ser uno de: ${allowed.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const data = await getConversations({
      status: statusParam,
      inboxId,
      teamId,
      page,
    });
    return NextResponse.json(data);
  } catch (err) {
    console.error("Error al obtener conversaciones:", err);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
