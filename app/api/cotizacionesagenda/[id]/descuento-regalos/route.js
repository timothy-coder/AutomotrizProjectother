import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const [rows] = await db.query(
      `SELECT descuento_total_regalos FROM cotizacionesagenda WHERE id = ?`,
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
      descuento_total_regalos: parseFloat(rows[0].descuento_total_regalos || 0),
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
    const { descuento_total_regalos } = await req.json();

    if (descuento_total_regalos === undefined) {
      return NextResponse.json(
        { message: "descuento_total_regalos es requerido" },
        { status: 400 }
      );
    }

    if (descuento_total_regalos < 0) {
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
       SET descuento_total_regalos = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [parseFloat(descuento_total_regalos), id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Error al actualizar" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Descuento de regalos actualizado",
      id,
      descuento_total_regalos: parseFloat(descuento_total_regalos),
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}