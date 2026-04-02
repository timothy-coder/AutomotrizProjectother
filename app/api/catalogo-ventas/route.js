import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * GET /api/catalogo-ventas
 *
 * Devuelve el catálogo de modelos y versiones para el agente de Ventas IA.
 * Público (sin auth) — solo retorna datos de venta activos.
 */
export async function GET() {
  try {
    const [rows] = await db.query(`
      SELECT
        vv.id            AS version_id,
        vv.modelo_id,
        ma.name          AS marca,
        mo.name          AS modelo,
        vv.nombre_version AS version,
        vv.precio_lista,
        vv.moneda,
        vv.descripcion_equipamiento AS equipamiento,
        vv.descuento_porcentaje     AS descuento_pct,
        vv.en_stock,
        vv.tiempo_entrega_dias,
        vv.colores_disponibles
      FROM ventas_versiones vv
      JOIN modelos mo ON mo.id = vv.modelo_id
      JOIN marcas  ma ON ma.id = mo.marca_id
      WHERE vv.is_active = 1
      ORDER BY ma.name, mo.name, vv.precio_lista ASC
    `);

    return NextResponse.json({ versiones: rows });
  } catch (e) {
    console.error("[catalogo-ventas] DB error:", e.message);
    return NextResponse.json({ versiones: [], error: e.message }, { status: 500 });
  }
}
