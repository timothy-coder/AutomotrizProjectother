import { NextResponse } from "next/server";
import { db } from "@/lib/db";


// ================= GET ONE =================
export async function GET(req, { params }) {

  const { id } = await params;

  const [rows] = await db.query(`
    SELECT * FROM productos WHERE id=?
  `, [id]);

  return NextResponse.json(rows[0] || null);
}



// ================= UPDATE =================
export async function PUT(req, { params }) {

  try {

    const { id } = await params;
    const body = await req.json();

    const {
      numero_parte,
      descripcion,
      fecha_ingreso,
      precio_compra,
      precio_venta
    } = body;

    await db.query(`
      UPDATE productos SET
        numero_parte=?,
        descripcion=?,
        fecha_ingreso=?,
        precio_compra=?,
        precio_venta=?
      WHERE id=?
    `, [
      numero_parte,
      descripcion,
      fecha_ingreso,
      precio_compra,
      precio_venta,
      id
    ]);

    return NextResponse.json({ message: "Actualizado" });

  } catch (error) {
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}



// ================= DELETE =================
export async function DELETE(req, { params }) {

  const { id } = await params;

  await db.query(`DELETE FROM stock_parcial WHERE producto_id=?`, [id]);
  await db.query(`DELETE FROM productos WHERE id=?`, [id]);

  return NextResponse.json({ message: "Eliminado" });
}
