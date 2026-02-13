import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recalcStock } from "@/lib/recalcStock";

export async function PUT(req, { params }) {

  try {

    const { id } = await params;
    const body = await req.json();

    const { stock } = body;

    const [[row]] = await db.query(`
      SELECT producto_id FROM stock_parcial WHERE id=?
    `, [id]);

    await db.query(`
      UPDATE stock_parcial
      SET stock=?
      WHERE id=?
    `, [stock, id]);

    await recalcStock(row.producto_id);

    return NextResponse.json({ message: "Actualizado" });

  } catch {
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
