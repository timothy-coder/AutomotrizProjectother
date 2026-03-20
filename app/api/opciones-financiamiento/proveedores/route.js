// ============================================
// API DE PROVEEDORES DE FINANCIAMIENTO
// archivo: app/api/opciones-financiamiento/proveedores/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener lista de proveedores
// ============================================
export async function GET(req) {
  try {
    const [proveedores] = await db.query(
      `SELECT DISTINCT proveedor, COUNT(*) as total_opciones 
       FROM opciones_financiamiento 
       WHERE es_activo = true AND proveedor IS NOT NULL
       GROUP BY proveedor 
       ORDER BY proveedor ASC`
    );

    return NextResponse.json({
      proveedores,
      total_proveedores: proveedores.length,
    });
  } catch (error) {
    console.error("GET /api/opciones-financiamiento/proveedores error:", error);
    return NextResponse.json(
      { message: "Error al obtener proveedores", error: error.message },
      { status: 500 }
    );
  }
}