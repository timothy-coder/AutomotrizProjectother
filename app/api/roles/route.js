import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* =========================
   GET: listar todos los roles
=========================*/
export async function GET(request) {
  try {
    const [rows] = await db.query(
      `
      SELECT 
        id,
        name,
        description,
        created_at
      FROM roles
      ORDER BY id ASC
      `
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al listar roles" },
      { status: 500 }
    );
  }
}

/* =========================
   POST: crear nuevo rol
=========================*/
export async function POST(request) {
  try {
    const body = await request.json();

    const name = (body.name || "").trim();
    const description = (body.description || "").trim();

    /* =========================
       VALIDACIONES
    =========================*/
    if (!name) {
      return NextResponse.json(
        { message: "Nombre del rol es requerido" },
        { status: 400 }
      );
    }

    if (name.length < 3) {
      return NextResponse.json(
        { message: "El nombre debe tener mínimo 3 caracteres" },
        { status: 400 }
      );
    }

    /* =========================
       VERIFICAR DUPLICADOS
    =========================*/
    const [existing] = await db.query(
      `SELECT id FROM roles WHERE name = ? LIMIT 1`,
      [name]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "Este rol ya existe" },
        { status: 409 }
      );
    }

    /* =========================
       INSERT ROL
    =========================*/
    const [result] = await db.query(
      `
      INSERT INTO roles(name, description, created_at)
      VALUES (?, ?, CURRENT_TIMESTAMP)
      `,
      [name, description || null]
    );

    return NextResponse.json(
      {
        message: "✓ Rol creado exitosamente",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    if (error.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { message: "Este rol ya existe" },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Error al crear rol" },
      { status: 500 }
    );
  }
}