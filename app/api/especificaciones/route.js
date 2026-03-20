// ============================================
// API DE ESPECIFICACIONES - CORREGIDA
// archivo: app/api/especificaciones/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");

    let query = "SELECT * FROM especificaciones WHERE 1=1";
    const params = [];

    if (search) {
      query += " AND nombre LIKE ?";
      params.push(`%${search}%`);
    }

    query += " ORDER BY nombre ASC";

    const [rows] = await db.query(query, params);

    // Parsear opciones JSON
    const especificacionesFormateadas = rows.map((row) => ({
      ...row,
      opciones: row.opciones ? JSON.parse(row.opciones) : null,
    }));

    return NextResponse.json(especificacionesFormateadas);
  } catch (e) {
    console.log("Error en GET especificaciones:", e);
    return NextResponse.json({ message: "Error", error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    console.log("Body recibido:", body);

    const { nombre, tipo_dato, opciones } = body;

    if (!nombre || !nombre.trim()) {
      return NextResponse.json(
        { message: "Nombre es requerido" },
        { status: 400 }
      );
    }

    let opcionesJSON = null;
    if (tipo_dato === "lista" && Array.isArray(opciones) && opciones.length > 0) {
      opcionesJSON = JSON.stringify(opciones);
    }

    console.log("Insertando:", {
      nombre: nombre.trim(),
      tipo_dato: tipo_dato || "texto",
      opcionesJSON,
    });

    const [result] = await db.query(
      `INSERT INTO especificaciones (nombre, tipo_dato, opciones)
       VALUES(?, ?, ?)`,
      [nombre.trim(), tipo_dato || "texto", opcionesJSON]
    );

    console.log("Resultado de inserción:", result);

    return NextResponse.json(
      { message: "Especificación creada", id: result.insertId },
      { status: 201 }
    );
  } catch (e) {
    console.log("Error en POST especificaciones:", e);
    return NextResponse.json(
      { message: "Error creando especificación", error: e.message },
      { status: 500 }
    );
  }
}