import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET con nombres
export async function GET() {
  const [rows] = await db.query(`
    SELECT c.*,
           ma.name AS marca,
           mo.name AS modelo
    FROM carrosparamantenimiento c
    JOIN marcas ma ON ma.id = c.marca_id
    JOIN modelos mo ON mo.id = c.modelo_id
    ORDER BY ma.name, mo.name
  `);

  return NextResponse.json(rows);
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
