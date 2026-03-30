import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

const ESTADOS_VALIDOS = ["pendiente", "confirmada", "en_proceso", "completada", "cancelada", "no_show"];

export async function PUT(req, context) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = await req.json().catch(() => ({}));
    const { estado } = body;

    if (!estado || !ESTADOS_VALIDOS.includes(estado)) {
      return NextResponse.json(
        { message: `estado inválido. Valores permitidos: ${ESTADOS_VALIDOS.join(", ")}` },
        { status: 400 }
      );
    }

    await db.query(`UPDATE citas SET estado=? WHERE id=?`, [estado, id]);
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("ERROR PUT /api/citas/[id]/estado:", error);
    return NextResponse.json({ message: "Error actualizando estado de la cita" }, { status: 500 });
  }
}
