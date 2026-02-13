import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { recalcStock } from "@/lib/recalcStock";

export async function POST(req) {

  try {

    const body = await req.json();

    const {
      producto_id,
      centro_id,
      taller_id,
      mostrador_id,
      stock
    } = body;

    await db.query(`
      INSERT INTO stock_parcial
      (producto_id, centro_id, taller_id, mostrador_id, stock)
      VALUES (?, ?, ?, ?, ?)
    `, [
      producto_id,
      centro_id || null,
      taller_id || null,
      mostrador_id || null,
      stock
    ]);

    await recalcStock(producto_id);

    return NextResponse.json({ message: "Stock agregado" });

  } catch (error) {
    console.log(error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
