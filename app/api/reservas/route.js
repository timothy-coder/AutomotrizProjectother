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
        r.estado,
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
    const body = await req.json();
    const {
      oportunidad_id,
      created_by,
      dsctotienda,
      dsctotiendaporcentaje,
      dsctobonoretoma,
      dsctonper,
      glp,
      tarjetaplaca,
      flete,
      cuota_inicial,
      tipo_comprobante,
      numero_motor,
      vin,
      vin_existe,
      usovehiculo,
      placa,
      tc_referencial,
      cantidad,
      precio_unitario,
      descripcion,
    } = body;

    if (!oportunidad_id || !created_by) {
      return NextResponse.json(
        { message: "Faltan campos requeridos: oportunidad_id, created_by" },
        { status: 400 }
      );
    }

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

    const [result] = await db.query(
      "INSERT INTO reservas (oportunidad_id, created_by, estado) VALUES (?, ?, ?)",
      [oportunidad_id, created_by, "borrador"]
    );

    const reservaId = result.insertId;

    const [cotizaciones] = await db.query(
      `SELECT 
        ca.id,
        ca.anio,
        ca.sku,
        ca.version_id,
        ca.marca_id,
        ca.modelo_id,
        ca.color_externo,
        ca.color_interno,
        ca.descuento_vehiculo,
        ca.descuento_vehiculo_porcentaje,
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

    let detalleId = null;
    let cotizacionId = null;

    if (cotizaciones.length > 0) {
      const cotizacion = cotizaciones[0];
      cotizacionId = cotizacion.id;

      const precioBase = parseFloat(cotizacion.precio_base || 0);

      const descuentoMonto = parseFloat(
        dsctotienda ?? cotizacion.descuento_vehiculo ?? 0
      );

      const descuentoPorcentaje = parseFloat(
        dsctotiendaporcentaje ?? cotizacion.descuento_vehiculo_porcentaje ?? 0
      );

      const descuentoPorcentajeMonto = precioBase * (descuentoPorcentaje / 100);

      const dsctotiendaFinal = descuentoMonto;
      const dsctotiendaporcentajeFinal = descuentoPorcentaje;

      const totalCalculado =
        precioBase -
        descuentoMonto -
        descuentoPorcentajeMonto -
        parseFloat(dsctobonoretoma || 0) -
        parseFloat(dsctonper || 0) +
        parseFloat(glp || 0) +
        parseFloat(tarjetaplaca || 0) +
        parseFloat(flete || 0);

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

      const [detalleResult] = await db.query(
        `INSERT INTO reserva_detalles (
          reserva_id,
          cotizacion_id,
          oportunidad_id,
          tipo_comprobante,
          numero_motor,
          tc_referencial,
          total,
          vin,
          vin_existe,
          usovehiculo,
          placa,
          dsctotienda,
          dsctotiendaporcentaje,
          dsctobonoretoma,
          dsctonper,
          glp,
          tarjetaplaca,
          flete,
          cuota_inicial,
          cantidad,
          precio_unitario,
          descripcion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reservaId,
          cotizacionId,
          oportunidad_id,
          tipo_comprobante || null,
          numero_motor || null,
          tc_referencial || null,
          totalCalculado,
          vin || cotizacion.sku || null,
          vin_existe === true || vin_existe === "true" || vin_existe === 1 ? 1 : 0,
          usovehiculo || null,
          placa || null,
          dsctotiendaFinal,
          dsctotiendaporcentajeFinal,
          dsctobonoretoma || 0.0,
          dsctonper || 0.0,
          glp || 0.0,
          tarjetaplaca || 0.0,
          flete || 0.0,
          cuota_inicial || null,
          cantidad || 1.0,
          precio_unitario || precioBase || 0,
          descripcion || null,
        ]
      );

      detalleId = detalleResult.insertId;
    } else {
      const dsctotiendaFinal = dsctotienda ?? 0.0;
      const dsctotiendaporcentajeFinal = dsctotiendaporcentaje ?? null;

      const [detalleResult] = await db.query(
        `INSERT INTO reserva_detalles (
          reserva_id,
          cotizacion_id,
          oportunidad_id,
          tipo_comprobante,
          numero_motor,
          tc_referencial,
          total,
          vin,
          vin_existe,
          usovehiculo,
          placa,
          dsctotienda,
          dsctotiendaporcentaje,
          dsctobonoretoma,
          dsctonper,
          glp,
          tarjetaplaca,
          flete,
          cuota_inicial,
          cantidad,
          precio_unitario,
          descripcion
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          reservaId,
          0,
          oportunidad_id,
          tipo_comprobante || null,
          numero_motor || null,
          tc_referencial || null,
          null,
          vin || null,
          vin_existe === true || vin_existe === "true" || vin_existe === 1 ? 1 : 0,
          usovehiculo || null,
          placa || null,
          dsctotiendaFinal,
          dsctotiendaporcentajeFinal,
          dsctobonoretoma || 0.0,
          dsctonper || 0.0,
          glp || 0.0,
          tarjetaplaca || 0.0,
          flete || 0.0,
          cuota_inicial || null,
          cantidad || 1.0,
          precio_unitario || 0,
          descripcion || null,
        ]
      );

      detalleId = detalleResult.insertId;
    }

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