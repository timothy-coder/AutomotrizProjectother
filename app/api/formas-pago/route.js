// ============================================
// API DE FORMAS DE PAGO
// archivo: app/api/formas-pago/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const activa = searchParams.get("activa");

    let query = "SELECT * FROM formas_pago WHERE 1=1";
    const params = [];

    if (search) {
      query += " AND (nombre LIKE ? OR descripcion LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (activa !== null && activa !== undefined) {
      query += " AND es_activa = ?";
      params.push(activa === "true" || activa === "1" ? 1 : 0);
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
    const { nombre, descripcion, es_activa } = await req.json();

    if (!nombre || nombre.trim() === "") {
      return NextResponse.json(
        { message: "Nombre requerido" },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const [existing] = await db.query(
      "SELECT id FROM formas_pago WHERE nombre = ?",
      [nombre.trim()]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "Forma de pago ya existe" },
        { status: 409 }
      );
    }

    const [result] = await db.query(
      "INSERT INTO formas_pago (nombre, descripcion, es_activa) VALUES(?, ?, ?)",
      [nombre.trim(), descripcion || null, es_activa !== undefined ? es_activa : 1]
    );

    return NextResponse.json(
      { message: "Forma de pago creada", id: result.insertId },
      { status: 201 }
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}