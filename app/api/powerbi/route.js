import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* =========================
   GET: obtener detalle completo de todas las oportunidades
   - Incluye cliente, marca, modelo, origen
   - Incluye cotizaciones, reservas, detalles
   - Incluye usuario creador y asignado
   - Incluye etapa y origen
========================= */
export async function GET(req) {
  try {
    const query = `
      SELECT
        -- Oportunidad
        o.id AS oportunidad_id,
        o.oportunidad_id AS codigo_oportunidad,
        o.detalle AS detalle_oportunidad,
        o.fecha_agenda AS fecha_oportunidad,
        o.hora_agenda AS hora_oportunidad,
        o.created_at AS creacion_oportunidad,
        o.updated_at AS actualizacion_oportunidad,
        o.oportunidad_padre_id,

        -- Cliente
        c.id AS cliente_id,
        c.nombre AS cliente_nombre,
        c.apellido AS cliente_apellido,
        c.email AS cliente_email,
        c.celular AS cliente_celular,
        c.tipo_identificacion AS cliente_tipo_identificacion,
        c.identificacion_fiscal AS cliente_identificacion,
        c.nombre_comercial AS cliente_nombre_comercial,
        c.created_at AS cliente_fecha_creacion,

        -- Marca
        m.id AS marca_id,
        m.name AS marca_nombre,

        -- Modelo
        mo.id AS modelo_id,
        mo.name AS modelo_nombre,
        mo.clase_id AS modelo_version_id,
        mo.anios AS modelo_anio,

        -- Cotización Agenda
        ca.id AS cotizacion_id,
        ca.estado AS cotizacion_estado,
        ca.created_at AS cotizacion_fecha_creacion,

        -- Reserva
        r.id AS reserva_id,
        r.estado AS reserva_estado,

        -- Reserva Detalles
        rd.id AS reserva_detalle_id,
        rd.nombreconyugue AS reserva_conyuge_nombre,
        rd.dniconyugue AS reserva_conyuge_dni,
        rd.vin AS reserva_vin,
        rd.usovehiculo AS reserva_uso_vehiculo,
        rd.placa AS reserva_placa,
        rd.dsctocredinissan AS reserva_descuento_credito_nissan,
        rd.dsctotienda AS reserva_descuento_tienda,
        rd.dsctobonoretoma AS reserva_descuento_bono_retoma,
        rd.dsctonper AS reserva_descuento_nper,
        rd.glp AS reserva_glp,
        rd.tarjetaplaca AS reserva_tarjeta_placa,
        rd.flete AS reserva_flete,
        rd.cantidad AS reserva_cantidad,
        rd.precio_unitario AS reserva_precio_unitario,
        rd.subtotal AS reserva_subtotal,
        rd.descripcion AS reserva_descripcion,

        -- Usuario Creador
        us.id AS creador_id,
        us.fullname AS creador_nombre,
        us.email AS creador_email,

        -- Usuario Asignado
        u.id AS asignado_id,
        u.fullname AS asignado_nombre,
        u.email AS asignado_email,

        -- Etapa Conversión
        e.id AS etapa_id,
        e.nombre AS etapa_nombre,
        e.descripcion AS etapa_descripcion,
        e.color AS etapa_color,
        e.sort_order AS etapa_orden,

        -- Origen Cita
        oc.id AS origen_id,
        oc.name AS origen_nombre,

        -- Suborigen Cita
        sc.id AS suborigen_id,
        sc.name AS suborigen_nombre,

        -- Interés de Cliente (Vehículo)
        ci.id AS interes_id,
        ci.marca_id AS interes_marca_id,
        ci.modelo_id AS interes_modelo_id,
        ci.anio_interes,
        ci.source AS interes_source,
        ci.active AS interes_activo,
        ci.created_at AS interes_fecha_creacion

      FROM oportunidades o
      LEFT JOIN clientes c ON o.cliente_id = c.id
      LEFT JOIN marcas m ON o.marca_id = m.id
      LEFT JOIN modelos mo ON mo.id = o.modelo_id
      LEFT JOIN cotizacionesagenda ca ON ca.oportunidad_id = o.id
      LEFT JOIN reservas r ON r.oportunidad_id = o.id
      LEFT JOIN reserva_detalles rd ON rd.reserva_id = r.id
      LEFT JOIN usuarios us ON us.id = o.created_by
      LEFT JOIN usuarios u ON o.asignado_a = u.id
      LEFT JOIN etapasconversion e ON o.etapasconversion_id = e.id
      LEFT JOIN origenes_citas oc ON o.origen_id = oc.id
      LEFT JOIN suborigenes_citas sc ON o.suborigen_id = sc.id
      LEFT JOIN client_interest_vehicles ci ON ci.client_id = c.id
      ORDER BY o.created_at DESC
    `;

    const [rows] = await db.query(query);

    if (!rows.length) {
      return NextResponse.json({
        success: true,
        data: [],
        total: 0,
      });
    }

    // Agrupar por oportunidad para evitar duplicados
    const oportunidadesMap = new Map();

    rows.forEach((row) => {
      const opId = row.oportunidad_id;

      if (!oportunidadesMap.has(opId)) {
        oportunidadesMap.set(opId, {
          oportunidad: {
            id: row.oportunidad_id,
            codigo: row.codigo_oportunidad,
            detalle: row.detalle_oportunidad,
            fecha_agenda: row.fecha_oportunidad,
            hora_agenda: row.hora_oportunidad,
            fecha_creacion: row.creacion_oportunidad,
            fecha_actualizacion: row.actualizacion_oportunidad,
            oportunidad_padre_id: row.oportunidad_padre_id,
          },
          cliente: {
            id: row.cliente_id,
            nombre: row.cliente_nombre,
            apellido: row.cliente_apellido,
            email: row.cliente_email,
            celular: row.cliente_celular,
            tipo_identificacion: row.cliente_tipo_identificacion,
            identificacion: row.cliente_identificacion,
            nombre_comercial: row.cliente_nombre_comercial,
            fecha_creacion: row.cliente_fecha_creacion,
          },
          marca: {
            id: row.marca_id,
            nombre: row.marca_nombre,
          },
          modelo: {
            id: row.modelo_id,
            nombre: row.modelo_nombre,
            version_id: row.modelo_version_id,
            anio: row.modelo_anio,
            sku: row.modelo_sku,
            color_externo: row.modelo_color_externo,
            color_interno: row.modelo_color_interno,
            estado: row.modelo_estado,
          },
          cotizacion: {
            id: row.cotizacion_id,
            estado: row.cotizacion_estado,
            observaciones: row.cotizacion_observaciones,
            fecha_creacion: row.cotizacion_fecha_creacion,
          },
          reserva: {
            id: row.reserva_id,
            estado: row.reserva_estado,
            detalles: {
              id: row.reserva_detalle_id,
              conyuge_nombre: row.reserva_conyuge_nombre,
              conyuge_dni: row.reserva_conyuge_dni,
              vin: row.reserva_vin,
              uso_vehiculo: row.reserva_uso_vehiculo,
              placa: row.reserva_placa,
              descuento_credito_nissan: row.reserva_descuento_credito_nissan,
              descuento_tienda: row.reserva_descuento_tienda,
              descuento_bono_retoma: row.reserva_descuento_bono_retoma,
              descuento_nper: row.reserva_descuento_nper,
              glp: row.reserva_glp,
              tarjeta_placa: row.reserva_tarjeta_placa,
              flete: row.reserva_flete,
              cantidad: row.reserva_cantidad,
              precio_unitario: row.reserva_precio_unitario,
              subtotal: row.reserva_subtotal,
              descripcion: row.reserva_descripcion,
            },
          },
          usuarios: {
            creador: {
              id: row.creador_id,
              nombre: row.creador_nombre,
              email: row.creador_email,
            },
            asignado: {
              id: row.asignado_id,
              nombre: row.asignado_nombre,
              email: row.asignado_email,
            },
          },
          etapa: {
            id: row.etapa_id,
            nombre: row.etapa_nombre,
            descripcion: row.etapa_descripcion,
            color: row.etapa_color,
            orden: row.etapa_orden,
          },
          origen: {
            id: row.origen_id,
            nombre: row.origen_nombre,
            suborigen: {
              id: row.suborigen_id,
              nombre: row.suborigen_nombre,
            },
          },
          interes_vehiculo: {
            id: row.interes_id,
            marca_id: row.interes_marca_id,
            modelo_id: row.interes_modelo_id,
            anio_interes: row.anio_interes,
            source: row.interes_source,
            activo: row.interes_activo,
            fecha_creacion: row.interes_fecha_creacion,
          },
        });
      }
    });

    const oportunidades = Array.from(oportunidadesMap.values());

    return NextResponse.json({
      success: true,
      data: oportunidades,
      total: oportunidades.length,
    });
  } catch (error) {
    console.error("GET /api/oportunidades/detalle error:", error);
    return NextResponse.json(
      {
        message: "Error al obtener detalle de oportunidades",
        error: error.message,
      },
      { status: 500 }
    );
  }
}