import { NextResponse } from "next/server";
import { db } from "@/lib/db";


// ================= GET TODOS =================
export async function GET() {

  const [rows] = await db.query(`
    SELECT * FROM productos
    ORDER BY created_at DESC
  `);

  return NextResponse.json(rows);
}


// ================= CREAR =================
export async function POST(req) {

  try {

    const body = await req.json();

    const {
      numero_parte,
      descripcion,
      fecha_ingreso,
      precio_compra,
      precio_venta
    } = body;

    const [result] = await db.query(`
      INSERT INTO productos (
        numero_parte,
        descripcion,
        fecha_ingreso,
        stock_total,
        stock_usado,
        stock_disponible,
        precio_compra,
        precio_venta
      )
      VALUES (?, ?, ?, 0, 0, 0, ?, ?)
    `, [
      numero_parte,
      descripcion,
      fecha_ingreso,
      precio_compra,
      precio_venta
    ]);

    return NextResponse.json({
      message: "Producto creado",
      id: result.insertId
    });

  } catch (error) {
    console.log(error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
