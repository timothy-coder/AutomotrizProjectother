import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const [rows] = await db.query(
      `SELECT 
        id,
        descuento_total_accesorios,
        descuento_total_regalos
       FROM cotizacionesagenda
       WHERE id = ?`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { message: "Cotización no encontrada" },
        { status: 404 }
      );
    }

    const cotizacion = rows[0];

    return NextResponse.json({
      id: cotizacion.id,
      descuento_total_accesorios: parseFloat(
        cotizacion.descuento_total_accesorios || 0
      ),
      descuento_total_regalos: parseFloat(
        cotizacion.descuento_total_regalos || 0
      ),
      total_descuentos: parseFloat(
        (cotizacion.descuento_total_accesorios || 0) +
          (cotizacion.descuento_total_regalos || 0)
      ),
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

// ✅ PUT para actualizar ambos descuentos
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const {
      descuento_total_accesorios,
      descuento_total_regalos,
    } = await req.json();

    // ✅ Validar que la cotización exista
    const [current] = await db.query(
      `SELECT id FROM cotizacionesagenda WHERE id = ?`,
      [id]
    );

    if (!current || current.length === 0) {
      return NextResponse.json(
        { message: "Cotización no encontrada" },
        { status: 404 }
      );
    }

    // ✅ Validar que los descuentos sean válidos
    if (
      (descuento_total_accesorios !== undefined &&
        descuento_total_accesorios < 0) ||
      (descuento_total_regalos !== undefined && descuento_total_regalos < 0)
    ) {
      return NextResponse.json(
        { message: "Los descuentos no pueden ser negativos" },
        { status: 400 }
      );
    }

    // ✅ Preparar valores
    const desc_accesorios =
      descuento_total_accesorios !== undefined
        ? parseFloat(descuento_total_accesorios)
        : null;
    const desc_regalos =
      descuento_total_regalos !== undefined
        ? parseFloat(descuento_total_regalos)
        : null;

    // ✅ Actualizar registro
    let sql = "UPDATE cotizacionesagenda SET updated_at = CURRENT_TIMESTAMP";
    const params = [];

    if (desc_accesorios !== null) {
      sql += ", descuento_total_accesorios = ?";
      params.push(desc_accesorios);
    }

    if (desc_regalos !== null) {
      sql += ", descuento_total_regalos = ?";
      params.push(desc_regalos);
    }

    sql += " WHERE id = ?";
    params.push(id);

    const [result] = await db.query(sql, params);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Error al actualizar" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Descuentos actualizados",
      id,
      descuento_total_accesorios: desc_accesorios,
      descuento_total_regalos: desc_regalos,
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}