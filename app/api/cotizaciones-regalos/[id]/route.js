import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

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
       WHERE cr.id = ?`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { message: "Registro no encontrado" },
        { status: 404 }
      );
    }

    // ✅ Formatear números
    const row = rows[0];
    const rowFormateado = {
      ...row,
      cantidad: parseInt(row.cantidad),
      precio_unitario: parseFloat(row.precio_unitario),
      subtotal: parseFloat(row.subtotal),
      descuento_porcentaje: row.descuento_porcentaje ? parseFloat(row.descuento_porcentaje) : null,
      descuento_monto: row.descuento_monto ? parseFloat(row.descuento_monto) : 0,
      total: row.total ? parseFloat(row.total) : null,
      regalo_tienda: Boolean(row.regalo_tienda),
    };

    return NextResponse.json(rowFormateado);
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
      cantidad,
      descuento_porcentaje,
      descuento_monto,
      notas,
    } = await req.json();

    if (cantidad && cantidad <= 0) {
      return NextResponse.json(
        { message: "La cantidad debe ser mayor a 0" },
        { status: 400 }
      );
    }

    // ✅ Obtener registro actual
    const [current] = await db.query(
      `SELECT precio_unitario, cantidad as cantidad_actual FROM cotizaciones_regalos WHERE id = ?`,
      [id]
    );

    if (!current || current.length === 0) {
      return NextResponse.json(
        { message: "Registro no encontrado" },
        { status: 404 }
      );
    }

    const precio_unitario = parseFloat(current[0].precio_unitario);
    const nueva_cantidad = cantidad || current[0].cantidad_actual;
    const subtotal = nueva_cantidad * precio_unitario;

    // ✅ Calcular descuento y total
    let desc_monto = 0;
    let desc_porcentaje = null;

    if (descuento_porcentaje !== undefined && descuento_porcentaje > 0) {
      desc_porcentaje = parseFloat(descuento_porcentaje);
      desc_monto = subtotal * (desc_porcentaje / 100);
    } else if (descuento_monto !== undefined && descuento_monto > 0) {
      desc_monto = parseFloat(descuento_monto);
    }

    const total = subtotal - desc_monto;

    // ✅ Validar que el descuento no sea mayor que el subtotal
    if (desc_monto > subtotal) {
      return NextResponse.json(
        { message: "El descuento no puede ser mayor que el subtotal" },
        { status: 400 }
      );
    }

    // ✅ Actualizar registro
    const [result] = await db.query(
      `UPDATE cotizaciones_regalos
       SET cantidad = ?,
           subtotal = ?,
           descuento_porcentaje = ?,
           descuento_monto = ?,
           total = ?,
           notas = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        nueva_cantidad,
        subtotal,
        desc_porcentaje || null,
        desc_monto > 0 ? desc_monto : null,
        total,
        notas !== undefined ? notas : null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Error al actualizar" },
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

    const [result] = await db.query(
      `DELETE FROM cotizaciones_regalos WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Registro no encontrado" },
        { status: 404 }
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