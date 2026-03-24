import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req, { params }) {
  try {
    const { id, detalleId } = await params;
    const {
      nombreconyugue,
      dniconyugue,
      vin,
      usovehiculo,
      placa,
      dsctocredinissan,
      dsctotienda,
      dsctobonoretoma,
      dsctonper,
      glp,
      tarjetaplaca,
      flete,
      cantidad,
      precio_unitario,
      descripcion,
    } = await req.json();

    await db.query(
      `UPDATE reserva_detalles 
       SET nombreconyugue = ?,
           dniconyugue = ?,
           vin = ?,
           usovehiculo = ?,
           placa = ?,
           dsctocredinissan = ?,
           dsctotienda = ?,
           dsctobonoretoma = ?,
           dsctonper = ?,
           glp = ?,
           tarjetaplaca = ?,
           flete = ?,
           cantidad = ?,
           precio_unitario = ?,
           descripcion = ?,
           updated_at = NOW()
       WHERE id = ? AND reserva_id = ?`,
      [
        nombreconyugue || null,
        dniconyugue || null,
        vin,
        usovehiculo,
        placa,
        dsctocredinissan || 0,
        dsctotienda || 0,
        dsctobonoretoma || 0,
        dsctonper || 0,
        glp || 0,
        tarjetaplaca || 0,
        flete || 0,
        cantidad || 1,
        precio_unitario,
        descripcion || null,
        detalleId,
        id,
      ]
    );

    return NextResponse.json({ message: "Detalle actualizado" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error: " + e.message }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id, detalleId } = await params;

    await db.query(
      `DELETE FROM reserva_detalles WHERE id = ? AND reserva_id = ?`,
      [detalleId, id]
    );

    return NextResponse.json({ message: "Detalle eliminado" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error: " + e.message }, { status: 500 });
  }
}