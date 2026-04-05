import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* =========================
   POST: Marcar todas como leídas
=========================*/
export async function POST(request) {
  try {
    const body = await request.json();
    const usuarioId = body.usuario_id;

    if (!usuarioId) {
      return NextResponse.json(
        { message: "usuario_id es requerido" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      `
      UPDATE notificacion_usuarios
      SET leida = 1, leida_at = CURRENT_TIMESTAMP
      WHERE usuario_id = ? AND leida = 0
      `,
      [usuarioId]
    );

    return NextResponse.json({
      message: "✓ Todas las notificaciones marcadas como leídas",
      actualizadas: result.affectedRows,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al marcar notificaciones" },
      { status: 500 }
    );
  }
}