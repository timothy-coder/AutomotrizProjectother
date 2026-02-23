import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Obtener Carros Parametrizados con la nueva columna clase_id
export async function GET() {
  try {
    const [rows] = await db.query(`
      SELECT
        cpm.id,
        cpm.marca_id,
        cpm.modelo_id,
        cpm.year,
        cpm.version,
        cpm.clase_id,
        marcas.name AS marca_nombre,
        modelos.name AS modelo_nombre,
        clases.name AS clase_nombre
      FROM carrosparamantenimiento cpm
      LEFT JOIN marcas ON marcas.id = cpm.marca_id
      LEFT JOIN modelos ON modelos.id = cpm.modelo_id
      LEFT JOIN clases ON clases.id = cpm.clase_id
      ORDER BY marcas.name, modelos.name, cpm.year
    `);

    return NextResponse.json(rows);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
// Crear nuevo registro en carrosparamantenimiento con la columna clase_id
export async function POST(req) {
  const { year, version, marca_id, modelo_id, clase_id } = await req.json();

  if (!marca_id || !modelo_id || !clase_id)
    return NextResponse.json({ message: "Marca, modelo y clase requeridos" }, { status: 400 });

  await db.query(`
    INSERT INTO carrosparamantenimiento(year, version, marca_id, modelo_id, clase_id)
    VALUES(?, ?, ?, ?, ?)
  `, [year || null, version || null, marca_id, modelo_id, clase_id]);

  return NextResponse.json({ message: "Creado" });
}