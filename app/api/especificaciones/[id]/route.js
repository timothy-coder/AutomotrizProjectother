// ============================================
// API DE ESPECIFICACIONES - ID
// archivo: app/api/especificaciones/[id]/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = params;

    const [rows] = await db.query(
      "SELECT * FROM especificaciones WHERE id = ?",
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
    const { nombre, tipo_dato, opciones } = await req.json();

    if (!nombre) {
      return NextResponse.json(
        { message: "Nombre es requerido" },
        { status: 400 }
      );
    }

    const opcionesJSON =
      tipo_dato === "lista" && opciones
        ? JSON.stringify(opciones)
        : null;

    const [result] = await db.query(
      `UPDATE especificaciones 
       SET nombre = ?, tipo_dato = ?, opciones = ?
       WHERE id = ?`,
      [nombre, tipo_dato || "texto", opcionesJSON, id]
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

    // Verificar si está siendo usada
    const [uso] = await db.query(
      "SELECT COUNT(*) as count FROM modelo_especificaciones WHERE especificacion_id = ?",
      [id]
    );

    if (uso[0].count > 0) {
      return NextResponse.json(
        { message: `No se puede eliminar. Está siendo usada en ${uso[0].count} modelo(s)` },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      "DELETE FROM especificaciones WHERE id = ?",
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