// ============================================
// API DE BÚSQUEDA DE COTIZACIONES AGENDA
// archivo: app/api/cotizacionesagenda/search/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("q");
    const limit = searchParams.get("limit") || 10;

    if (!search || search.trim().length < 2) {
      return NextResponse.json(
        { message: "Búsqueda mínima de 2 caracteres" },
        { status: 400 }
      );
    }

    const query = `
      SELECT 
        ca.id,
        ca.oportunidad_id,
        ca.sku,
        m.name as marca,
        mo.name as modelo,
        o.cliente_name,
        o.oportunidad_id as numero_oportunidad,
        ca.estado,
        ca.created_at
      FROM cotizacionesagenda ca
      INNER JOIN marcas m ON m.id = ca.marca_id
      INNER JOIN modelos mo ON mo.id = ca.modelo_id
      INNER JOIN oportunidades o ON o.id = ca.oportunidad_id
      WHERE 
        ca.sku LIKE ? OR
        o.cliente_name LIKE ? OR
        o.oportunidad_id LIKE ? OR
        m.name LIKE ? OR
        mo.name LIKE ?
      ORDER BY ca.created_at DESC
      LIMIT ?
    `;

    const searchTerm = `%${search}%`;
    const [rows] = await db.query(query, [
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      searchTerm,
      parseInt(limit),
    ]);

    return NextResponse.json(rows);
  } catch (e) {
    console.log("Error en búsqueda de cotizacionesagenda:", e);
    return NextResponse.json(
      { message: "Error en búsqueda", error: e.message },
      { status: 500 }
    );
  }
}