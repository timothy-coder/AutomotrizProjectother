import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const { usuario_id, observaciones } = await req.json();

    // Actualizar estado a subasando
    await db.query(
      `UPDATE reservas SET estado = 'subasando', observaciones = ?, updated_at = NOW()
       WHERE id = ?`,
      [observaciones, id]
    );

    // Registrar en historial
    await db.query(
      `INSERT INTO reserva_historial (reserva_id, usuario_id, estado_anterior, estado_nuevo, descripcion)
       VALUES (?, ?, 'observado', 'subasando', 'Cambios subsanados - En espera de firma')`,
      [id, usuario_id]
    );

    return NextResponse.json({ message: "Cambios subsanados" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error: " + e.message }, { status: 500 });
  }
}