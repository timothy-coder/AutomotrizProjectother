import { NextResponse } from "next/server";
import { getContact, getContactConversations } from "@/lib/chatwoot";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function GET(req, { params }) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  const { id } = await params;

  try {
    const [contact, convsData] = await Promise.all([
      getContact(id),
      getContactConversations(id),
    ]);

    const conversations = convsData?.payload ?? [];

    return NextResponse.json({
      id: contact.id,
      name: contact.name,
      email: contact.email || null,
      phone: contact.phone_number || null,
      location: contact.location || null,
      company: contact.company?.name || null,
      avatar_url: contact.avatar_url || null,
      conversations_count: conversations.length,
      created_at: contact.created_at || null,
    });
  } catch (err) {
    console.error("Error obteniendo perfil de contacto:", err);
    return NextResponse.json({ message: "Error interno del servidor" }, { status: 500 });
  }
}
