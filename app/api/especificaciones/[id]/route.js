// ============================================
// API DE ESPECIFICACIONES - ID
// archivo: app/api/especificaciones/[id]/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener una especificación por ID
// ============================================
export async function GET(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de especificación inválido" },
        { status: 400 }
      );
    }

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

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("GET /api/especificaciones/[id] error:", error);
    return NextResponse.json(
      { message: "Error al obtener especificación", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// PUT: Actualizar especificación
// ============================================
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { nombre, descripcion } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de especificación inválido" },
        { status: 400 }
      );
    }

    // Validaciones
    if (!nombre || nombre.trim() === "") {
      return NextResponse.json(
        { message: "El nombre de la especificación es obligatorio" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id FROM especificaciones WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Especificación no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que no exista otro con el mismo nombre
    const [duplicate] = await db.query(
      "SELECT id FROM especificaciones WHERE nombre = ? AND id != ?",
      [nombre.trim(), id]
    );

    if (duplicate.length > 0) {
      return NextResponse.json(
        { message: "Ya existe otra especificación con este nombre" },
        { status: 409 }
      );
    }

    await db.query(
      "UPDATE especificaciones SET nombre = ?, descripcion = ? WHERE id = ?",
      [nombre.trim(), descripcion || null, id]
    );

    return NextResponse.json({
      message: "Especificación actualizada exitosamente",
      id,
      nombre,
      descripcion,
    });
  } catch (error) {
    console.error("PUT /api/especificaciones/[id] error:", error);
    return NextResponse.json(
      { message: "Error al actualizar especificación", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar especificación
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de especificación inválido" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id, nombre FROM especificaciones WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Especificación no encontrada" },
        { status: 404 }
      );
    }

    // Verificar si está siendo usada en otras tablas
    // Aquí puedes agregar más verificaciones según tus necesidades
    // Por ejemplo, si hay una tabla que relacione especificaciones con modelos

    await db.query("DELETE FROM especificaciones WHERE id = ?", [id]);

    return NextResponse.json({
      message: "Especificación eliminada exitosamente",
      id,
      nombre: existing[0].nombre,
    });
  } catch (error) {
    console.error("DELETE /api/especificaciones/[id] error:", error);
    return NextResponse.json(
      { message: "Error al eliminar especificación", error: error.message },
      { status: 500 }
    );
  }
}