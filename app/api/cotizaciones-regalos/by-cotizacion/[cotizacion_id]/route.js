import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    // ✅ HACER AWAIT A PARAMS
    const { cotizacion_id } = await params;

    if (!cotizacion_id) {
      return NextResponse.json(
        { message: "cotizacion_id es requerido" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      `SELECT 
        cr.id,
        cr.cotizacion_id,
        cr.regalo_id,
        cr.cantidad,
        cr.precio_unitario,
        cr.moneda_id,
        cr.subtotal,
        cr.descuento_porcentaje,
        cr.descuento_monto,
        cr.total,
        cr.notas,
        cr.created_at,
        cr.updated_at,
        rg.detalle,
        rg.lote,
        rg.regalo_tienda,
        m.codigo as moneda_codigo,
        m.nombre as moneda_nombre,
        m.simbolo as moneda_simbolo
       FROM cotizaciones_regalos cr
       INNER JOIN regalos_disponibles rg ON cr.regalo_id = rg.id
       INNER JOIN monedas m ON cr.moneda_id = m.id
       WHERE cr.cotizacion_id = ?
       ORDER BY cr.created_at DESC`,
      [cotizacion_id]
    );

    // ✅ Formatear números
    const rowsFormateados = rows.map(row => ({
      ...row,
      cantidad: parseInt(row.cantidad),
      precio_unitario: parseFloat(row.precio_unitario),
      subtotal: parseFloat(row.subtotal),
      descuento_porcentaje: row.descuento_porcentaje ? parseFloat(row.descuento_porcentaje) : null,
      descuento_monto: row.descuento_monto ? parseFloat(row.descuento_monto) : 0,
      total: row.total ? parseFloat(row.total) : null,
      regalo_tienda: Boolean(row.regalo_tienda),
    }));

    return NextResponse.json(rowsFormateados);
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}