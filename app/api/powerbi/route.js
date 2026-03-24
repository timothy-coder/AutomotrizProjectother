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
u.fullname AS creadoroportunidad,
us.fullname AS usuarioasignado,
o.oportunidad_id AS oportunidadcodigo,
o.detalle AS detalleoportunidad,
od.fecha_agenda AS fechaagenda,
od.hora_agenda AS horaagenda,
od.created_at AS fechacreacion,
CONCAT(c.nombre,c.apellido) AS nombrecliente,
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
ci.anio_interes AS añovehiculointeres,
ci.source AS sourcevehiculointeres,
m.name AS modelovehiculointeres,
ma.name as marcavehiculointeres,
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
ct.anio AS añocotizacion,
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
LEFT JOIN  oportunidades_detalles od ON od.oportunidad_padre_id=o.id
left JOIN usuarios u ON o.created_by = u.id
left JOIN usuarios us ON o.asignado_a = us.id
left JOIN clientes c ON o.cliente_id=c.id
left JOIN origenes_citas og ON og.id= o.origen_id
left JOIN suborigenes_citas so ON so.id=o.suborigen_id
left JOIN etapasconversion e ON o.etapasconversion_id=e.id
left JOIN client_interest_vehicles ci ON ci.client_id=c.id
left JOIN modelos m ON ci.modelo_id=m.id
left JOIN marcas ma ON ma.id=ci.marca_id
left JOIN clases cl ON m.clase_id=cl.id
left JOIN modelo_especificaciones me ON me.marca_id=ma.id AND me.modelo_id=m.id
left JOIN especificaciones es ON me.especificacion_id=es.id
left JOIN reservas r ON r.oportunidad_id=o.id
LEFT JOIN reserva_detalles rd ON rd.reserva_id=r.id
left JOIN cotizacionesagenda ct ON ct.oportunidad_id=o.id
left JOIN marcas mar ON mar.id= ct.marca_id 
left JOIN modelos md ON md.id=ct.modelo_id
left JOIN versiones v ON ct.version_id=v.id
left JOIN cierres crr ON crr.oportunidad_id=o.id
left JOIN usuarios usu ON crr.created_by = usu.id

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
            const opId = row.oportunidadcodigo;

            if (!oportunidadesMap.has(opId)) {
                oportunidadesMap.set(opId, {
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
                        anio: row.añovehiculointeres,
                        source: row.sourcevehiculointeres,
                    },
                    especificaciones: row.nombreespecificacionvehiculointeres ? {
                        nombre: row.nombreespecificacionvehiculointeres,
                        valor: row.valorespecificacionvehiculointeres,
                        tipo_dato: row.tipodatoespecificacionvehiculointeres,
                    } : null,
                    reserva: row.estadoreserva ? {
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
                    } : null,
                    cotizacion: row.skucotizacion ? {
                        sku: row.skucotizacion,
                        anio: row.añocotizacion,
                        color_externo: row.colorexternocotizacion,
                        color_interno: row.colorinternocotizacion,
                        estado: row.estadocotizacion,
                        marca: row.marcacotizacion,
                        modelo: row.modelocotizacion,
                        version: row.versioncotizacion,
                        descripcion_version: row.descripcionversioncotizacion,
                        fecha_creacion: row.fechacreacioncotizacion,
                    } : null,
                    cierre: row.detallecierre ? {
                        detalle: row.detallecierre,
                        fecha: row.fechadecierre,
                        usuario_cerro: row.usuarioquecerro,
                    } : null,
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