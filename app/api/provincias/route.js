// ============================================
// API DE PROVINCIAS
// archivo: app/api/provincias/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const departamento_id = searchParams.get("departamento_id");

    let query = `
      SELECT p.*, d.nombre as departamento_nombre
      FROM provincias p
      LEFT JOIN departamentos d ON d.id = p.departamento_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += " AND (p.nombre LIKE ? OR p.codigo_ubigeo LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (departamento_id) {
      query += " AND p.departamento_id = ?";
      params.push(departamento_id);
    }

    query += " ORDER BY p.nombre ASC";

    const [rows] = await db.query(query, params);

    return NextResponse.json(rows);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { nombre, codigo_ubigeo, departamento_id } = await req.json();

    if (!nombre || !codigo_ubigeo || !departamento_id) {
      return NextResponse.json(
        { message: "Campos requeridos faltando" },
        { status: 400 }
      );
    }

    // Verificar si existe el departamento
    const [depto] = await db.query(
      "SELECT id FROM departamentos WHERE id = ?",
      [departamento_id]
    );

    if (depto.length === 0) {
      return NextResponse.json(
        { message: "Departamento no encontrado" },
        { status: 404 }
      );
    }

    // Verificar si ya existe
    const [existing] = await db.query(
      "SELECT id FROM provincias WHERE (nombre = ? AND departamento_id = ?) OR codigo_ubigeo = ?",
      [nombre, departamento_id, codigo_ubigeo]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "Provincia ya existe en este departamento" },
        { status: 409 }
      );
    }

    const [result] = await db.query(
      "INSERT INTO provincias (nombre, codigo_ubigeo, departamento_id) VALUES(?, ?, ?)",
      [nombre, codigo_ubigeo, departamento_id]
    );

    return NextResponse.json(
      { message: "Provincia creada", id: result.insertId },
      { status: 201 }
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}