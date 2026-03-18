import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/ventas/catalogo
 *
 * Endpoint público (autenticado por secret header) para que el agente n8n
 * cargue el catálogo completo antes de atender al cliente.
 *
 * Header requerido: x-ventas-webhook-secret
 */
export async function GET(req) {
  const secret = req.headers.get("x-ventas-webhook-secret") || "";
  const expected = process.env.VENTAS_WEBHOOK_SECRET || "";

  if (!expected || secret !== expected) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  // Modelos activos con sus versiones activas
  const [modelos] = await db.query(
    `SELECT id, nombre, tipo, motor, transmision, consumo, capacidad_personas,
            caracteristicas_seguridad, caracteristicas_tecnologia
     FROM ventas_modelos
     WHERE is_active = 1
     ORDER BY nombre ASC`
  );

  const [versiones] = await db.query(
    `SELECT id, modelo_id, nombre_version, precio_lista, moneda,
            descripcion_equipamiento, descuento_porcentaje,
            en_stock, tiempo_entrega_dias, colores_disponibles
     FROM ventas_versiones
     WHERE is_active = 1
     ORDER BY modelo_id ASC, precio_lista ASC`
  );

  // Promociones vigentes (activas y dentro de fecha si tienen fecha)
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

  // Anidar versiones y promociones dentro de cada modelo
  const modelosMap = {};
  for (const m of modelos) {
    modelosMap[m.id] = {
      ...m,
      versiones: [],
      promociones: [],
    };
  }

  for (const v of versiones) {
    if (modelosMap[v.modelo_id]) {
      modelosMap[v.modelo_id].versiones.push(v);
    }
  }

  // Promociones globales (sin modelo) y por modelo
  const promoGlobales = [];
  for (const p of promociones) {
    if (p.modelo_id && modelosMap[p.modelo_id]) {
      modelosMap[p.modelo_id].promociones.push(p);
    } else {
      promoGlobales.push(p);
    }
  }

  return NextResponse.json({
    modelos: Object.values(modelosMap),
    promociones_globales: promoGlobales,
    financiamiento: config.financiamiento || null,
    documentacion_natural: config.documentacion_natural || null,
    documentacion_juridico: config.documentacion_juridico || null,
    garantias: config.garantias || null,
    servicios_adicionales: config.servicios_adicionales || null,
  });
}
