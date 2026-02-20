import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/tipo-inventario
export async function GET() {
  try {
    const [rows] = await db.query(
      `SELECT id, nombre, created_at, updated_at
       FROM tipo_inventario
       ORDER BY nombre ASC`
    );
    return NextResponse.json(rows);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Error listando" }, { status: 500 });
  }
}

// POST /api/tipo-inventario
export async function POST(req) {
  try {
    const body = await req.json();
    const nombre = String(body?.nombre || "").trim();

    if (!nombre) {
      return NextResponse.json({ message: "nombre requerido" }, { status: 400 });
    }

    const [result] = await db.query(
      `INSERT INTO tipo_inventario (nombre, created_at, updated_at)
       VALUES (?, NOW(), NOW())`,
      [nombre]
    );

    return NextResponse.json({ message: "Creado", id: result.insertId });
  } catch (e) {
    // duplicado por UNIQUE
    if (e?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ message: "Ya existe ese nombre" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ message: "Error creando" }, { status: 500 });
  }
}
