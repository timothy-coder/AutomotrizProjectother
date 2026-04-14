import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const [rows] = await db.query(
      `SELECT r.*, 
              mn.nombre as moneda_nombre, 
              mn.simbolo,
              i.nombre as impuesto_nombre,
              i.porcentaje as impuesto_porcentaje
       FROM regalos_disponibles r
       LEFT JOIN monedas mn ON r.moneda_id = mn.id
       LEFT JOIN impuestos i ON r.impuesto_id = i.id
       WHERE r.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Regalo no encontrado" },
        { status: 404 }
      );
    }

    const regalo = rows[0];

    // ✅ Formatear respuesta
    const regaloFormateado = {
      ...regalo,
      precio_compra: parseFloat(regalo.precio_compra),
      precio_venta: regalo.precio_venta ? parseFloat(regalo.precio_venta) : null,
      impuesto_porcentaje: regalo.impuesto_porcentaje ? parseFloat(regalo.impuesto_porcentaje) : 0,
      regalo_tienda: Boolean(regalo.regalo_tienda),
      precio_con_impuesto: regalo.precio_venta 
        ? parseFloat(regalo.precio_venta) + (parseFloat(regalo.precio_venta) * (regalo.impuesto_porcentaje || 0) / 100)
        : null,
    };

    return NextResponse.json(regaloFormateado);
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const {
      detalle,
      lote,
      precio_compra,
      precio_venta,
      moneda_id,
      impuesto_id,
      regalo_tienda,
    } = await req.json();

    // ✅ Validar campos requeridos
    if (!detalle || !lote || !precio_compra || !moneda_id) {
      return NextResponse.json(
        { message: "Campos requeridos faltantes: detalle, lote, precio_compra, moneda_id" },
        { status: 400 }
      );
    }

    // ✅ Validar que el regalo exista
    const [existente] = await db.query(
      `SELECT id FROM regalos_disponibles WHERE id = ?`,
      [id]
    );

    if (existente.length === 0) {
      return NextResponse.json(
        { message: "Regalo no encontrado" },
        { status: 404 }
      );
    }

    // ✅ Validar que precio_venta sea mayor que precio_compra
    if (precio_venta && parseFloat(precio_venta) < parseFloat(precio_compra)) {
      return NextResponse.json(
        { message: "El precio de venta debe ser mayor o igual que el precio de compra" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      `UPDATE regalos_disponibles
       SET detalle = ?, 
           lote = ?, 
           precio_compra = ?, 
           precio_venta = ?, 
           moneda_id = ?, 
           impuesto_id = ?,
           regalo_tienda = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        detalle,
        lote,
        precio_compra,
        precio_venta || null,
        moneda_id,
        impuesto_id || null,
        regalo_tienda ? 1 : 0,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Error al actualizar el regalo" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Regalo actualizado",
      id,
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    // ✅ Validar que el regalo exista
    const [existente] = await db.query(
      `SELECT id FROM regalos_disponibles WHERE id = ?`,
      [id]
    );

    if (existente.length === 0) {
      return NextResponse.json(
        { message: "Regalo no encontrado" },
        { status: 404 }
      );
    }

    // ✅ Verificar si el regalo está siendo usado en cotizaciones (opcional)
    const [usedInCotizaciones] = await db.query(
      `SELECT COUNT(*) as count FROM cotizaciones_regalos WHERE regalo_id = ?`,
      [id]
    );

    if (usedInCotizaciones[0].count > 0) {
      return NextResponse.json(
        {
          message: `No se puede eliminar. Este regalo está siendo usado en ${usedInCotizaciones[0].count} cotización(es)`,
          used_count: usedInCotizaciones[0].count,
        },
        { status: 409 }
      );
    }

    const [result] = await db.query(
      `DELETE FROM regalos_disponibles WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Error al eliminar el regalo" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Regalo eliminado",
      id,
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}