import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const oportunidadId = searchParams.get("oportunidad_id");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    let sql = `
      SELECT 
        r.id,
        r.oportunidad_id,
        r.created_by,
        r.created_at,
        r.updated_at,
        u.fullname as created_by_name,
        oo.oportunidad_id as oportunidad_codigo,
        c.nombre as cliente_nombre
      FROM reservas r
      LEFT JOIN usuarios u ON r.created_by = u.id
      LEFT JOIN oportunidades_oportunidades oo ON r.oportunidad_id = oo.id
      LEFT JOIN clientes c ON oo.cliente_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (oportunidadId) {
      sql += " AND r.oportunidad_id = ?";
      params.push(oportunidadId);
    }

    // Contar total
    const countSql = `
      SELECT COUNT(*) as total FROM reservas r
      WHERE 1=1 ${oportunidadId ? "AND r.oportunidad_id = ?" : ""}
    `;
    const countParams = oportunidadId ? [oportunidadId] : [];
    const [countResult] = await db.query(countSql, countParams);
    const total = countResult[0].total;

    sql += " ORDER BY r.created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [rows] = await db.query(sql, params);

    return NextResponse.json({
      data: rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { oportunidad_id, created_by } = await req.json();

    if (!oportunidad_id || !created_by) {
      return NextResponse.json(
        { message: "Faltan campos requeridos: oportunidad_id, created_by" },
        { status: 400 }
      );
    }

    // ✅ Verificar que la oportunidad existe
    const [oportunidadCheck] = await db.query(
      "SELECT id FROM oportunidades_oportunidades WHERE id = ?",
      [oportunidad_id]
    );

    if (oportunidadCheck.length === 0) {
      return NextResponse.json(
        { message: "La oportunidad no existe" },
        { status: 404 }
      );
    }

    // ✅ Verificar que el usuario existe
    const [usuarioCheck] = await db.query(
      "SELECT id FROM usuarios WHERE id = ?",
      [created_by]
    );

    if (usuarioCheck.length === 0) {
      return NextResponse.json(
        { message: "El usuario no existe" },
        { status: 404 }
      );
    }

    // ✅ Crear reserva
    const [result] = await db.query(
      "INSERT INTO reservas (oportunidad_id, created_by) VALUES (?, ?)",
      [oportunidad_id, created_by]
    );

    const reservaId = result.insertId;

    // ✅ Obtener la primera cotización con estado "enviada" o "reservada"
    const [cotizaciones] = await db.query(
      `SELECT 
        ca.id,
        ca.anio,
        ca.version_id,
        m.name as marca_nombre,
        mo.name as modelo_nombre,
        v.nombre as version_nombre,
        cl.name as clase_nombre,
        prv.precio_base
       FROM cotizacionesagenda ca
       LEFT JOIN marcas m ON ca.marca_id = m.id
       LEFT JOIN modelos mo ON ca.modelo_id = mo.id
       LEFT JOIN versiones v ON ca.version_id = v.id
       LEFT JOIN clases cl ON cl.id = mo.clase_id
       LEFT JOIN precios_region_version prv ON prv.marca_id = ca.marca_id 
         AND prv.modelo_id = ca.modelo_id 
         AND prv.version_id = ca.version_id
       WHERE ca.oportunidad_id = ? AND ca.estado IN ('enviada', 'reservada')
       ORDER BY ca.created_at ASC LIMIT 1`,
      [oportunidad_id]
    );

    // Si hay cotización, crear detalle de reserva
    let detalleId = null;
    let cotizacionId = null;

    if (cotizaciones.length > 0) {
      const cotizacion = cotizaciones[0];
      cotizacionId = cotizacion.id;

      // ✅ Obtener información del cliente
      const [clienteInfo] = await db.query(
        `SELECT 
          c.nombre,
          c.apellido,
          c.identificacion_fiscal,
          c.email,
          c.celular,
          c.nombre_comercial
         FROM oportunidades_oportunidades oo
         LEFT JOIN clientes c ON oo.cliente_id = c.id
         WHERE oo.id = ?`,
        [oportunidad_id]
      );

      const cliente = clienteInfo[0] || {};

      // ✅ Crear detalle de reserva con información auto-poblada
      const [detalleResult] = await db.query(
        `INSERT INTO reserva_detalles (
          reserva_id,
          cotizacion_id,
          oportunidad_id,
          vin,
          usovehiculo,
          placa,
          numero_motor,
          cantidad,
          precio_unitario
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reservaId,
          cotizacionId,
          oportunidad_id,
          "", // vin - vacío para editar después
          "", // usovehiculo - vacío para editar
          "", // placa - vacía para editar
          "", // numero_motor - vacío para editar
          1.00, // cantidad por defecto
          cotizacion.precio_base || 0, // precio_unitario de precio_base
        ]
      );

      detalleId = detalleResult.insertId;
    } else {
      // Si no hay cotización, crear detalle sin información de cotización
      const [detalleResult] = await db.query(
        `INSERT INTO reserva_detalles (
          reserva_id,
          cotizacion_id,
          oportunidad_id,
          vin,
          usovehiculo,
          placa,
          numero_motor,
          cantidad,
          precio_unitario
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reservaId,
          0, // sin cotización
          oportunidad_id,
          "", // vin
          "", // usovehiculo
          "", // placa
          "", // numero_motor
          1.00, // cantidad
          0, // precio_unitario
        ]
      );

      detalleId = detalleResult.insertId;
    }

    // ✅ Respuesta
    return NextResponse.json(
      {
        message: cotizacionId 
          ? "Reserva creada con detalle de cotización" 
          : "Reserva creada sin cotización",
        id: reservaId,
        detalle_id: detalleId,
        cotizacion_id: cotizacionId,
        cotizacion_data: cotizaciones.length > 0 ? cotizaciones[0] : null,
      },
      { status: 201 }
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}