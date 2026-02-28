import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req, { params }) {

  try {

    const { id } = await params;
    const body = await req.json();

    // Si viene stock_total, actualizar directamente
    if ('stock_total' in body) {
      const stock_total = Number(body.stock_total);

      if (!Number.isFinite(stock_total) || stock_total < 0) {
        return NextResponse.json({ message: "Cantidad inválida" }, { status: 400 });
      }

      // Obtener stock usado actual
      const [[producto]] = await db.query('SELECT stock_usado FROM productos WHERE id=?', [id]);
      const stock_usado = producto?.stock_usado || 0;
      const stock_disponible = Math.max(0, stock_total - stock_usado);

      await db.query(`
        UPDATE productos
        SET 
          stock_total = ?,
          stock_disponible = ?
        WHERE id=?
      `, [stock_total, stock_disponible, id]);

      return NextResponse.json({ message: "Stock actualizado" });
    }

    // Modo legacy: agregar cantidad incremental
    const { cantidad } = body;

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
    console.error(error);
    return NextResponse.json({ message: "Error actualizando stock" }, { status: 500 });
  }
}
