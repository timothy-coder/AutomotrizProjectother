import { NextResponse } from "next/server";
import { db } from "@/lib/db";


// =============================
// GET → LISTAR
// =============================
export async function GET() {
  try {

    const [rows] = await db.query(`
      SELECT *
      FROM tiposactividades
      ORDER BY tipo ASC, id ASC
    `);

    return NextResponse.json(rows);

  } catch (error) {
    console.log(error);

    return NextResponse.json(
      { message: "Error al obtener tipos de actividades" },
      { status: 500 }
    );
  }
}



// =============================
// POST → CREAR
// =============================
export async function POST(req) {
  try {

    const { name, tipo, is_active = 1 } = await req.json();

    const [result] = await db.query(`
      INSERT INTO tiposactividades
      (name, tipo, is_active)
      VALUES (?, ?, ?)
    `, [
      name,
      tipo,
      is_active ? 1 : 0
    ]);

    return NextResponse.json({
      id: result.insertId
    });

  } catch (error) {
    console.log(error);

    return NextResponse.json(
      { message: "Error al crear tipo actividad" },
      { status: 500 }
    );
  }
}
