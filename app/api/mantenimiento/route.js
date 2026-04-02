import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  try {
    const [rows] = await db.query("SELECT * FROM mantenimiento ORDER BY name");
    return NextResponse.json(rows);
  } catch (error) {
    console.error("ERROR GET /api/mantenimiento:", error);
    return NextResponse.json({ message: "Error obteniendo mantenimiento" }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  try {
    const body = await req.json().catch(() => ({}));
    const { name, description, is_active, mantenimiento_id } = body;

    if (!name?.trim()) {
      return NextResponse.json({ message: "name es requerido" }, { status: 400 });
    }

    await db.query(
      "INSERT INTO mantenimiento (name, description, is_active, mantenimiento_id) VALUES (?, ?, ?, ?)",
      [name.trim(), description?.trim() || null, is_active ? 1 : 0, mantenimiento_id || null]
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("ERROR POST /api/mantenimiento:", error);
    return NextResponse.json({ message: "Error creando mantenimiento" }, { status: 500 });
  }
}
