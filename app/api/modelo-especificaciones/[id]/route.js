// ============================================
// API DE ESPECIFICACIONES DE MODELO - ID
// archivo: app/api/modelo-especificaciones/[id]/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = params;

    const [rows] = await db.query(
      `SELECT 
        me.*,
        m.name as marca,
        mo.name as modelo,
        e.nombre as especificacion_nombre,
        e.tipo_dato,
        e.opciones
      FROM modelo_especificaciones me
      INNER JOIN marcas m ON m.id = me.marca_id
      INNER JOIN modelos mo ON mo.id = me.modelo_id
      INNER JOIN especificaciones e ON e.id = me.especificacion_id
      WHERE me.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Especificación no encontrada" },
        { status: 404 }
      );
    }

    const especificacion = rows[0];
    especificacion.opciones = especificacion.opciones 
      ? JSON.parse(especificacion.opciones) 
      : null;

    return NextResponse.json(especificacion);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const { valor } = await req.json();

    const [result] = await db.query(
      "UPDATE modelo_especificaciones SET valor = ? WHERE id = ?",
      [valor || null, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Especificación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Especificación actualizada" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    const [result] = await db.query(
      "DELETE FROM modelo_especificaciones WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Especificación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Especificación eliminada" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}