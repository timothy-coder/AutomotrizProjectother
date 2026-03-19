// ============================================
// API DE PAQUETES DE MANTENIMIENTO
// archivo: app/api/paquetes-mantenimiento/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Listar todos los paquetes de mantenimiento
// ============================================
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const limit = searchParams.get("limit") || 10;
    const page = searchParams.get("page") || 1;
    const marca = searchParams.get("marca");
    const modelo = searchParams.get("modelo");
    const ordenar = searchParams.get("ordenar") || "nombre"; // nombre, precio, duracion

    let query = `
      SELECT DISTINCT
        pm.id,
        pm.nombre,
        pm.descripcion,
        pm.duracion_meses,
        pm.kilometraje_maximo,
        pm.servicios_incluidos,
        pm.precio,
        pm.precio_especial_compra,
        pm.es_opcional,
        pm.descuento_compra_simultanea,
        pm.es_activo,
        pm.created_at,
        COUNT(DISTINCT ps.servicio_id) as total_servicios
      FROM paquetes_mantenimiento pm
      LEFT JOIN paquete_servicios ps ON ps.paquete_id = pm.id
      LEFT JOIN paquete_marcas pmarca ON pmarca.paquete_id = pm.id
      LEFT JOIN paquete_modelos pmod ON pmod.paquete_id = pm.id
      WHERE pm.es_activo = true
    `;
    const params = [];

    if (search) {
      query += " AND (pm.nombre LIKE ? OR pm.descripcion LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (marca && !isNaN(marca)) {
      query += " AND pmarca.marca_id = ?";
      params.push(parseInt(marca));
    }

    if (modelo && !isNaN(modelo)) {
      query += " AND pmod.modelo_id = ?";
      params.push(parseInt(modelo));
    }

    const ordenamientos = {
      nombre: "pm.nombre ASC",
      precio: "pm.precio ASC",
      duracion: "pm.duracion_meses DESC",
      creado: "pm.created_at DESC",
    };

    const ordenSQL = ordenamientos[ordenar] || "pm.nombre ASC";
    query += ` GROUP BY pm.id HAVING 1=1 ORDER BY ${ordenSQL} LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await db.query(query, params);

    // Obtener total
    let countQuery = `
      SELECT COUNT(DISTINCT pm.id) as total 
      FROM paquetes_mantenimiento pm
      LEFT JOIN paquete_marcas pmarca ON pmarca.paquete_id = pm.id
      LEFT JOIN paquete_modelos pmod ON pmod.paquete_id = pm.id
      WHERE pm.es_activo = true
    `;
    const countParams = [];

    if (search) {
      countQuery += " AND (pm.nombre LIKE ? OR pm.descripcion LIKE ?)";
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (marca && !isNaN(marca)) {
      countQuery += " AND pmarca.marca_id = ?";
      countParams.push(parseInt(marca));
    }

    if (modelo && !isNaN(modelo)) {
      countQuery += " AND pmod.modelo_id = ?";
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
    console.error("GET /api/paquetes-mantenimiento error:", error);
    return NextResponse.json(
      { message: "Error al listar paquetes de mantenimiento", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Crear nuevo paquete de mantenimiento
// ============================================
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      nombre,
      descripcion,
      duracion_meses,
      kilometraje_maximo,
      servicios_incluidos,
      precio,
      precio_especial_compra,
      es_opcional,
      descuento_compra_simultanea,
    } = body;

    // Validaciones
    if (!nombre || nombre.trim() === "") {
      return NextResponse.json(
        { message: "El nombre del paquete es obligatorio" },
        { status: 400 }
      );
    }

    if (!precio || isNaN(precio) || precio <= 0) {
      return NextResponse.json(
        { message: "El precio debe ser mayor a 0" },
        { status: 400 }
      );
    }

    if (!duracion_meses || !kilometraje_maximo) {
      return NextResponse.json(
        { message: "La duración en meses y kilometraje máximo son obligatorios" },
        { status: 400 }
      );
    }

    // Verificar si ya existe
    const [existing] = await db.query(
      "SELECT id FROM paquetes_mantenimiento WHERE nombre = ?",
      [nombre.trim()]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "Ya existe un paquete con este nombre" },
        { status: 409 }
      );
    }

    const [result] = await db.query(
      `INSERT INTO paquetes_mantenimiento 
      (nombre, descripcion, duracion_meses, kilometraje_maximo, servicios_incluidos, 
       precio, precio_especial_compra, es_opcional, descuento_compra_simultanea) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        descripcion || null,
        duracion_meses,
        kilometraje_maximo,
        Array.isArray(servicios_incluidos) ? JSON.stringify(servicios_incluidos) : "[]",
        precio,
        precio_especial_compra || null,
        es_opcional !== undefined ? es_opcional : true,
        descuento_compra_simultanea || null,
      ]
    );

    return NextResponse.json(
      {
        message: "Paquete de mantenimiento creado exitosamente",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/paquetes-mantenimiento error:", error);
    return NextResponse.json(
      { message: "Error al crear paquete", error: error.message },
      { status: 500 }
    );
  }
}