import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    // Obtener enlace público
    const [enlaces] = await db.query(
      "SELECT id FROM cotizacion_enlaces_publicos WHERE cotizacion_id = ?",
      [id]
    );

    if (enlaces.length === 0) {
      return NextResponse.json({
        vistas_totales: 0,
        historial: [],
        ultima_vista: null,
      });
    }

    const enlace = enlaces[0];

    // Obtener estadísticas
    const [[stats]] = await db.query(
      `SELECT 
        COUNT(*) as total_vistas,
        MAX(fecha_hora) as ultima_vista
       FROM cotizacion_vistas_historial 
       WHERE enlace_id = ?`,
      [enlace.id]
    );

    // Obtener historial detallado
    const [historial] = await db.query(
      `SELECT 
        fecha_hora, 
        ip_address, 
        user_agent 
       FROM cotizacion_vistas_historial 
       WHERE enlace_id = ? 
       ORDER BY fecha_hora DESC`,
      [enlace.id]
    );

    return NextResponse.json({
      vistas_totales: stats.total_vistas || 0,
      ultima_vista: stats.ultima_vista,
      historial,
    });
  } catch (error) {
    console.error("Error obteniendo historial:", error);
    return NextResponse.json(
      { message: "Error obteniendo historial", error: error.message },
      { status: 500 }
    );
  }
}