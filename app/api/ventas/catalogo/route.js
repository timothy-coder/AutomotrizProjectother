import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/ventas/catalogo
 *
 * Endpoint para el agente n8n de Ventas IA.
 *
 * Fuentes:
 *   - precios_region_version: stock, existe, dias de entrega (autoridad)
 *   - ventas_versiones:       equipamiento y colores (detalle de catalogo)
 *   - versiones / modelos / marcas: nombres
 *   - modelo_especificaciones: specs tecnicas por modelo
 *   - ventas_promociones / ventas_configuracion: promos (no monetarias) y textos
 *
 * Filtro: solo se devuelven versiones con prv.existe = 1 y precio > 0
 * (el precio se usa como gate de "version configurada", pero NO se expone
 * al agente — se omite del JSON para evitar que el LLM lo muestre al cliente).
 * Si existe = 0 en una region, esa version no se incluye en la respuesta.
 *
 * Header requerido: x-ventas-webhook-secret (VENTAS_WEBHOOK_SECRET).
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

    // Versiones ofrecidas: precio/stock/existe/dias desde precios_region_version (autoridad),
    // equipamiento/colores desde ventas_versiones (LEFT JOIN por version_id).
    const [versiones] = await db.query(
      `SELECT prv.version_id,
              prv.modelo_id,
              v.nombre AS nombre_version,
              prv.precio_base AS precio_lista,
              COALESCE(vv.moneda, 'PEN') AS moneda,
              COALESCE(vv.descuento_porcentaje, 0) AS descuento_porcentaje,
              prv.en_stock,
              prv.tiempo_entrega_dias,
              vv.colores_disponibles,
              vv.descripcion_equipamiento
       FROM precios_region_version prv
       JOIN versiones v ON v.id = prv.version_id
       LEFT JOIN ventas_versiones vv
              ON vv.version_id = prv.version_id
             AND vv.modelo_id  = prv.modelo_id
             AND vv.is_active  = 1
       WHERE prv.existe = 1
         AND prv.precio_base > 0
       ORDER BY prv.modelo_id ASC, v.nombre ASC`
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
        en_stock: Boolean(vv.en_stock),
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
