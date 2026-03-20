// ============================================
// API DE ESTADÍSTICAS DE COTIZACIONES AGENDA
// archivo: app/api/cotizacionesagenda/stats/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const oportunidad_id = searchParams.get("oportunidad_id");

    let query = `
      SELECT 
        estado,
        COUNT(*) as total
      FROM cotizacionesagenda
      WHERE 1=1
    `;
    const params = [];

    if (oportunidad_id) {
      query += " AND oportunidad_id = ?";
      params.push(oportunidad_id);
    }

    query += " GROUP BY estado";

    const [rows] = await db.query(query, params);

    // Convertir a objeto para fácil acceso
    const stats = {
      borrador: 0,
      enviada: 0,
      aceptada: 0,
      total: 0,
    };

    rows.forEach((row) => {
      stats[row.estado] = row.total;
      stats.total += row.total;
    });

    return NextResponse.json(stats);
  } catch (e) {
    console.log("Error en stats de cotizacionesagenda:", e);
    return NextResponse.json(
      { message: "Error obteniendo estadísticas", error: e.message },
      { status: 500 }
    );
  }
}