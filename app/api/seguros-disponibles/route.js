// ============================================
// API DE SEGUROS DISPONIBLES - GET, POST, PUT, DELETE
// archivo: app/api/seguros-disponibles/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Listar todos los seguros disponibles
// ============================================
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const limit = searchParams.get("limit") || 10;
    const page = searchParams.get("page") || 1;
    const tipoCobertura = searchParams.get("tipoCobertura");
    const aseguradora = searchParams.get("aseguradora");
    const activo = searchParams.get("activo");

    let query = "SELECT * FROM seguros_disponibles WHERE 1=1";
    const params = [];

    if (search) {
      query += " AND (aseguradora LIKE ? OR nombre_paquete LIKE ? OR descripcion LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (tipoCobertura) {
      query += " AND tipo_cobertura = ?";
      params.push(tipoCobertura);
    }

    if (aseguradora) {
      query += " AND aseguradora LIKE ?";
      params.push(`%${aseguradora}%`);
    }

    if (activo !== null && activo !== undefined) {
      query += " AND es_activo = ?";
      params.push(activo === "true" ? true : false);
    }

    query += " ORDER BY aseguradora ASC, nombre_paquete ASC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await db.query(query, params);

    // Obtener total de registros
    let countQuery = "SELECT COUNT(*) as total FROM seguros_disponibles WHERE 1=1";
    const countParams = [];

    if (search) {
      countQuery += " AND (aseguradora LIKE ? OR nombre_paquete LIKE ? OR descripcion LIKE ?)";
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    if (tipoCobertura) {
      countQuery += " AND tipo_cobertura = ?";
      countParams.push(tipoCobertura);
    }

    if (aseguradora) {
      countQuery += " AND aseguradora LIKE ?";
      countParams.push(`%${aseguradora}%`);
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
    console.error("GET /api/seguros-disponibles error:", error);
    return NextResponse.json(
      { message: "Error al listar seguros", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Crear nuevo seguro disponible
// ============================================
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      aseguradora,
      nombre_paquete,
      tipo_cobertura,
      cobertura_robos,
      cobertura_incendios,
      cobertura_daños_terceros,
      cobertura_legal,
      cobertura_asistencia_viaje,
      prima_mensual,
      deducible,
      limite_cobertura,
      descripcion,
    } = body;

    // Validaciones
    if (!aseguradora || aseguradora.trim() === "") {
      return NextResponse.json(
        { message: "El nombre de la aseguradora es obligatorio" },
        { status: 400 }
      );
    }

    if (!nombre_paquete || nombre_paquete.trim() === "") {
      return NextResponse.json(
        { message: "El nombre del paquete es obligatorio" },
        { status: 400 }
      );
    }

    if (!tipo_cobertura) {
      return NextResponse.json(
        { message: "El tipo de cobertura es obligatorio" },
        { status: 400 }
      );
    }

    if (!prima_mensual || isNaN(prima_mensual) || prima_mensual <= 0) {
      return NextResponse.json(
        { message: "La prima mensual debe ser mayor a 0" },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const [existing] = await db.query(
      "SELECT id FROM seguros_disponibles WHERE aseguradora = ? AND nombre_paquete = ?",
      [aseguradora.trim(), nombre_paquete.trim()]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "Ya existe un seguro con esta aseguradora y nombre de paquete" },
        { status: 409 }
      );
    }

    const [result] = await db.query(
      `INSERT INTO seguros_disponibles 
      (aseguradora, nombre_paquete, tipo_cobertura, cobertura_robos, cobertura_incendios, 
       cobertura_daños_terceros, cobertura_legal, cobertura_asistencia_viaje, prima_mensual, 
       deducible, limite_cobertura, descripcion) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        aseguradora.trim(),
        nombre_paquete.trim(),
        tipo_cobertura,
        cobertura_robos || false,
        cobertura_incendios || false,
        cobertura_daños_terceros || false,
        cobertura_legal || false,
        cobertura_asistencia_viaje || false,
        prima_mensual,
        deducible || null,
        limite_cobertura || null,
        descripcion || null,
      ]
    );

    return NextResponse.json(
      {
        message: "Seguro creado exitosamente",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/seguros-disponibles error:", error);
    return NextResponse.json(
      { message: "Error al crear seguro", error: error.message },
      { status: 500 }
    );
  }
}