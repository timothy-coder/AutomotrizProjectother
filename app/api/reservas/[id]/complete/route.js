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

    // ✅ Query completa con todos los datos necesarios
    const [data] = await db.query(`
      SELECT 
        -- Datos de Reserva
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
        -- Datos de Oportunidad y Vehículo
        oo.oportunidad_id,
        m.name as marca_nombre,
        mo.name as modelo_nombre,
        cl.name as clase_nombre,
        v.nombre as version_nombre,
        -- Datos Técnicos del Vehículo
        rd.vin,
        rd.usovehiculo,
        ca.anio,
        ca.color_externo,
        ca.color_interno,
        prv.precio_base,
        -- Descuentos y Montos
        rd.dsctocredinissan,
        rd.dsctotienda,
        rd.dsctobonoretoma,
        rd.dsctonper,
        rd.cantidad,
        rd.subtotal,
        rd.flete,
        rd.tarjetaplaca,
        rd.glp,
        rd.tc_referencial,
        rd.total,
        rd.numero_motor,
        -- Accesorios
        ad.precio as accesorio_precio,
        mon.nombre as moneda_nombre,
        mon.simbolo as moneda_simbolo,
        ad.numero_parte,
        ad.detalle as accesorio_detalle,
        -- Datos Cliente
        c.nombre as cliente_nombre,
        c.apellido as cliente_apellido
      FROM reserva_detalles rd
      JOIN reservas r ON r.id = rd.reserva_id
      JOIN oportunidades_oportunidades oo ON oo.id = r.oportunidad_id
      JOIN clientes c ON oo.cliente_id = c.id
      JOIN cotizacionesagenda ca ON ca.id = rd.cotizacion_id
      JOIN marcas m ON m.id = ca.marca_id
      JOIN modelos mo ON ca.modelo_id = mo.id
      JOIN departamentos d ON d.id = rd.departamento_id
      JOIN provincias p ON p.id = rd.provincia_id
      JOIN distritos di ON di.id = rd.distrito_id
      JOIN clases cl ON cl.id = mo.clase_id
      JOIN versiones v ON v.id = ca.version_id
      LEFT JOIN precios_region_version prv ON prv.marca_id = m.id 
        AND prv.modelo_id = mo.id 
        AND prv.version_id = v.id
      LEFT JOIN cotizaciones_accesorios cac ON cac.cotizacion_id = ca.id
      LEFT JOIN accesorios_disponibles ad ON ad.id = cac.accesorio_id
      LEFT JOIN monedas mon ON ad.moneda_id = mon.id
      WHERE rd.reserva_id = ?
    `, [id]);

    if (data.length === 0) {
      return NextResponse.json(
        { message: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    // ✅ Agrupar accesorios
    const accesorios = [];
    const reservaData = {};

    data.forEach((row, idx) => {
      // Copiar datos principales de la primera fila
      if (idx === 0) {
        Object.keys(row).forEach(key => {
          if (!key.includes('accesorio') && !key.includes('moneda')) {
            reservaData[key] = row[key];
          }
        });
      }

      // Agrupar accesorios
      if (row.accesorio_precio && row.numero_parte) {
        const accesorioExistente = accesorios.find(a => a.numero_parte === row.numero_parte);
        if (!accesorioExistente) {
          accesorios.push({
            numero_parte: row.numero_parte,
            detalle: row.accesorio_detalle,
            precio: row.accesorio_precio,
            moneda_nombre: row.moneda_nombre,
            moneda_simbolo: row.moneda_simbolo,
          });
        }
      }
    });

    return NextResponse.json({
      ...reservaData,
      accesorios: accesorios,
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}