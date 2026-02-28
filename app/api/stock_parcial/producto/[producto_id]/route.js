import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {

  const { producto_id } = await params;

  const [rows] = await db.query(`
    SELECT sp.*,
      c.nombre AS centro_nombre,
      t.nombre AS taller_nombre,
      m.nombre AS mostrador_nombre
    FROM stock_parcial sp
    LEFT JOIN centros c ON c.id = sp.centro_id
    LEFT JOIN talleres t ON t.id = sp.taller_id
    LEFT JOIN mostradores m ON m.id = sp.mostrador_id
    WHERE sp.producto_id=?
    ORDER BY sp.id
  `, [producto_id]);

  return NextResponse.json(rows);
}
