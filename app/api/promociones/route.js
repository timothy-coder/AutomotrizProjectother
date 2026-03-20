// ============================================
// API DE PROMOCIONES - GET, POST, PUT, DELETE
// ============================================

// archivo: app/api/promociones/route.js

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Listar todas las promociones
// ============================================
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search");
    const limit = searchParams.get("limit") || 10;
    const page = searchParams.get("page") || 1;
    const estado = searchParams.get("estado"); // "activas", "inactivas", "proximas", "vencidas"
    const tipoPromocion = searchParams.get("tipoPromocion");

    let query = `
      SELECT 
        p.*,
        tp.nombre as tipo_promocion_nombre
      FROM promociones p
      LEFT JOIN tipos_promociones tp ON tp.id = p.tipos_promociones_id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += " AND (p.nombre LIKE ? OR p.descripcion LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    if (tipoPromocion && !isNaN(tipoPromocion)) {
      query += " AND p.tipos_promociones_id = ?";
      params.push(parseInt(tipoPromocion));
    }

    // Filtrar por estado
    const hoy = new Date().toISOString().split("T")[0];
    if (estado === "activas") {
      query += ` AND p.es_activo = true AND p.vigente_desde <= ? AND p.vigente_hasta >= ?`;
      params.push(hoy, hoy);
    } else if (estado === "inactivas") {
      query += " AND p.es_activo = false";
    } else if (estado === "proximas") {
      query += ` AND p.vigente_desde > ?`;
      params.push(hoy);
    } else if (estado === "vencidas") {
      query += ` AND p.vigente_hasta < ?`;
      params.push(hoy);
    }

    query += " ORDER BY p.vigente_desde DESC LIMIT ? OFFSET ?";
    params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

    const [rows] = await db.query(query, params);

    // Obtener total de registros
    let countQuery = `
      SELECT COUNT(*) as total FROM promociones p
      LEFT JOIN tipos_promociones tp ON tp.id = p.tipos_promociones_id
      WHERE 1=1
    `;
    const countParams = [];

    if (search) {
      countQuery += " AND (p.nombre LIKE ? OR p.descripcion LIKE ?)";
      countParams.push(`%${search}%`, `%${search}%`);
    }

    if (tipoPromocion && !isNaN(tipoPromocion)) {
      countQuery += " AND p.tipos_promociones_id = ?";
      countParams.push(parseInt(tipoPromocion));
    }

    if (estado === "activas") {
      countQuery += ` AND p.es_activo = true AND p.vigente_desde <= ? AND p.vigente_hasta >= ?`;
      countParams.push(hoy, hoy);
    } else if (estado === "inactivas") {
      countQuery += " AND p.es_activo = false";
    } else if (estado === "proximas") {
      countQuery += ` AND p.vigente_desde > ?`;
      countParams.push(hoy);
    } else if (estado === "vencidas") {
      countQuery += ` AND p.vigente_hasta < ?`;
      countParams.push(hoy);
    }

    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0]?.total || 0;

    // Agregar información calculada
    const dataConEstado = rows.map((promo) => ({
      ...promo,
      disponibles: promo.limite_unidades
        ? promo.limite_unidades - promo.unidades_usadas
        : null,
      porcentajeUso:
        promo.limite_unidades && promo.limite_unidades > 0
          ? Math.round((promo.unidades_usadas / promo.limite_unidades) * 100)
          : null,
      estado: getEstadoPromocion(promo, hoy),
    }));

    return NextResponse.json({
      data: dataConEstado,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("GET /api/promociones error:", error);
    return NextResponse.json(
      { message: "Error al listar promociones", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Crear nueva promoción
// ============================================
export async function POST(req) {
  try {
    const body = await req.json();

    const {
      nombre,
      descripcion,
      tipos_promociones_id,
      descuento_porcentaje,
      descuento_monto,
      condiciones,
      vigente_desde,
      vigente_hasta,
      limite_unidades,
    } = body;

    // Validaciones
    if (!nombre || nombre.trim() === "") {
      return NextResponse.json(
        { message: "El nombre de la promoción es obligatorio" },
        { status: 400 }
      );
    }

    if (!tipos_promociones_id || isNaN(tipos_promociones_id)) {
      return NextResponse.json(
        { message: "El tipo de promoción es obligatorio" },
        { status: 400 }
      );
    }

    if (!vigente_desde || !vigente_hasta) {
      return NextResponse.json(
        { message: "Las fechas de vigencia son obligatorias" },
        { status: 400 }
      );
    }

    if (vigente_desde > vigente_hasta) {
      return NextResponse.json(
        { message: "La fecha de inicio no puede ser posterior a la fecha de fin" },
        { status: 400 }
      );
    }

    if (
      (!descuento_porcentaje || descuento_porcentaje === "") &&
      (!descuento_monto || descuento_monto === "")
    ) {
      return NextResponse.json(
        { message: "Debe especificar un descuento (porcentaje o monto)" },
        { status: 400 }
      );
    }

    // Verificar que el tipo de promoción existe
    const [tipoPromo] = await db.query(
      "SELECT id FROM tipos_promociones WHERE id = ?",
      [tipos_promociones_id]
    );

    if (tipoPromo.length === 0) {
      return NextResponse.json(
        { message: "El tipo de promoción especificado no existe" },
        { status: 404 }
      );
    }

    // Verificar si ya existe una promoción con el mismo nombre
    const [existing] = await db.query(
      "SELECT id FROM promociones WHERE nombre = ?",
      [nombre.trim()]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "Ya existe una promoción con este nombre" },
        { status: 409 }
      );
    }

    const [result] = await db.query(
      `INSERT INTO promociones 
      (nombre, descripcion, tipos_promociones_id, descuento_porcentaje, descuento_monto, 
       condiciones, vigente_desde, vigente_hasta, limite_unidades) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        nombre.trim(),
        descripcion || null,
        tipos_promociones_id,
        descuento_porcentaje || null,
        descuento_monto || null,
        condiciones || null,
        vigente_desde,
        vigente_hasta,
        limite_unidades || null,
      ]
    );

    return NextResponse.json(
      {
        message: "Promoción creada exitosamente",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/promociones error:", error);
    return NextResponse.json(
      { message: "Error al crear promoción", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// Función auxiliar para obtener estado
// ============================================
function getEstadoPromocion(promo, hoy) {
  if (!promo.es_activo) return "inactiva";
  if (promo.vigente_desde > hoy) return "proxima";
  if (promo.vigente_hasta < hoy) return "vencida";
  return "activa";
}