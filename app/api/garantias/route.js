// ============================================
// API DE GARANTÍAS - GET, POST, PUT, DELETE
// ============================================

// archivo: app/api/garantias/route.js

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Listar todas las garantías
// ============================================
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const limit = searchParams.get("limit") || 10;
    const page = searchParams.get("page") || 1;
    const ordenar = searchParams.get("ordenar") || "nombre"; // "nombre", "duracion_meses", "costo"

    let query = "SELECT * FROM garantias WHERE 1=1";
    const params = [];

    if (search) {
      query += " AND (nombre LIKE ? OR cobertura LIKE ? OR exclusiones LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    // Ordenamiento
    const ordenamientos = {
      nombre: "nombre ASC",
      duracion_meses: "duracion_meses DESC",
      costo: "costo_adicional ASC",
      creado: "created_at DESC",
    };

    const ordenSQL = ordenamientos[ordenar] || "nombre ASC";
    query += ` ORDER BY ${ordenSQL} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await db.query(query, params);

    // Obtener total de registros
    let countQuery = "SELECT COUNT(*) as total FROM garantias WHERE 1=1";
    const countParams = [];

    if (search) {
      countQuery += " AND (nombre LIKE ? OR cobertura LIKE ? OR exclusiones LIKE ?)";
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
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
    console.error("GET /api/garantias error:", error);
    return NextResponse.json(
      { message: "Error al listar garantías", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Crear nueva garantía
// ============================================
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      nombre,
      duracion_meses,
      duracion_kilometraje,
      cobertura,
      exclusiones,
      costo_adicional,
    } = body;

    // Validaciones
    if (!nombre || nombre.trim() === "") {
      return NextResponse.json(
        { message: "El nombre de la garantía es obligatorio" },
        { status: 400 }
      );
    }

    if (!duracion_meses && !duracion_kilometraje) {
      return NextResponse.json(
        { message: "Debe especificar al menos una duración (meses o kilometraje)" },
        { status: 400 }
      );
    }

    if (!cobertura || cobertura.trim() === "") {
      return NextResponse.json(
        { message: "La descripción de cobertura es obligatoria" },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const [existing] = await db.query(
      "SELECT id FROM garantias WHERE nombre = ?",
      [nombre.trim()]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "Ya existe una garantía con este nombre" },
        { status: 409 }
      );
    }

    const [result] = await db.query(
      `INSERT INTO garantias 
      (nombre, duracion_meses, duracion_kilometraje, cobertura, exclusiones, costo_adicional) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        duracion_meses || null,
        duracion_kilometraje || null,
        cobertura.trim(),
        exclusiones || null,
        costo_adicional || null,
      ]
    );

    return NextResponse.json(
      {
        message: "Garantía creada exitosamente",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/garantias error:", error);
    return NextResponse.json(
      { message: "Error al crear garantía", error: error.message },
      { status: 500 }
    );
  }
}