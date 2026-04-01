import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ✅ GET un accesorio específico
export async function GET(req, { params }) {
  try {
    const { id } = params;

    const [rows] = await db.query(
      `SELECT 
        ca.*,
        aa.detalle,
        aa.numero_parte,
        m.codigo as moneda_codigo,
        m.simbolo as moneda_simbolo
       FROM cotizaciones_accesorios ca
       INNER JOIN accesorios_disponibles aa ON ca.accesorio_id = aa.id
       INNER JOIN monedas m ON ca.moneda_id = m.id
       WHERE ca.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Accesorio no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

// ✅ UPDATE - Solo descuento
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const { descuento_porcentaje } = await req.json();

    if (descuento_porcentaje === undefined) {
      return NextResponse.json(
        { message: "Solo se puede modificar: descuento_porcentaje" },
        { status: 400 }
      );
    }

    // ✅ Validar que el descuento sea válido
    if (descuento_porcentaje !== null && (descuento_porcentaje < 0 || descuento_porcentaje > 100)) {
      return NextResponse.json(
        { message: "El descuento debe estar entre 0 y 100" },
        { status: 400 }
      );
    }

    // ✅ Obtener subtotal actual
    const [current] = await db.query(
      `SELECT subtotal FROM cotizaciones_accesorios WHERE id = ?`,
      [id]
    );

    if (current.length === 0) {
      return NextResponse.json(
        { message: "Accesorio no encontrado" },
        { status: 404 }
      );
    }

    const subtotal = current[0].subtotal;
    
    // ✅ Calcular descuento_monto y total
    const descuento_monto = descuento_porcentaje 
      ? (subtotal * (descuento_porcentaje / 100)).toFixed(2)
      : 0;
    const total = (subtotal - descuento_monto).toFixed(2);

    // ✅ Actualizar con cálculos
    const [result] = await db.query(
      `UPDATE cotizaciones_accesorios 
       SET descuento_porcentaje = ?, descuento_monto = ?, total = ?
       WHERE id = ?`,
      [descuento_porcentaje, descuento_monto, total, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Accesorio no encontrado" },
        { status: 404 }
      );
    }

    // ✅ Obtener registro actualizado
    const [updated] = await db.query(
      `SELECT 
        ca.*,
        aa.detalle,
        aa.numero_parte,
        m.codigo as moneda_codigo,
        m.simbolo as moneda_simbolo
       FROM cotizaciones_accesorios ca
       INNER JOIN accesorios_disponibles aa ON ca.accesorio_id = aa.id
       INNER JOIN monedas m ON ca.moneda_id = m.id
       WHERE ca.id = ?`,
      [id]
    );

    return NextResponse.json({
      message: "Descuento actualizado",
      data: updated[0],
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

// ✅ DELETE
export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    const [result] = await db.query(
      `DELETE FROM cotizaciones_accesorios WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Accesorio no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Accesorio eliminado" });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}