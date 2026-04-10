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

    // ✅ Obtener detalles completos de la reserva CON LOS IDs
    const [detalles] = await db.query(`
      SELECT 
        -- IDs principales
        rd.id as detalle_id,
        rd.departamento_id,
        rd.provincia_id,
        rd.distrito_id,
        -- Datos del Comprobante y Cliente
        rd.tipo_comprobante,
        c.identificacion_fiscal,
        c.nombre_comercial,
        rd.fecha_nacimiento,
        rd.ocupacion,
        rd.domicilio,
        d.nombre as departamento_nombre,
        p.nombre as provincia_nombre,
        di.nombre as distrito_nombre,
        c.email,
        c.celular,
        -- Datos del Cónyuge
        rd.nombreconyugue,
        rd.dniconyugue,
        -- Datos de Oportunidad
        oo.oportunidad_id,
        -- Datos del Vehículo
        m.name as marca_nombre,
        mo.name as modelo_nombre,
        cl.name as clase_nombre,
        v.nombre as version_nombre,
        -- Datos Técnicos
        rd.vin,
        rd.usovehiculo,
        ca.anio,
        ca.color_externo,
        ca.color_interno,
        prv.precio_base,
        rd.numero_motor,
        -- Descuentos y Montos
        rd.dsctocredinissan,
        rd.dsctotienda,
        rd.dsctobonoretoma,
        rd.dsctonper,
        rd.cantidad,
        rd.precio_unitario,
        rd.flete,
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
      LEFT JOIN departamentos d ON d.id = rd.departamento_id
      LEFT JOIN provincias p ON p.id = rd.provincia_id
      LEFT JOIN distritos di ON di.id = rd.distrito_id
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

    return NextResponse.json({
      ...reserva,
      detalles: detalles.length > 0 ? detalles[0] : null,
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