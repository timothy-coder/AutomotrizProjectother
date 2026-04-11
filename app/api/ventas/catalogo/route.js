import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/ventas/catalogo
 *
 * Endpoint para el agente n8n de Ventas IA.
 * Devuelve modelos con versiones/precios desde ventas_versiones (fuente única),
 * promociones vigentes, especificaciones técnicas y configuración general.
 *
 * Header requerido: x-ventas-webhook-secret
 * Nota: usa un secret separado (VENTAS_WEBHOOK_SECRET) porque este endpoint
 * es consumido exclusivamente por el workflow de Ventas IA en n8n, que tiene
 * credenciales independientes del webhook de taller/conversaciones.
 */
export async function GET(req) {
  const secret = req.headers.get("x-ventas-webhook-secret") || "";
  const expected = process.env.VENTAS_WEBHOOK_SECRET || "";

  if (!expected || secret !== expected) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  try {
    // Modelos del sistema con su marca y clase
    const [modelos] = await db.query(
      `SELECT m.id, m.name AS nombre, ma.name AS marca_nombre,
              m.anios, c.name AS clase_nombre
       FROM modelos m
       JOIN marcas ma ON ma.id = m.marca_id
       LEFT JOIN clases c ON c.id = m.clase_id
       ORDER BY ma.name ASC, m.name ASC`
    );

    // Versiones activas con precio, stock y equipamiento (fuente única: ventas_versiones)
    const [versiones] = await db.query(
      `SELECT vv.id AS version_id, vv.modelo_id, vv.nombre_version,
              vv.precio_lista, vv.moneda, vv.descuento_porcentaje,
              vv.en_stock, vv.tiempo_entrega_dias,
              vv.colores_disponibles, vv.descripcion_equipamiento
       FROM ventas_versiones vv
       WHERE vv.is_active = 1
         AND (vv.precio_lista > 0 OR vv.en_stock > 0)
       ORDER BY vv.modelo_id ASC, vv.nombre_version ASC`
    );

    // Especificaciones técnicas por modelo (excluye media: full, imagen, video)
    const [especRows] = await db.query(
      `SELECT me.marca_id, me.modelo_id, e.nombre AS spec_nombre, me.valor
       FROM modelo_especificaciones me
       JOIN especificaciones e ON e.id = me.especificacion_id
       WHERE e.tipo_dato IN ('texto', 'numero')
       ORDER BY me.modelo_id ASC, e.nombre ASC`
    );

    // Mapa de specs: modelo_id -> { spec_nombre: valor, ... }
    const specsMap = {};
    for (const row of especRows) {
      if (!specsMap[row.modelo_id]) specsMap[row.modelo_id] = {};
      specsMap[row.modelo_id][row.spec_nombre] = row.valor;
    }

    // Promociones vigentes
    const [promociones] = await db.query(
      `SELECT id, modelo_id, descripcion, tipo, valor, fecha_inicio, fecha_fin
       FROM ventas_promociones
       WHERE is_active = 1
         AND (fecha_fin IS NULL OR fecha_fin >= CURDATE())
       ORDER BY modelo_id ASC, fecha_fin ASC`
    );

    // Configuracion general
    const [configRows] = await db.query(
      "SELECT seccion, contenido FROM ventas_configuracion"
    );
    const config = {};
    for (const row of configRows) {
      config[row.seccion] = row.contenido;
    }

    // Construir mapa de modelos
    const modelosMap = {};
    for (const m of modelos) {
      modelosMap[m.id] = {
        ...m,
        nombre_completo: `${m.marca_nombre} ${m.nombre}`,
        especificaciones: specsMap[m.id] || {},
        versiones: [],
        promociones: [],
      };
    }

    // Anidar versiones directamente (sin cruce de tablas)
    for (const vv of versiones) {
      if (!modelosMap[vv.modelo_id]) continue;
      let colores = vv.colores_disponibles;
      if (typeof colores === "string") {
        try { colores = JSON.parse(colores); } catch { colores = []; }
      }
      modelosMap[vv.modelo_id].versiones.push({
        version_id: vv.version_id,
        nombre_version: vv.nombre_version,
        precio_lista: vv.precio_lista,
        moneda: vv.moneda || "USD",
        descuento_porcentaje: vv.descuento_porcentaje ?? 0,
        en_stock: vv.en_stock ?? 0,
        tiempo_entrega_dias: vv.tiempo_entrega_dias,
        colores_disponibles: Array.isArray(colores) ? colores : [],
        descripcion_equipamiento: vv.descripcion_equipamiento ?? null,
      });
    }

    // Anidar promociones
    const promoGlobales = [];
    for (const p of promociones) {
      if (p.modelo_id && modelosMap[p.modelo_id]) {
        modelosMap[p.modelo_id].promociones.push(p);
      } else {
        promoGlobales.push(p);
      }
    }

    // Solo devolver modelos que tengan al menos una version con precio
    const modelosConVersiones = Object.values(modelosMap).filter(
      (m) => m.versiones.length > 0
    );

    return NextResponse.json({
      data: {
        modelos: modelosConVersiones,
        promociones_globales: promoGlobales,
        financiamiento: config.financiamiento || null,
        documentacion_natural: config.documentacion_natural || null,
        documentacion_juridico: config.documentacion_juridico || null,
        garantias: config.garantias || null,
        servicios_adicionales: config.servicios_adicionales || null,
      },
    });
  } catch (err) {
    console.error("[ventas/catalogo GET] DB error:", err.message);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
