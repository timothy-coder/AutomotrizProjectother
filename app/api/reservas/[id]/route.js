import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    // ✅ Obtener información básica de la reserva
    const [rows] = await db.query(`
      SELECT 
        r.id,
        r.oportunidad_id,
        r.created_by,
        r.created_at,
        r.updated_at,
        r.estado,
        u.fullname as created_by_name,
        oo.oportunidad_id as oportunidad_codigo,
        oo.cliente_id,
        CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre,
        c.email as cliente_email,
        c.celular as cliente_telefono,
        c.identificacion_fiscal as cliente_dni,
        e.nombre as etapa_nombre
      FROM reservas r
      LEFT JOIN usuarios u ON r.created_by = u.id
      LEFT JOIN oportunidades_oportunidades oo ON r.oportunidad_id = oo.id
      LEFT JOIN clientes c ON oo.cliente_id = c.id
      LEFT JOIN etapasconversion e ON oo.etapasconversion_id = e.id
      WHERE r.id = ?
    `, [id]);

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    const reserva = rows[0];
    const oportunidadId = reserva.oportunidad_id;
    const clienteId = reserva.cliente_id;

    // ✅ Obtener detalles completos de la reserva CON LOS IDs
    const [detalles] = await db.query(`
      SELECT 
        -- IDs principales
        rd.id as detalle_id,
        oo.cliente_id,
        c.departamento_id,
        c.provincia_id,
        c.distrito_id,
        -- Datos del Comprobante y Cliente
        rd.tipo_comprobante,
        c.identificacion_fiscal,
        c.nombre_comercial,
        c.fecha_nacimiento,
        c.ocupacion,
        c.domicilio,
        d.nombre as departamento_nombre,
        p.nombre as provincia_nombre,
        di.nombre as distrito_nombre,
        c.email,
        c.celular,
        -- Datos del Cónyuge
        c.nombreconyugue,
        c.dniconyugue,
        -- Datos de Oportunidad
        oo.oportunidad_id,
        -- Datos del Vehículo
        m.id as marca_id,
        m.name as marca_nombre,
        mo.id as modelo_id,
        mo.name as modelo_nombre,
        cl.id as clase_id,
        cl.name as clase_nombre,
        v.id as version_id,
        v.nombre as version_nombre,
        -- Datos Técnicos
        rd.vin,
        rd.vin_existe,
        rd.usovehiculo,
        ca.anio,
        ca.color_externo,
        ca.color_interno,
        prv.precio_base,
        rd.numero_motor,
        -- ✅ NUEVOS DESCUENTOS
        rd.dsctotienda,
        rd.dsctotiendaporcentaje,
        rd.dsctobonoretoma,
        rd.dsctonper,
        rd.cantidad,
        rd.precio_unitario,
        rd.flete,
        rd.cuota_inicial,
        rd.tarjetaplaca,
        rd.glp,
        rd.tc_referencial,
        rd.total,
        rd.descripcion,
        -- Cotización
        ca.id as cotizacion_id
      FROM reserva_detalles rd
      JOIN reservas r ON r.id = rd.reserva_id
      JOIN oportunidades_oportunidades oo ON oo.id = r.oportunidad_id
      JOIN clientes c ON oo.cliente_id = c.id
      JOIN cotizacionesagenda ca ON ca.id = rd.cotizacion_id
      JOIN marcas m ON m.id = ca.marca_id
      JOIN modelos mo ON ca.modelo_id = mo.id
      LEFT JOIN departamentos d ON d.id = c.departamento_id
      LEFT JOIN provincias p ON p.id = c.provincia_id
      LEFT JOIN distritos di ON di.id = c.distrito_id
      LEFT JOIN clases cl ON cl.id = mo.clase_id
      LEFT JOIN versiones v ON v.id = ca.version_id
      LEFT JOIN precios_region_version prv ON prv.marca_id = m.id 
        AND prv.modelo_id = mo.id 
        AND prv.version_id = v.id
      WHERE rd.reserva_id = ?
      ORDER BY rd.created_at DESC
      LIMIT 1
    `, [id]);

    // ✅ Obtener cotizaciones relacionadas
    const [cotizaciones] = await db.query(`
      SELECT 
        ca.id,
        ca.marca_id,
        ca.modelo_id,
        ca.version_id,
        ca.anio,
        ca.sku,
        ca.color_externo,
        ca.color_interno,
        ca.estado,
        m.name as marca_nombre,
        mo.name as modelo_nombre,
        v.nombre as version_nombre
      FROM cotizacionesagenda ca
      LEFT JOIN marcas m ON ca.marca_id = m.id
      LEFT JOIN modelos mo ON ca.modelo_id = mo.id
      LEFT JOIN versiones v ON ca.version_id = v.id
      WHERE ca.oportunidad_id = ? AND ca.estado IN ('enviada', 'reservada')
      ORDER BY ca.created_at DESC
    `, [oportunidadId]);

    // ✅ Construir respuesta completa
    const detallesFinal = detalles.length > 0 ? detalles[0] : null;

    return NextResponse.json({
      ...reserva,
      cliente_id: clienteId,
      detalles: detallesFinal ? {
        ...detallesFinal,
        cliente_id: clienteId,
      } : null,
      cotizaciones: cotizaciones || [],
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

// ✅ PUT - Actualizar reserva_detalles
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    // ✅ Verificar que la reserva existe
    const [checkReserva] = await db.query(
      `SELECT id FROM reservas WHERE id = ?`,
      [id]
    );

    if (checkReserva.length === 0) {
      return NextResponse.json(
        { message: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    // ✅ Obtener el detalle_id
    const [detalleCheck] = await db.query(
      `SELECT id FROM reserva_detalles WHERE reserva_id = ? LIMIT 1`,
      [id]
    );

    if (detalleCheck.length === 0) {
      return NextResponse.json(
        { message: "No hay detalle para esta reserva" },
        { status: 404 }
      );
    }

    const detalleId = detalleCheck[0].id;

    // ✅ Campos permitidos para actualizar
    const camposPermitidos = [
      "tipo_comprobante",
      "numero_motor",
      "tc_referencial",
      "total",
      "vin",
      "vin_existe",
      "usovehiculo",
      "placa",
      "dsctotienda",
      "dsctotiendaporcentaje",
      "dsctobonoretoma",
      "dsctonper",
      "glp",
      "tarjetaplaca",
      "flete",
      "cuota_inicial",
      "cantidad",
      "precio_unitario",
      "descripcion",
    ];

    // ✅ Construir objeto de actualización
    const datosActualizacion = {};
    camposPermitidos.forEach((campo) => {
      if (campo in body) {
        // ✅ Manejo especial para vin_existe (booleano)
        if (campo === "vin_existe") {
          datosActualizacion[campo] = body[campo] === true || body[campo] === "true" || body[campo] === 1 ? 1 : 0;
        } else {
          datosActualizacion[campo] = body[campo] === "" ? null : body[campo];
        }
      }
    });

    if (Object.keys(datosActualizacion).length === 0) {
      return NextResponse.json(
        { message: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    // ✅ Construir query dinámicamente
    const campos = Object.keys(datosActualizacion);
    const valores = Object.values(datosActualizacion);
    const setClause = campos.map((c) => `${c} = ?`).join(", ");

    const [result] = await db.query(
      `UPDATE reserva_detalles SET ${setClause}, updated_at = NOW() WHERE id = ?`,
      [...valores, detalleId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "No se pudo actualizar el detalle" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Detalle actualizado correctamente",
      id: parseInt(id),
      detalle_id: detalleId,
      campos_actualizados: campos,
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

// ✅ DELETE - Soft delete
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID inv��lido" },
        { status: 400 }
      );
    }

    // ✅ Verificar que la reserva existe
    const [checkReserva] = await db.query(
      `SELECT id, estado FROM reservas WHERE id = ?`,
      [id]
    );

    if (checkReserva.length === 0) {
      return NextResponse.json(
        { message: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    // ✅ SOFT DELETE: Cambiar estado a 'cancelada'
    const [result] = await db.query(
      `UPDATE reservas SET estado = 'cancelada', updated_at = NOW() WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "No se pudo cancelar la reserva" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Reserva cancelada correctamente",
      id: parseInt(id),
      estado: "cancelada",
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error al cancelar: " + e.message },
      { status: 500 }
    );
  }
}