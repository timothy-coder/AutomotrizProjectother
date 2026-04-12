// app/api/accesorios-disponibles/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const marca_id = searchParams.get("marca_id");
    const modelo_id = searchParams.get("modelo_id");
    const moneda_id = searchParams.get("moneda_id");

    let sql = `SELECT a.*, 
               m.name as marca_name, 
               mo.name as modelo_name, 
               mn.nombre as moneda_nombre, 
               mn.simbolo,
               i.nombre as impuesto_nombre,
               i.porcentaje as impuesto_porcentaje
               FROM accesorios_disponibles a
               LEFT JOIN marcas m ON a.marca_id = m.id
               LEFT JOIN modelos mo ON a.modelo_id = mo.id
               LEFT JOIN monedas mn ON a.moneda_id = mn.id
               LEFT JOIN impuestos i ON a.impuesto_id = i.id
               WHERE 1=1`;

    const params = [];

    if (marca_id) {
      sql += " AND a.marca_id = ?";
      params.push(marca_id);
    }

    if (modelo_id) {
      sql += " AND a.modelo_id = ?";
      params.push(modelo_id);
    }

    if (moneda_id) {
      sql += " AND a.moneda_id = ?";
      params.push(moneda_id);
    }

    sql += " ORDER BY a.created_at DESC";

    const [rows] = await db.query(sql, params);

    // ✅ Formatear la respuesta con cálculos
    // SI HAY impuesto_id, el precio_venta YA INCLUYE el impuesto
    const accesoriosFormateados = rows.map(acc => ({
      ...acc,
      precio: parseFloat(acc.precio),
      precio_venta: acc.precio_venta ? parseFloat(acc.precio_venta) : null,
      impuesto_porcentaje: acc.impuesto_porcentaje ? parseFloat(acc.impuesto_porcentaje) : 0,
      // ✅ Si hay impuesto_id, el precio_venta YA INCLUYE IGV
      // Si NO hay impuesto_id, calcular el precio con impuesto
      precio_con_impuesto: acc.impuesto_id
        ? acc.precio_venta ? parseFloat(acc.precio_venta) : null
        : acc.precio_venta 
          ? parseFloat(acc.precio_venta) + (parseFloat(acc.precio_venta) * (acc.impuesto_porcentaje || 0) / 100)
          : null,
      tiene_impuesto: acc.impuesto_id ? true : false,
    }));

    return NextResponse.json(accesoriosFormateados);
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
      marca_id,
      modelo_id,
      detalle,
      numero_parte,
      precio,
      precio_venta,
      moneda_id,
      impuesto_id,
    } = await req.json();

    // ✅ Validar campos requeridos
    if (!marca_id || !modelo_id || !detalle || !numero_parte || !precio || !moneda_id) {
      return NextResponse.json(
        { message: "Campos requeridos faltantes: marca_id, modelo_id, detalle, numero_parte, precio, moneda_id" },
        { status: 400 }
      );
    }

    // ✅ Validar que precio_venta sea mayor que precio si se proporciona
    if (precio_venta && parseFloat(precio_venta) < parseFloat(precio)) {
      return NextResponse.json(
        { message: "El precio de venta debe ser mayor que el precio de compra" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      `INSERT INTO accesorios_disponibles 
       (marca_id, modelo_id, detalle, numero_parte, precio, precio_venta, moneda_id, impuesto_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        marca_id,
        modelo_id,
        detalle,
        numero_parte,
        precio,
        precio_venta || null,
        moneda_id,
        impuesto_id || null,
      ]
    );

    return NextResponse.json({
      message: "Accesorio creado",
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

// ✅ PUT para actualizar accesorio
export async function PUT(req) {
  try {
    const {
      id,
      marca_id,
      modelo_id,
      detalle,
      numero_parte,
      precio,
      precio_venta,
      moneda_id,
      impuesto_id,
    } = await req.json();

    if (!id) {
      return NextResponse.json(
        { message: "ID del accesorio es requerido" },
        { status: 400 }
      );
    }

    // ✅ Validar que precio_venta sea mayor que precio si se proporciona
    if (precio_venta && parseFloat(precio_venta) < parseFloat(precio)) {
      return NextResponse.json(
        { message: "El precio de venta debe ser mayor que el precio de compra" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      `UPDATE accesorios_disponibles 
       SET marca_id = ?, 
           modelo_id = ?, 
           detalle = ?, 
           numero_parte = ?, 
           precio = ?, 
           precio_venta = ?, 
           moneda_id = ?, 
           impuesto_id = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        marca_id,
        modelo_id,
        detalle,
        numero_parte,
        precio,
        precio_venta || null,
        moneda_id,
        impuesto_id || null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Accesorio no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Accesorio actualizado",
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

// ✅ DELETE para eliminar accesorio
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "ID del accesorio es requerido" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      `DELETE FROM accesorios_disponibles WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Accesorio no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Accesorio eliminado",
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