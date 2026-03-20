// ============================================
// API DE DOCUMENTOS - GET, POST, PUT, DELETE
// archivo: app/api/documentos/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Listar todos los documentos
// ============================================
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const limit = searchParams.get("limit") || 10;
    const page = searchParams.get("page") || 1;
    const esDigital = searchParams.get("esDigital");
    const tipoArchivo = searchParams.get("tipoArchivo");

    let query = "SELECT * FROM documentos WHERE 1=1";
    const params = [];

    if (search) {
      query += " AND (nombre LIKE ? OR descripcion LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (esDigital !== null && esDigital !== undefined) {
      query += " AND es_digital = ?";
      params.push(esDigital === "true" ? true : false);
    }

    if (tipoArchivo) {
      query += " AND tipo_archivo = ?";
      params.push(tipoArchivo);
    }

    query += " ORDER BY nombre ASC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await db.query(query, params);

    // Obtener total de registros
    let countQuery = "SELECT COUNT(*) as total FROM documentos WHERE 1=1";
    const countParams = [];

    if (search) {
      countQuery += " AND (nombre LIKE ? OR descripcion LIKE ?)";
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (esDigital !== null && esDigital !== undefined) {
      countQuery += " AND es_digital = ?";
      countParams.push(esDigital === "true" ? true : false);
    }

    if (tipoArchivo) {
      countQuery += " AND tipo_archivo = ?";
      countParams.push(tipoArchivo);
    }

    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    // Obtener cantidad de preguntas por documento
    const [docsConPreguntas] = await db.query(
      "SELECT documento_id, COUNT(*) as total_preguntas FROM documento_preguntas GROUP BY documento_id"
    );

    const preguntasMap = {};
    docsConPreguntas.forEach((item) => {
      preguntasMap[item.documento_id] = item.total_preguntas;
    });

    const dataConPreguntas = rows.map((doc) => ({
      ...doc,
      total_preguntas: preguntasMap[doc.id] || 0,
    }));

    return NextResponse.json({
      data: dataConPreguntas,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("GET /api/documentos error:", error);
    return NextResponse.json(
      { message: "Error al listar documentos", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Crear nuevo documento
// ============================================
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      nombre,
      descripcion,
      es_digital,
      ruta_archivo,
      tipo_archivo,
      tamaño_kb,
    } = body;

    // Validaciones
    if (!nombre || nombre.trim() === "") {
      return NextResponse.json(
        { message: "El nombre del documento es obligatorio" },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const [existing] = await db.query(
      "SELECT id FROM documentos WHERE nombre = ?",
      [nombre.trim()]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "Ya existe un documento con este nombre" },
        { status: 409 }
      );
    }

    const [result] = await db.query(
      `INSERT INTO documentos 
      (nombre, descripcion, es_digital, ruta_archivo, tipo_archivo, tamaño_kb) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        descripcion || null,
        es_digital !== undefined ? es_digital : true,
        ruta_archivo || null,
        tipo_archivo || null,
        tamaño_kb || null,
      ]
    );

    return NextResponse.json(
      {
        message: "Documento creado exitosamente",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/documentos error:", error);
    return NextResponse.json(
      { message: "Error al crear documento", error: error.message },
      { status: 500 }
    );
  }
}