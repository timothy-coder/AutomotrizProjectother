// ============================================
// API DE TIPOS DE PROMOCIONES - ID
// archivo: app/api/tipos-promociones/[id]/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener un tipo de promoción por ID
// ============================================
export async function GET(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de tipo de promoción inválido" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      "SELECT * FROM tipos_promociones WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Tipo de promoción no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("GET /api/tipos-promociones/[id] error:", error);
    return NextResponse.json(
      { message: "Error al obtener tipo de promoción", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// PUT: Actualizar tipo de promoción
// ============================================
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { nombre, descripcion } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de tipo de promoción inválido" },
        { status: 400 }
      );
    }

    // Validaciones
    if (!nombre || nombre.trim() === "") {
      return NextResponse.json(
        { message: "El nombre del tipo de promoción es obligatorio" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id FROM tipos_promociones WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Tipo de promoción no encontrado" },
        { status: 404 }
      );
    }

    // Verificar que no exista otro con el mismo nombre
    const [duplicate] = await db.query(
      "SELECT id FROM tipos_promociones WHERE nombre = ? AND id != ?",
      [nombre.trim(), id]
    );

    if (duplicate.length > 0) {
      return NextResponse.json(
        { message: "Ya existe otro tipo de promoción con este nombre" },
        { status: 409 }
      );
    }

    await db.query(
      "UPDATE tipos_promociones SET nombre = ?, descripcion = ? WHERE id = ?",
      [nombre.trim(), descripcion || null, id]
    );

    return NextResponse.json({
      message: "Tipo de promoción actualizado exitosamente",
      id,
      nombre,
      descripcion,
    });
  } catch (error) {
    console.error("PUT /api/tipos-promociones/[id] error:", error);
    return NextResponse.json(
      { message: "Error al actualizar tipo de promoción", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar tipo de promoción
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de tipo de promoción inválido" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id, nombre FROM tipos_promociones WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Tipo de promoción no encontrado" },
        { status: 404 }
      );
    }

    // Verificar si está siendo usada en promociones
    const [promotions] = await db.query(
      "SELECT COUNT(*) as count FROM promociones WHERE tipos_promociones_id = ?",
      [id]
    );

    if (promotions[0]?.count > 0) {
      return NextResponse.json(
        {
          message: `No se puede eliminar. Este tipo de promoción está siendo usado en ${promotions[0].count} promoción(es)`,
        },
        { status: 409 }
      );
    }

    await db.query("DELETE FROM tipos_promociones WHERE id = ?", [id]);

    return NextResponse.json({
      message: "Tipo de promoción eliminado exitosamente",
      id,
      nombre: existing[0].nombre,
    });
  } catch (error) {
    console.error("DELETE /api/tipos-promociones/[id] error:", error);
    return NextResponse.json(
      { message: "Error al eliminar tipo de promoción", error: error.message },
      { status: 500 }
    );
  }
}