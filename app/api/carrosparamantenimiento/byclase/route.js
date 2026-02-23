import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Obtener carros por clase_id
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const clase_id = searchParams.get("clase_id");

    // Si no se pasa clase_id, devolver error
    if (!clase_id) {
      return NextResponse.json({ message: "Clase ID es requerido" }, { status: 400 });
    }

    const [rows] = await db.query(`
      SELECT
        cpm.id,
        cpm.marca_id,
        cpm.modelo_id,
        cpm.year,
        cpm.version,
        marcas.name AS marca_nombre,
        modelos.name AS modelo_nombre,
        clases.nombre AS clase_nombre  -- Corregir 'clases.name' a 'clases.nombre' (o el nombre correcto de la columna)
      FROM carrosparamantenimiento cpm
      LEFT JOIN marcas ON marcas.id = cpm.marca_id
      LEFT JOIN modelos ON modelos.id = cpm.modelo_id
      LEFT JOIN clases ON clases.id = cpm.clase_id
      WHERE cpm.clase_id = ?
      ORDER BY marcas.name, modelos.name, cpm.year
    `, [clase_id]);

    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Error al obtener los carros de la clase" }, { status: 500 });
  }
}