import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================
// GET → LISTAR FRECUENCIAS
// ============================
export async function GET() {
  try {
    const [rows] = await db.query(
      "SELECT * FROM frecuencia ORDER BY id ASC"
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error al obtener frecuencias" },
      { status: 500 }
    );
  }
}

// ============================
// POST → CREAR FRECUENCIA
// body: { dias }
// ============================
export async function POST(req) {
  try {
    const { dias } = await req.json();

    if (dias === undefined || isNaN(dias)) {
      return NextResponse.json(
        { message: "dias debe ser un número" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      "INSERT INTO frecuencia (dias) VALUES (?)",
      [Number(dias)]
    );

    return NextResponse.json(
      { id: result.insertId, dias: Number(dias) },
      { status: 201 }
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error al crear frecuencia" },
      { status: 500 }
    );
  }
}