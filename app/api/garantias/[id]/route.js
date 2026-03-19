// ============================================
// API DE GARANTÍAS - ID
// archivo: app/api/garantias/[id]/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener una garantía por ID
// ============================================
export async function GET(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de garantía inválido" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      "SELECT * FROM garantias WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Garantía no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("GET /api/garantias/[id] error:", error);
    return NextResponse.json(
      { message: "Error al obtener garantía", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// PUT: Actualizar garantía
// ============================================
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const {
      nombre,
      duracion_meses,
      duracion_kilometraje,
      cobertura,
      exclusiones,
      costo_adicional,
    } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de garantía inválido" },
        { status: 400 }
      );
    }

    // Validaciones
    if (!nombre || nombre.trim() === "") {
      return NextResponse.json(
        { message: "El nombre de la garantía es obligatorio" },
        { status: 400 }
      );
    }

    if (!duracion_meses && !duracion_kilometraje) {
      return NextResponse.json(
        { message: "Debe especificar al menos una duración (meses o kilometraje)" },
        { status: 400 }
      );
    }

    if (!cobertura || cobertura.trim() === "") {
      return NextResponse.json(
        { message: "La descripción de cobertura es obligatoria" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id FROM garantias WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Garantía no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que no exista otro con el mismo nombre
    const [duplicate] = await db.query(
      "SELECT id FROM garantias WHERE nombre = ? AND id != ?",
      [nombre.trim(), id]
    );

    if (duplicate.length > 0) {
      return NextResponse.json(
        { message: "Ya existe otra garantía con este nombre" },
        { status: 409 }
      );
    }

    await db.query(
      `UPDATE garantias 
      SET nombre = ?, duracion_meses = ?, duracion_kilometraje = ?, 
          cobertura = ?, exclusiones = ?, costo_adicional = ?
      WHERE id = ?`,
      [
        nombre.trim(),
        duracion_meses || null,
        duracion_kilometraje || null,
        cobertura.trim(),
        exclusiones || null,
        costo_adicional || null,
        id,
      ]
    );

    return NextResponse.json({
      message: "Garantía actualizada exitosamente",
      id,
    });
  } catch (error) {
    console.error("PUT /api/garantias/[id] error:", error);
    return NextResponse.json(
      { message: "Error al actualizar garantía", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar garantía
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de garantía inválido" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id, nombre FROM garantias WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Garantía no encontrada" },
        { status: 404 }
      );
    }

    // Verificar si está siendo usada en otras tablas
    // Si creas una tabla de relación modelo-garantias, verifica aquí
    const [modeloGarantias] = await db.query(
      "SELECT COUNT(*) as count FROM modelo_garantias WHERE garantia_id = ?",
      [id]
    );

    if (modeloGarantias[0]?.count > 0) {
      return NextResponse.json(
        {
          message: `No se puede eliminar. Esta garantía está siendo usada en ${modeloGarantias[0].count} modelo(s)`,
        },
        { status: 409 }
      );
    }

    await db.query("DELETE FROM garantias WHERE id = ?", [id]);

    return NextResponse.json({
      message: "Garantía eliminada exitosamente",
      id,
      nombre: existing[0].nombre,
    });
  } catch (error) {
    console.error("DELETE /api/garantias/[id] error:", error);
    return NextResponse.json(
      { message: "Error al eliminar garantía", error: error.message },
      { status: 500 }
    );
  }
}