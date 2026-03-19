// ============================================
// API DE ACCESORIOS DISPONIBLES - GET, POST, PUT, DELETE
// archivo: app/api/accesorios-disponibles/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Listar todos los accesorios disponibles
// ============================================
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const limit = searchParams.get("limit") || 10;
    const page = searchParams.get("page") || 1;
    const categoria = searchParams.get("categoria");
    const marca = searchParams.get("marca");
    const modelo = searchParams.get("modelo");
    const ordenar = searchParams.get("ordenar") || "nombre"; // nombre, precio, categoria

    let query = "SELECT * FROM accesorios_disponibles WHERE es_disponible = true";
    const params = [];

    if (search) {
      query += " AND (nombre_accesorio LIKE ? OR descripcion LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (categoria) {
      query += " AND categoria = ?";
      params.push(categoria);
    }

    if (marca && !isNaN(marca)) {
      query += ` AND id IN (
        SELECT accesorio_id FROM accesorio_marcas WHERE marca_id = ?
      )`;
      params.push(parseInt(marca));
    }

    if (modelo && !isNaN(modelo)) {
      query += ` AND id IN (
        SELECT accesorio_id FROM accesorio_modelos WHERE modelo_id = ?
      )`;
      params.push(parseInt(modelo));
    }

    const ordenamientos = {
      nombre: "nombre_accesorio ASC",
      precio: "precio ASC",
      categoria: "categoria ASC",
      creado: "created_at DESC",
    };

    const ordenSQL = ordenamientos[ordenar] || "nombre_accesorio ASC";
    query += ` ORDER BY ${ordenSQL} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await db.query(query, params);

    // Obtener total
    let countQuery = "SELECT COUNT(*) as total FROM accesorios_disponibles WHERE es_disponible = true";
    const countParams = [];

    if (search) {
      countQuery += " AND (nombre_accesorio LIKE ? OR descripcion LIKE ?)";
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (categoria) {
      countQuery += " AND categoria = ?";
      countParams.push(categoria);
    }

    if (marca && !isNaN(marca)) {
      countQuery += ` AND id IN (
        SELECT accesorio_id FROM accesorio_marcas WHERE marca_id = ?
      )`;
      countParams.push(parseInt(marca));
    }

    if (modelo && !isNaN(modelo)) {
      countQuery += ` AND id IN (
        SELECT accesorio_id FROM accesorio_modelos WHERE modelo_id = ?
      )`;
      countParams.push(parseInt(modelo));
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
    console.error("GET /api/accesorios-disponibles error:", error);
    return NextResponse.json(
      { message: "Error al listar accesorios", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Crear nuevo accesorio disponible
// ============================================
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      nombre_accesorio,
      categoria,
      descripcion,
      precio,
      descuento_compra_con_auto,
      compatibilidad_notas,
      tiempo_instalacion_horas,
      imagen_url,
    } = body;

    // Validaciones
    if (!nombre_accesorio || nombre_accesorio.trim() === "") {
      return NextResponse.json(
        { message: "El nombre del accesorio es obligatorio" },
        { status: 400 }
      );
    }

    if (!categoria) {
      return NextResponse.json(
        { message: "La categoría es obligatoria" },
        { status: 400 }
      );
    }

    if (!precio || isNaN(precio) || precio <= 0) {
      return NextResponse.json(
        { message: "El precio debe ser mayor a 0" },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const [existing] = await db.query(
      "SELECT id FROM accesorios_disponibles WHERE nombre_accesorio = ?",
      [nombre_accesorio.trim()]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "Ya existe un accesorio con este nombre" },
        { status: 409 }
      );
    }

    const [result] = await db.query(
      `INSERT INTO accesorios_disponibles 
      (nombre_accesorio, categoria, descripcion, precio, descuento_compra_con_auto, 
       compatibilidad_notas, tiempo_instalacion_horas, imagen_url) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre_accesorio.trim(),
        categoria,
        descripcion || null,
        precio,
        descuento_compra_con_auto || null,
        compatibilidad_notas || null,
        tiempo_instalacion_horas || null,
        imagen_url || null,
      ]
    );

    return NextResponse.json(
      {
        message: "Accesorio creado exitosamente",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/accesorios-disponibles error:", error);
    return NextResponse.json(
      { message: "Error al crear accesorio", error: error.message },
      { status: 500 }
    );
  }
}