import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req, { params }) {
  try {
    const { id, firmaId } = await params;
    const { estado, observaciones, usuario_id } = await req.json();

    await db.query(
      `UPDATE reserva_firmas 
       SET estado = ?, observaciones = ?, fecha_firma = NOW(), updated_at = NOW()
       WHERE id = ? AND reserva_id = ?`,
      [estado, observaciones, firmaId, id]
    );

    // Si se marca como observado
    if (estado === 'observado') {
      await db.query(
        `UPDATE reservas SET estado = 'observado', updated_at = NOW()
         WHERE id = ?`,
        [id]
      );

      await db.query(
        `INSERT INTO reserva_historial (reserva_id, usuario_id, estado_anterior, estado_nuevo, descripcion)
         VALUES (?, ?, 'enviado_firma', 'observado', ?)`,
        [id, usuario_id, `Observación: ${observaciones?.substring(0, 100) || ''}`]
      );
    }

    // Si se marca como firmado
    if (estado === 'firmado') {
      // Verificar si todas las firmas están completas
      const [[{ pendientes }]] = await db.query(
        `SELECT COUNT(*) as pendientes FROM reserva_firmas 
         WHERE reserva_id = ? AND estado NOT IN ('firmado', 'observado')`,
        [id]
      );

      if (pendientes === 0) {
        await db.query(
          `UPDATE reservas SET estado = 'firmado', updated_at = NOW()
           WHERE id = ?`,
          [id]
        );
      }

      await db.query(
        `INSERT INTO reserva_historial (reserva_id, usuario_id, estado_anterior, estado_nuevo, descripcion)
         VALUES (?, ?, 'subasando', 'firmado', 'Reserva firmada')`,
        [id, usuario_id]
      );
    }

    return NextResponse.json({ message: "Firma actualizada" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error: " + e.message }, { status: 500 });
  }
}