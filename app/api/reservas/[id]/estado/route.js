// api/reservas/[id]/estado/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const { estado, observaciones } = await request.json();

    // ✅ Validar ID
    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    // ✅ Validar estado
    const estadosValidos = ["borrador", "enviado_firma", "observado", "subsanado", "firmado"];
    if (!estado || !estadosValidos.includes(estado)) {
      return NextResponse.json(
        { message: `Estado inválido. Debe ser uno de: ${estadosValidos.join(", ")}` },
        { status: 400 }
      );
    }

    // ✅ Verificar que la reserva existe
    const [checkReserva] = await db.query(
      "SELECT id, estado FROM reservas WHERE id = ?",
      [id]
    );

    if (checkReserva.length === 0) {
      return NextResponse.json(
        { message: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    // ✅ Actualizar estado (y observaciones si se proporcionan)
    let query = "UPDATE reservas SET estado = ?";
    const params_query = [estado];

    if (observaciones) {
      query += ", observaciones = ?";
      params_query.push(observaciones);
    }

    query += ", updated_at = NOW() WHERE id = ?";
    params_query.push(id);

    const [result] = await db.query(query, params_query);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Error al actualizar el estado" },
        { status: 500 }
      );
    }

    console.log(`✅ Estado actualizado: ${id} -> ${estado}`);

    return NextResponse.json({
      message: "Estado actualizado correctamente",
      id: parseInt(id),
      estado: estado,
      observaciones: observaciones || null,
    });
  } catch (e) {
    console.error("Error en PUT /api/reservas/[id]/estado:", e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}