import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {

    const [rows] = await db.query(`
      SELECT
        cpm.id,
        cpm.marca_id,
        cpm.modelo_id,
        cpm.year,
        cpm.version,
        marcas.name  AS marca_nombre,
        modelos.name AS modelo_nombre
      FROM carrosparamantenimiento cpm
      LEFT JOIN marcas  ON marcas.id = cpm.marca_id
      LEFT JOIN modelos ON modelos.id = cpm.modelo_id
      ORDER BY marcas.name, modelos.name, cpm.year
    `);

    return NextResponse.json(rows);

  } catch (e) {
    console.log(e);
    return NextResponse.json({ message:"Error" },{ status:500 });
  }
}


// CREAR
export async function POST(req) {
  const { year, version, marca_id, modelo_id } = await req.json();

  if (!marca_id || !modelo_id)
    return NextResponse.json({ message: "Marca y modelo requeridos" }, { status: 400 });

  await db.query(`
    INSERT INTO carrosparamantenimiento(year,version,marca_id,modelo_id)
    VALUES(?,?,?,?)
  `, [year || null, version || null, marca_id, modelo_id]);

  return NextResponse.json({ message: "Creado" });
}
