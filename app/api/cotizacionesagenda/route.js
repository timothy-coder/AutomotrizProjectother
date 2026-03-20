import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const oportunidadId = searchParams.get("oportunidad_id");

    if (!oportunidadId) {
      return NextResponse.json([], { status: 200 });
    }

    // Obtener cotizaciones con su enlace público
    const [cotizaciones] = await db.query(
      `SELECT 
        c.*,
        m.name as marca,
        mo.name as modelo,
        ep.token as enlace_publico_token
      FROM cotizacionesagenda c
      LEFT JOIN marcas m ON c.marca_id = m.id
      LEFT JOIN modelos mo ON c.modelo_id = mo.id
      LEFT JOIN cotizacion_enlaces_publicos ep ON c.id = ep.cotizacion_id
      WHERE c.oportunidad_id = ?
      ORDER BY c.id DESC`,
      [oportunidadId]
    );

    return NextResponse.json(cotizaciones);
  } catch (error) {
    console.error("Error fetching cotizaciones:", error);
    return NextResponse.json(
      { message: "Error al cargar cotizaciones" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const {
      oportunidad_id,
      marca_id,
      modelo_id,
      version_id,
      anio,
      sku,
      color_externo,
      color_interno,
      estado,
      created_by,
    } = await req.json();

    const [result] = await db.query(
      `INSERT INTO cotizacionesagenda 
       (oportunidad_id, marca_id, modelo_id, version_id, anio, sku, color_externo, color_interno, estado, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        oportunidad_id,
        marca_id,
        modelo_id,
        version_id || null,
        anio || null,
        sku || null,
        color_externo || null,
        color_interno || null,
        estado,
        created_by,
      ]
    );

    return NextResponse.json({
      message: "Cotización creada exitosamente",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Error creating cotización:", error);
    return NextResponse.json(
      { message: "Error al crear cotización", error: error.message },
      { status: 500 }
    );
  }
}