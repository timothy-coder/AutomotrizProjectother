import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recalcStock } from "@/lib/recalcStock";

export async function PUT(req, { params }) {

  try {

    const { id } = await params;
    const body = await req.json();

    const { centro_id, taller_id, mostrador_id, stock } = body;

    const [[row]] = await db.query(`
      SELECT producto_id FROM stock_parcial WHERE id=?
    `, [id]);

    await db.query(`
      UPDATE stock_parcial
      SET centro_id=?, taller_id=?, mostrador_id=?, stock=?
      WHERE id=?
    `, [centro_id || null, taller_id || null, mostrador_id || null, stock, id]);

    await recalcStock(row.producto_id);

    return NextResponse.json({ message: "Actualizado" });

  } catch (error) {
    console.error("Error actualizando ubicación:", error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}



// ================= DELETE =================
export async function DELETE(req, { params }) {

  const { id } = await params;

  const [[row]] = await db.query(`
    SELECT producto_id FROM stock_parcial WHERE id=?
  `, [id]);

  await db.query(`DELETE FROM stock_parcial WHERE id=?`, [id]);

  await recalcStock(row.producto_id);

  return NextResponse.json({ message: "Eliminado" });
}
