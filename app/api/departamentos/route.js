// ============================================
// API DE DEPARTAMENTOS
// archivo: app/api/departamentos/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    let query = "SELECT * FROM departamentos WHERE 1=1";
    const params = [];

    if (search) {
      query += " AND (nombre LIKE ? OR codigo_ubigeo LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY nombre ASC";

    const [rows] = await db.query(query, params);

    return NextResponse.json(rows);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { nombre, codigo_ubigeo } = await req.json();

    if (!nombre || !codigo_ubigeo) {
      return NextResponse.json(
        { message: "Nombre y código UBIGEO requeridos" },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const [existing] = await db.query(
      "SELECT id FROM departamentos WHERE nombre = ? OR codigo_ubigeo = ?",
      [nombre, codigo_ubigeo]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "Departamento ya existe" },
        { status: 409 }
      );
    }

    const [result] = await db.query(
      "INSERT INTO departamentos (nombre, codigo_ubigeo) VALUES(?, ?)",
      [nombre, codigo_ubigeo]
    );

    return NextResponse.json(
      { message: "Departamento creado", id: result.insertId },
      { status: 201 }
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}