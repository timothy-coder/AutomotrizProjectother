import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const [rows] = await db.query(
      `SELECT descuento_total_accesorios FROM cotizacionesagenda WHERE id = ?`,
      [id]
    );

    if (!rows || rows.length === 0) {
      return NextResponse.json(
        { message: "Cotización no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id,
      descuento_total_accesorios: parseFloat(
        rows[0].descuento_total_accesorios || 0
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

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { descuento_total_accesorios } = await req.json();

    if (descuento_total_accesorios === undefined) {
      return NextResponse.json(
        { message: "descuento_total_accesorios es requerido" },
        { status: 400 }
      );
    }

    if (descuento_total_accesorios < 0) {
      return NextResponse.json(
        { message: "El descuento no puede ser negativo" },
        { status: 400 }
      );
    }

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

    const [result] = await db.query(
      `UPDATE cotizacionesagenda 
       SET descuento_total_accesorios = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [parseFloat(descuento_total_accesorios), id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Error al actualizar" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Descuento de accesorios actualizado",
      id,
      descuento_total_accesorios: parseFloat(descuento_total_accesorios),
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}