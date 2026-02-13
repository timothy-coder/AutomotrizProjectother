import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req, { params }) {

  try {

    const { id } = await params;
    const { cantidad } = await req.json();

    if (!cantidad || cantidad <= 0) {
      return NextResponse.json({ message: "Cantidad inválida" }, { status: 400 });
    }

    await db.query(`
      UPDATE productos
      SET 
        stock_total = stock_total + ?,
        stock_disponible = stock_disponible + ?
      WHERE id=?
    `, [cantidad, cantidad, id]);

    return NextResponse.json({ message: "Stock agregado" });

  } catch (error) {
    return NextResponse.json({ message: "Error agregando stock" }, { status: 500 });
  }
}
