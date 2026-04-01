import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    // ✅ HACER AWAIT A PARAMS
    const { cotizacion_id } = await params;

    const [rows] = await db.query(
      `SELECT 
        ca.*,
        aa.detalle,
        aa.numero_parte,
        m.codigo as moneda_codigo,
        m.simbolo as moneda_simbolo
       FROM cotizaciones_accesorios ca
       INNER JOIN accesorios_disponibles aa ON ca.accesorio_id = aa.id
       INNER JOIN monedas m ON ca.moneda_id = m.id
       WHERE ca.cotizacion_id = ?
       ORDER BY ca.created_at DESC`,
      [cotizacion_id]
    );

    return NextResponse.json(rows);
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}