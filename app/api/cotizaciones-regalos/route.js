import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const cotizacion_id = searchParams.get("cotizacion_id");
    const moneda_id = searchParams.get("moneda_id");

    let sql = `SELECT 
      cr.*,
      rg.detalle,
      rg.lote,
      rg.regalo_tienda,
      m.codigo as moneda_codigo,
      m.nombre as moneda_nombre,
      m.simbolo as moneda_simbolo
     FROM cotizaciones_regalos cr
     INNER JOIN regalos_disponibles rg ON cr.regalo_id = rg.id
     INNER JOIN monedas m ON cr.moneda_id = m.id
     WHERE 1=1`;

    const params = [];

    if (cotizacion_id) {
      sql += " AND cr.cotizacion_id = ?";
      params.push(cotizacion_id);
    }

    if (moneda_id) {
      sql += " AND cr.moneda_id = ?";
      params.push(moneda_id);
    }

    sql += " ORDER BY cr.created_at DESC";

    const [rows] = await db.query(sql, params);

    // ✅ Formatear respuesta
    const regalosFormateados = rows.map(regalo => ({
      ...regalo,
      cantidad: parseInt(regalo.cantidad),
      precio_unitario: parseFloat(regalo.precio_unitario),
      subtotal: parseFloat(regalo.subtotal),
      descuento_porcentaje: regalo.descuento_porcentaje ? parseFloat(regalo.descuento_porcentaje) : null,
      descuento_monto: regalo.descuento_monto ? parseFloat(regalo.descuento_monto) : 0,
      total: regalo.total ? parseFloat(regalo.total) : null,
      regalo_tienda: Boolean(regalo.regalo_tienda),
    }));

    return NextResponse.json(regalosFormateados);
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const {
      cotizacion_id,
      regalo_id,
      cantidad,
      descuento_porcentaje,
      descuento_monto,
      notas,
    } = await req.json();

    // ✅ Validar campos requeridos
    if (!cotizacion_id || !regalo_id || !cantidad) {
      return NextResponse.json(
        { message: "Campos requeridos: cotizacion_id, regalo_id, cantidad" },
        { status: 400 }
      );
    }

    // ✅ Validar cantidad sea positiva
    if (cantidad <= 0) {
      return NextResponse.json(
        { message: "La cantidad debe ser mayor a 0" },
        { status: 400 }
      );
    }

    // ✅ Obtener regalo para copiar precio y moneda
    const [regalo] = await db.query(
      `SELECT precio_venta, precio_compra, moneda_id FROM regalos_disponibles WHERE id = ?`,
      [regalo_id]
    );

    if (!regalo || regalo.length === 0) {
      return NextResponse.json(
        { message: "Regalo no encontrado" },
        { status: 404 }
      );
    }

    const precio_unitario = parseFloat(regalo[0].precio_venta || regalo[0].precio_compra);
    const moneda_id = regalo[0].moneda_id;
    const subtotal = cantidad * precio_unitario;

    // ✅ Calcular descuento y total
    let desc_monto = 0;
    let desc_porcentaje = null;

    if (descuento_porcentaje && descuento_porcentaje > 0) {
      desc_porcentaje = parseFloat(descuento_porcentaje);
      desc_monto = subtotal * (desc_porcentaje / 100);
    } else if (descuento_monto && descuento_monto > 0) {
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

    // ✅ Insertar con valores congelados
    const [result] = await db.query(
      `INSERT INTO cotizaciones_regalos 
       (cotizacion_id, regalo_id, cantidad, precio_unitario, moneda_id, subtotal, descuento_porcentaje, descuento_monto, total, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cotizacion_id,
        regalo_id,
        cantidad,
        precio_unitario,
        moneda_id,
        subtotal,
        desc_porcentaje || null,
        desc_monto > 0 ? desc_monto : null,
        total,
        notas || null,
      ]
    );

    return NextResponse.json(
      {
        message: "Regalo agregado a cotización",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

export async function PUT(req) {
  try {
    const {
      id,
      cantidad,
      descuento_porcentaje,
      descuento_monto,
      notas,
    } = await req.json();

    if (!id) {
      return NextResponse.json(
        { message: "ID es requerido" },
        { status: 400 }
      );
    }

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

export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "ID es requerido" },
        { status: 400 }
      );
    }

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