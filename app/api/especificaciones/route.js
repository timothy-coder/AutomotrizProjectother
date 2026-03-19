// ============================================
// API DE ESPECIFICACIONES - GET, POST, PUT, DELETE
// ============================================

// archivo: app/api/especificaciones/route.js

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Listar todas las especificaciones
// ============================================
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const limit = searchParams.get("limit") || 10;
    const page = searchParams.get("page") || 1;

    let query = "SELECT * FROM especificaciones WHERE 1=1";
    const params = [];

    if (search) {
      query += " AND (nombre LIKE ? OR descripcion LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    query += " ORDER BY nombre ASC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await db.query(query, params);

    // Obtener total de registros
    let countQuery = "SELECT COUNT(*) as total FROM especificaciones WHERE 1=1";
    const countParams = [];

    if (search) {
      countQuery += " AND (nombre LIKE ? OR descripcion LIKE ?)";
      countParams.push(`%${search}%`, `%${search}%`);
    }

    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    return NextResponse.json({
      data: rows,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("GET /api/especificaciones error:", error);
    return NextResponse.json(
      { message: "Error al listar especificaciones", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Crear nueva especificación
// ============================================
export async function POST(req) {
  try {
    const body = await req.json();

    const { nombre, descripcion } = body;

    // Validaciones
    if (!nombre || nombre.trim() === "") {
      return NextResponse.json(
        { message: "El nombre de la especificación es obligatorio" },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const [existing] = await db.query(
      "SELECT id FROM especificaciones WHERE nombre = ?",
      [nombre.trim()]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "Ya existe una especificación con este nombre" },
        { status: 409 }
      );
    }

    const [result] = await db.query(
      "INSERT INTO especificaciones (nombre, descripcion) VALUES (?, ?)",
      [nombre.trim(), descripcion || null]
    );

    return NextResponse.json(
      {
        message: "Especificación creada exitosamente",
        id: result.insertId,
        nombre,
        descripcion,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/especificaciones error:", error);
    return NextResponse.json(
      { message: "Error al crear especificación", error: error.message },
      { status: 500 }
    );
  }
}