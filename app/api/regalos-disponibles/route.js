import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const moneda_id = searchParams.get("moneda_id");
    const impuesto_id = searchParams.get("impuesto_id");
    const regalo_tienda = searchParams.get("regalo_tienda");

    let sql = `SELECT r.*, 
               mn.nombre as moneda_nombre, 
               mn.simbolo,
               i.nombre as impuesto_nombre,
               i.porcentaje as impuesto_porcentaje
               FROM regalos_disponibles r
               LEFT JOIN monedas mn ON r.moneda_id = mn.id
               LEFT JOIN impuestos i ON r.impuesto_id = i.id
               WHERE 1=1`;

    const params = [];

    if (moneda_id) {
      sql += " AND r.moneda_id = ?";
      params.push(moneda_id);
    }

    if (impuesto_id) {
      sql += " AND r.impuesto_id = ?";
      params.push(impuesto_id);
    }

    if (regalo_tienda !== null && regalo_tienda !== undefined) {
      sql += " AND r.regalo_tienda = ?";
      params.push(regalo_tienda === "true" ? 1 : 0);
    }

    sql += " ORDER BY r.created_at DESC";

    const [rows] = await db.query(sql, params);

    // ✅ Formatear respuesta
    const regalosFormateados = rows.map(regalo => ({
      ...regalo,
      precio_compra: parseFloat(regalo.precio_compra),
      precio_venta: regalo.precio_venta ? parseFloat(regalo.precio_venta) : null,
      impuesto_porcentaje: regalo.impuesto_porcentaje ? parseFloat(regalo.impuesto_porcentaje) : 0,
      regalo_tienda: Boolean(regalo.regalo_tienda),
      precio_con_impuesto: regalo.precio_venta 
        ? parseFloat(regalo.precio_venta) + (parseFloat(regalo.precio_venta) * (regalo.impuesto_porcentaje || 0) / 100)
        : null,
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

    // ✅ Validar que precio_venta sea mayor que precio_compra si se proporciona
    if (precio_venta && parseFloat(precio_venta) < parseFloat(precio_compra)) {
      return NextResponse.json(
        { message: "El precio de venta debe ser mayor o igual que el precio de compra" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      `INSERT INTO regalos_disponibles 
       (detalle, lote, precio_compra, precio_venta, moneda_id, impuesto_id, regalo_tienda)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        detalle,
        lote,
        precio_compra,
        precio_venta || null,
        moneda_id,
        impuesto_id || null,
        regalo_tienda ? 1 : 0,
      ]
    );

    return NextResponse.json({
      message: "Regalo creado",
      id: result.insertId,
    });
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
      detalle,
      lote,
      precio_compra,
      precio_venta,
      moneda_id,
      impuesto_id,
      regalo_tienda,
    } = await req.json();

    if (!id) {
      return NextResponse.json(
        { message: "ID del regalo es requerido" },
        { status: 400 }
      );
    }

    if (!detalle || !lote || !precio_compra || !moneda_id) {
      return NextResponse.json(
        { message: "Campos requeridos faltantes" },
        { status: 400 }
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
        { message: "Regalo no encontrado" },
        { status: 404 }
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
        { message: "ID del regalo es requerido" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      `DELETE FROM regalos_disponibles WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Regalo no encontrado" },
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