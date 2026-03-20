import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/ventas/catalogo
 *
 * Endpoint para el agente n8n de Ventas IA.
 * Devuelve modelos con versiones/precios desde precios_region_version,
 * promociones vigentes y configuración general de ventas.
 *
 * Header requerido: x-ventas-webhook-secret
 */
export async function GET(req) {
  const secret = req.headers.get("x-ventas-webhook-secret") || "";
  const expected = process.env.VENTAS_WEBHOOK_SECRET || "";

  if (!expected || secret !== expected) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  // Modelos del sistema con su marca y clase
  const [modelos] = await db.query(
    `SELECT m.id, m.name AS nombre, ma.name AS marca_nombre,
            m.anios, c.name AS clase_nombre
     FROM modelos m
     JOIN marcas ma ON ma.id = m.marca_id
     LEFT JOIN clases c ON c.id = m.clase_id
     ORDER BY ma.name ASC, m.name ASC`
  );

  // Precios + stock desde precios_region_version, con nombre de versión
  const [preciosVersiones] = await db.query(
    `SELECT prv.modelo_id, prv.version_id, prv.precio_base,
            prv.en_stock, prv.tiempo_entrega_dias,
            v.nombre AS nombre_version,
            prv.marca_id
     FROM precios_region_version prv
     JOIN versiones v ON v.id = prv.version_id
     WHERE prv.precio_base > 0 OR prv.en_stock = 1
     ORDER BY prv.modelo_id ASC, v.nombre ASC`
  );

  // Descripción de equipamiento por version desde ventas_versiones (opcional)
  const [ventasVersiones] = await db.query(
    `SELECT modelo_id, nombre_version, descripcion_equipamiento,
            descuento_porcentaje, colores_disponibles
     FROM ventas_versiones
     WHERE is_active = 1`
  );

  // Mapa de enrichment: modelo_id + nombre_version (lowercase) → datos extra
  const enrichMap = {};
  for (const vv of ventasVersiones) {
    const k = `${vv.modelo_id}_${vv.nombre_version.toLowerCase().trim()}`;
    enrichMap[k] = vv;
  }

  // Promociones vigentes
  const [promociones] = await db.query(
    `SELECT id, modelo_id, descripcion, tipo, valor, fecha_inicio, fecha_fin
     FROM ventas_promociones
     WHERE is_active = 1
       AND (fecha_fin IS NULL OR fecha_fin >= CURDATE())
     ORDER BY modelo_id ASC, fecha_fin ASC`
  );

  // Configuración general
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
      versiones: [],
      promociones: [],
    };
  }

  // Anidar versiones con precio+stock, enriquecidas con ventas_versiones si existe
  for (const pv of preciosVersiones) {
    if (!modelosMap[pv.modelo_id]) continue;
    const enrichKey = `${pv.modelo_id}_${pv.nombre_version.toLowerCase().trim()}`;
    const extra = enrichMap[enrichKey] || {};
    modelosMap[pv.modelo_id].versiones.push({
      version_id: pv.version_id,
      nombre_version: pv.nombre_version,
      precio_lista: pv.precio_base,
      descuento_porcentaje: extra.descuento_porcentaje ?? 0,
      en_stock: Boolean(pv.en_stock),
      tiempo_entrega_dias: pv.tiempo_entrega_dias,
      colores_disponibles: extra.colores_disponibles ?? [],
      descripcion_equipamiento: extra.descripcion_equipamiento ?? null,
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

  // Solo devolver modelos que tengan al menos una versión con precio
  const modelosConVersiones = Object.values(modelosMap).filter(
    (m) => m.versiones.length > 0
  );

  return NextResponse.json({
    modelos: modelosConVersiones,
    promociones_globales: promoGlobales,
    financiamiento: config.financiamiento || null,
    documentacion_natural: config.documentacion_natural || null,
    documentacion_juridico: config.documentacion_juridico || null,
    garantias: config.garantias || null,
    servicios_adicionales: config.servicios_adicionales || null,
  });
}
