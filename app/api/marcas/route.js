import { NextResponse } from "next/server";
import { db } from "@/lib/db";


// ============================
// GET → LISTAR MARCAS
// ============================
export async function GET() {
  try {

    const [rows] = await db.query(`
      SELECT *
      FROM marcas
      ORDER BY name ASC
    `);

    return NextResponse.json(rows);

  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error al obtener marcas" },
      { status: 500 }
    );
  }
}


// ============================
// POST → CREAR MARCA
// ============================
export async function POST(req) {
  try {

    const { name, image_url } = await req.json();

    const [result] = await db.query(`
      INSERT INTO marcas (name, image_url)
      VALUES (?, ?)
    `, [name, image_url || null]);

    return NextResponse.json({
      id: result.insertId
    });

  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error al crear marca" },
      { status: 500 }
    );
  }
}
