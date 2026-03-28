import { NextResponse } from "next/server";
import { db } from "@/lib/db";

function isSchemaError(error) {
  return (
    error?.code === "ER_NO_SUCH_TABLE" ||
    error?.errno === 1146 ||
    error?.code === "ER_BAD_FIELD_ERROR" ||
    error?.errno === 1054
  );
}

const QUERY_V2 = `
  SELECT
    u.fullname AS creadoroportunidad,
    us.fullname AS usuarioasignado,
    o.oportunidad_id AS oportunidadcodigo,
    o.detalle AS detalleoportunidad,
    od.fecha_agenda AS fechaagenda,
    od.hora_agenda AS horaagenda,
    od.created_at AS fechacreacion,
    CONCAT(c.nombre, c.apellido) AS nombrecliente,
    c.email AS correocliente,
    c.celular AS celularcliente,
    c.tipo_identificacion AS tipo,
    c.identificacion_fiscal AS numerotipo,
    c.nombre_comercial AS nombrecomercial,
    og.name AS nombreorigen,
    so.name AS nombresuborigen,
    e.nombre AS etapanombre,
    e.descripcion AS temperatura,
    e.color AS coloretapa,
    ci.anio_interes AS anovehiculointeres,
    ci.source AS sourcevehiculointeres,
    m.name AS modelovehiculointeres,
    ma.name AS marcavehiculointeres,
    cl.name AS clasevehiculointeres,
    me.valor AS valorespecificacionvehiculointeres,
    es.nombre AS nombreespecificacionvehiculointeres,
    es.tipo_dato AS tipodatoespecificacionvehiculointeres,
    r.created_by AS tiempocreacionreserva,
    r.estado AS estadoreserva,
    r.observaciones AS observaciones,
    rd.nombreconyugue AS reservanombreconyugue,
    rd.vin AS reservavin,
    rd.usovehiculo AS reservausovehiculo,
    rd.placa AS reservaplaca,
    rd.dsctocredinissan AS reservadsctocredinissan,
    rd.dsctotienda AS reservadsctotienda,
    rd.dsctobonoretoma AS reservadsctobonoretoma,
    rd.dsctonper AS reservadsctonper,
    rd.glp AS reservaglp,
    rd.tarjetaplaca AS reservatarjetaplaca,
    rd.flete AS reservaflete,
    rd.cantidad AS reservacantidad,
    rd.precio_unitario AS reservaprecio_unitario,
    rd.subtotal AS reservasubtotal,
    rd.created_at AS reservacreaciondetalles,
    ct.created_at AS fechacreacioncotizacion,
    ct.anio AS anocotizacion,
    ct.sku AS skucotizacion,
    ct.color_externo AS colorexternocotizacion,
    ct.color_interno AS colorinternocotizacion,
    ct.estado AS estadocotizacion,
    mar.name AS marcacotizacion,
    md.name AS modelocotizacion,
    v.nombre AS versioncotizacion,
    v.descripcion AS descripcionversioncotizacion,
    crr.detalle AS detallecierre,
    crr.created_at AS fechadecierre,
    usu.fullname AS usuarioquecerro
  FROM oportunidades_oportunidades o
  LEFT JOIN oportunidades_detalles od ON od.oportunidad_padre_id = o.id
  LEFT JOIN usuarios u ON o.created_by = u.id
  LEFT JOIN usuarios us ON o.asignado_a = us.id
  LEFT JOIN clientes c ON o.cliente_id = c.id
  LEFT JOIN origenes_citas og ON og.id = o.origen_id
  LEFT JOIN suborigenes_citas so ON so.id = o.suborigen_id
  LEFT JOIN etapasconversion e ON o.etapasconversion_id = e.id
  LEFT JOIN client_interest_vehicles ci ON ci.client_id = c.id
  LEFT JOIN modelos m ON ci.modelo_id = m.id
  LEFT JOIN marcas ma ON ma.id = ci.marca_id
  LEFT JOIN clases cl ON m.clase_id = cl.id
  LEFT JOIN modelo_especificaciones me ON me.marca_id = ma.id AND me.modelo_id = m.id
  LEFT JOIN especificaciones es ON me.especificacion_id = es.id
  LEFT JOIN reservas r ON r.oportunidad_id = o.id
  LEFT JOIN reserva_detalles rd ON rd.reserva_id = r.id
  LEFT JOIN cotizacionesagenda ct ON ct.oportunidad_id = o.id
  LEFT JOIN marcas mar ON mar.id = ct.marca_id
  LEFT JOIN modelos md ON md.id = ct.modelo_id
  LEFT JOIN versiones v ON ct.version_id = v.id
  LEFT JOIN cierres crr ON crr.oportunidad_id = o.id
  LEFT JOIN usuarios usu ON crr.created_by = usu.id
  ORDER BY o.created_at DESC
`;

const QUERY_LEGACY = `
  SELECT
    o.id AS oportunidad_id,
    o.oportunidad_id AS codigo_oportunidad,
    o.detalle AS detalle_oportunidad,
    o.fecha_agenda AS fecha_oportunidad,
    o.hora_agenda AS hora_oportunidad,
    o.created_at AS creacion_oportunidad,
    o.updated_at AS actualizacion_oportunidad,
    o.oportunidad_padre_id,
    c.id AS cliente_id,
    c.nombre AS cliente_nombre,
    c.apellido AS cliente_apellido,
    c.email AS cliente_email,
    c.celular AS cliente_celular,
    c.tipo_identificacion AS cliente_tipo_identificacion,
    c.identificacion_fiscal AS cliente_identificacion,
    c.nombre_comercial AS cliente_nombre_comercial,
    m.id AS marca_id,
    m.name AS marca_nombre,
    mo.id AS modelo_id,
    mo.name AS modelo_nombre,
    mo.clase_id AS modelo_version_id,
    mo.anios AS modelo_anio,
    ca.id AS cotizacion_id,
    ca.estado AS cotizacion_estado,
    ca.created_at AS cotizacion_fecha_creacion,
    r.id AS reserva_id,
    r.estado AS reserva_estado,
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
    us.id AS creador_id,
    us.fullname AS creador_nombre,
    us.email AS creador_email,
    u.id AS asignado_id,
    u.fullname AS asignado_nombre,
    u.email AS asignado_email,
    e.id AS etapa_id,
    e.nombre AS etapa_nombre,
    e.descripcion AS etapa_descripcion,
    e.color AS etapa_color,
    e.sort_order AS etapa_orden,
    oc.id AS origen_id,
    oc.name AS origen_nombre,
    sc.id AS suborigen_id,
    sc.name AS suborigen_nombre,
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

function mapV2Row(row) {
  return {
    oportunidad: {
      codigo: row.oportunidadcodigo,
      detalle: row.detalleoportunidad,
      fecha_agenda: row.fechaagenda,
      hora_agenda: row.horaagenda,
      fecha_creacion: row.fechacreacion,
    },
    cliente: {
      nombre: row.nombrecliente,
      email: row.correocliente,
      celular: row.celularcliente,
      tipo_identificacion: row.tipo,
      identificacion: row.numerotipo,
      nombre_comercial: row.nombrecomercial,
    },
    marca_interes: {
      nombre: row.marcavehiculointeres,
    },
    modelo_interes: {
      nombre: row.modelovehiculointeres,
      clase: row.clasevehiculointeres,
      anio: row.anovehiculointeres,
      source: row.sourcevehiculointeres,
    },
    especificaciones: row.nombreespecificacionvehiculointeres
      ? {
          nombre: row.nombreespecificacionvehiculointeres,
          valor: row.valorespecificacionvehiculointeres,
          tipo_dato: row.tipodatoespecificacionvehiculointeres,
        }
      : null,
    reserva: row.estadoreserva
      ? {
          estado: row.estadoreserva,
          observaciones: row.observaciones,
          tiempo_creacion: row.tiempocreacionreserva,
          detalles: {
            nombre_conyugue: row.reservanombreconyugue,
            vin: row.reservavin,
            uso_vehiculo: row.reservausovehiculo,
            placa: row.reservaplaca,
            descuento_credito_nissan: row.reservadsctocredinissan,
            descuento_tienda: row.reservadsctotienda,
            descuento_bono_retoma: row.reservadsctobonoretoma,
            descuento_nper: row.reservadsctonper,
            glp: row.reservaglp,
            tarjeta_placa: row.reservatarjetaplaca,
            flete: row.reservaflete,
            cantidad: row.reservacantidad,
            precio_unitario: row.reservaprecio_unitario,
            subtotal: row.reservasubtotal,
            fecha_creacion: row.reservacreaciondetalles,
          },
        }
      : null,
    cotizacion: row.skucotizacion
      ? {
          sku: row.skucotizacion,
          anio: row.anocotizacion,
          color_externo: row.colorexternocotizacion,
          color_interno: row.colorinternocotizacion,
          estado: row.estadocotizacion,
          marca: row.marcacotizacion,
          modelo: row.modelocotizacion,
          version: row.versioncotizacion,
          descripcion_version: row.descripcionversioncotizacion,
          fecha_creacion: row.fechacreacioncotizacion,
        }
      : null,
    cierre: row.detallecierre
      ? {
          detalle: row.detallecierre,
          fecha: row.fechadecierre,
          usuario_cerro: row.usuarioquecerro,
        }
      : null,
    usuarios: {
      creador: row.creadoroportunidad,
      asignado: row.usuarioasignado,
    },
    etapa: {
      nombre: row.etapanombre,
      descripcion: row.temperatura,
      color: row.coloretapa,
    },
    origen: {
      nombre: row.nombreorigen,
      suborigen: row.nombresuborigen,
    },
  };
}

function mapLegacyRow(row) {
  return {
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
    },
    marca: { id: row.marca_id, nombre: row.marca_nombre },
    modelo: {
      id: row.modelo_id,
      nombre: row.modelo_nombre,
      version_id: row.modelo_version_id,
      anio: row.modelo_anio,
    },
    cotizacion: {
      id: row.cotizacion_id,
      estado: row.cotizacion_estado,
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
  };
}

function normalizeRows(rows, mapper, keySelector) {
  const oportunidadesMap = new Map();

  rows.forEach((row) => {
    const key = keySelector(row);
    if (!oportunidadesMap.has(key)) {
      oportunidadesMap.set(key, mapper(row));
    }
  });

  return Array.from(oportunidadesMap.values());
}

/* =========================
   GET: detalle completo de oportunidades
   - Prioriza esquema nuevo (oportunidades_oportunidades)
   - Hace fallback automático al esquema legacy (oportunidades)
========================= */
export async function GET(req) {
  try {
    let rows;
    let mapped;

    try {
      [rows] = await db.query(QUERY_V2);
      mapped = normalizeRows(rows, mapV2Row, (r) => r.oportunidadcodigo);
    } catch (error) {
      if (!isSchemaError(error)) throw error;
      [rows] = await db.query(QUERY_LEGACY);
      mapped = normalizeRows(rows, mapLegacyRow, (r) => r.oportunidad_id);
    }

    return NextResponse.json({
      success: true,
      data: mapped,
      total: mapped.length,
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