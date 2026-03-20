// ============================================
// API DE VERSIONES
// archivo: app/api/versiones/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const [rows] = await db.query(
      "SELECT * FROM versiones WHERE es_activa = true ORDER BY nombre ASC"
    );

    return NextResponse.json(rows);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { nombre, descripcion } = await req.json();

    if (!nombre) {
      return NextResponse.json(
        { message: "Nombre requerido" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      "INSERT INTO versiones (nombre, descripcion) VALUES(?, ?)",
      [nombre, descripcion || null]
    );

    return NextResponse.json(
      { message: "Versión creada", id: result.insertId },
      { status: 201 }
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}