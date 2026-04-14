import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const [rows] = await db.query(
      `SELECT a.*, 
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
       WHERE a.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Accesorio no encontrado" },
        { status: 404 }
      );
    }

    const accesorio = rows[0];

    // ✅ Formatear respuesta con cálculos
    const accesorioFormateado = {
      ...accesorio,
      precio: parseFloat(accesorio.precio),
      precio_venta: accesorio.precio_venta ? parseFloat(accesorio.precio_venta) : null,
      impuesto_porcentaje: accesorio.impuesto_porcentaje ? parseFloat(accesorio.impuesto_porcentaje) : 0,
      // ✅ Calcular precio con impuesto
      precio_con_impuesto: accesorio.precio_venta 
        ? parseFloat(accesorio.precio_venta) + (parseFloat(accesorio.precio_venta) * (accesorio.impuesto_porcentaje || 0) / 100)
        : null,
    };

    return NextResponse.json(accesorioFormateado);
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

    // ✅ Validar que el accesorio exista
    const [existente] = await db.query(
      `SELECT id FROM accesorios_disponibles WHERE id = ?`,
      [id]
    );

    if (existente.length === 0) {
      return NextResponse.json(
        { message: "Accesorio no encontrado" },
        { status: 404 }
      );
    }

    // ✅ Validar que precio_venta sea mayor que precio si se proporciona
    if (precio_venta && parseFloat(precio_venta) < parseFloat(precio)) {
      return NextResponse.json(
        { message: "El precio de venta debe ser mayor o igual que el precio de compra" },
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
        { message: "Error al actualizar el accesorio" },
        { status: 500 }
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

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    // ✅ Validar que el accesorio exista
    const [existente] = await db.query(
      `SELECT id FROM accesorios_disponibles WHERE id = ?`,
      [id]
    );

    if (existente.length === 0) {
      return NextResponse.json(
        { message: "Accesorio no encontrado" },
        { status: 404 }
      );
    }

    // ✅ Verificar si el accesorio está siendo usado en cotizaciones
    const [usedInCotizaciones] = await db.query(
      `SELECT COUNT(*) as count FROM cotizaciones_accesorios WHERE accesorio_id = ?`,
      [id]
    );

    if (usedInCotizaciones[0].count > 0) {
      return NextResponse.json(
        {
          message: `No se puede eliminar. Este accesorio está siendo usado en ${usedInCotizaciones[0].count} cotización(es)`,
          used_count: usedInCotizaciones[0].count,
        },
        { status: 409 }
      );
    }

    const [result] = await db.query(
      `DELETE FROM accesorios_disponibles WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Error al eliminar el accesorio" },
        { status: 500 }
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