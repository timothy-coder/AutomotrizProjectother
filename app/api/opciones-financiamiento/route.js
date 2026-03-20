// ============================================
// API DE OPCIONES DE FINANCIAMIENTO - GET, POST, PUT, DELETE
// archivo: app/api/opciones-financiamiento/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Listar todas las opciones de financiamiento
// ============================================
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const limit = searchParams.get("limit") || 10;
    const page = searchParams.get("page") || 1;
    const proveedor = searchParams.get("proveedor");
    const activo = searchParams.get("activo");
    const ordenar = searchParams.get("ordenar") || "nombre"; // nombre, tasa, plazo, precio

    let query = "SELECT * FROM opciones_financiamiento WHERE 1=1";
    const params = [];

    if (search) {
      query += " AND (nombre LIKE ? OR proveedor LIKE ? OR descripcion_requisitos LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (proveedor) {
      query += " AND proveedor LIKE ?";
      params.push(`%${proveedor}%`);
    }

    if (activo !== null && activo !== undefined) {
      query += " AND es_activo = ?";
      params.push(activo === "true" ? true : false);
    }

    const ordenamientos = {
      nombre: "nombre ASC",
      tasa: "tasa_interes_anual ASC",
      plazo: "plazo_maximo_meses DESC",
      creado: "created_at DESC",
    };

    const ordenSQL = ordenamientos[ordenar] || "nombre ASC";
    query += ` ORDER BY ${ordenSQL} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await db.query(query, params);

    // Obtener total de registros
    let countQuery = "SELECT COUNT(*) as total FROM opciones_financiamiento WHERE 1=1";
    const countParams = [];

    if (search) {
      countQuery += " AND (nombre LIKE ? OR proveedor LIKE ? OR descripcion_requisitos LIKE ?)";
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (proveedor) {
      countQuery += " AND proveedor LIKE ?";
      countParams.push(`%${proveedor}%`);
    }

    if (activo !== null && activo !== undefined) {
      countQuery += " AND es_activo = ?";
      countParams.push(activo === "true" ? true : false);
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
    console.error("GET /api/opciones-financiamiento error:", error);
    return NextResponse.json(
      { message: "Error al listar opciones de financiamiento", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Crear nueva opción de financiamiento
// ============================================
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      nombre,
      proveedor,
      tasa_interes_anual,
      plazo_minimo_meses,
      plazo_maximo_meses,
      cuota_inicial_porcentaje,
      cuota_inicial_monto_minimo,
      seguro_obligatorio,
      seguro_incluido,
      descripcion_requisitos,
      aplica_historial_limitado,
      documentacion_requerida,
      tiempo_aprobacion_dias,
      comisiones_adicionales,
      observaciones,
    } = body;

    // Validaciones
    if (!nombre || nombre.trim() === "") {
      return NextResponse.json(
        { message: "El nombre de la opción de financiamiento es obligatorio" },
        { status: 400 }
      );
    }

    if (
      !plazo_minimo_meses ||
      !plazo_maximo_meses ||
      plazo_minimo_meses > plazo_maximo_meses
    ) {
      return NextResponse.json(
        { message: "Los plazos son obligatorios y el mínimo no puede ser mayor al máximo" },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const [existing] = await db.query(
      "SELECT id FROM opciones_financiamiento WHERE nombre = ?",
      [nombre.trim()]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "Ya existe una opción de financiamiento con este nombre" },
        { status: 409 }
      );
    }

    const [result] = await db.query(
      `INSERT INTO opciones_financiamiento 
      (nombre, proveedor, tasa_interes_anual, plazo_minimo_meses, plazo_maximo_meses, 
       cuota_inicial_porcentaje, cuota_inicial_monto_minimo, seguro_obligatorio, seguro_incluido,
       descripcion_requisitos, aplica_historial_limitado, documentacion_requerida, 
       tiempo_aprobacion_dias, comisiones_adicionales, observaciones) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        proveedor || null,
        tasa_interes_anual || null,
        plazo_minimo_meses,
        plazo_maximo_meses,
        cuota_inicial_porcentaje || null,
        cuota_inicial_monto_minimo || null,
        seguro_obligatorio || false,
        seguro_incluido || false,
        descripcion_requisitos || null,
        aplica_historial_limitado || false,
        documentacion_requerida || null,
        tiempo_aprobacion_dias || null,
        comisiones_adicionales || null,
        observaciones || null,
      ]
    );

    return NextResponse.json(
      {
        message: "Opción de financiamiento creada exitosamente",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/opciones-financiamiento error:", error);
    return NextResponse.json(
      { message: "Error al crear opción de financiamiento", error: error.message },
      { status: 500 }
    );
  }
}