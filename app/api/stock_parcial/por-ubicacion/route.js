import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/stock_parcial/por-ubicacion?centro_id=1&taller_id=2
// GET /api/stock_parcial/por-ubicacion?centro_id=1&mostrador_id=3
// Returns products that have stock assigned to the given location
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const centro_id = searchParams.get("centro_id");
    const taller_id = searchParams.get("taller_id");
    const mostrador_id = searchParams.get("mostrador_id");

    if (!centro_id && !taller_id && !mostrador_id) {
      return NextResponse.json([], { status: 200 });
    }

    const conditions = [];
    const params = [];

    if (centro_id) {
      conditions.push("sp.centro_id = ?");
      params.push(centro_id);
    }
    if (taller_id) {
      conditions.push("sp.taller_id = ?");
      params.push(taller_id);
    }
    if (mostrador_id) {
      conditions.push("sp.mostrador_id = ?");
      params.push(mostrador_id);
    }

    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

    const [rows] = await db.query(`
      SELECT
        p.id,
        p.numero_parte,
        p.descripcion,
        p.precio_venta,
        p.precio_compra,
        SUM(sp.stock) AS stock_ubicacion
      FROM stock_parcial sp
      JOIN productos p ON p.id = sp.producto_id
      ${where}
      GROUP BY p.id
      HAVING stock_ubicacion > 0
      ORDER BY p.descripcion
    `, params);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching stock por ubicación:", error);
    return NextResponse.json([], { status: 200 });
  }
}
