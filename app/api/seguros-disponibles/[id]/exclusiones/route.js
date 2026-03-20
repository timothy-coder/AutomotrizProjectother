// ============================================
// API DE EXCLUSIONES DE SEGURO
// archivo: app/api/seguros-disponibles/[id]/exclusiones/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener exclusiones de un seguro
// ============================================
export async function GET(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de seguro inválido" },
        { status: 400 }
      );
    }

    // Verificar que el seguro existe
    const [seguro] = await db.query(
      "SELECT id, nombre_paquete FROM seguros_disponibles WHERE id = ?",
      [id]
    );

    if (seguro.length === 0) {
      return NextResponse.json(
        { message: "Seguro no encontrado" },
        { status: 404 }
      );
    }

    const [exclusiones] = await db.query(
      `SELECT id, descripcion_exclusion, orden
       FROM seguro_exclusiones
       WHERE seguro_id = ?
       ORDER BY orden ASC`,
      [id]
    );

    return NextResponse.json({
      seguro_id: id,
      seguro_nombre: seguro[0].nombre_paquete,
      exclusiones,
      total_exclusiones: exclusiones.length,
    });
  } catch (error) {
    console.error("GET /api/seguros-disponibles/[id]/exclusiones error:", error);
    return NextResponse.json(
      { message: "Error al obtener exclusiones", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Agregar exclusión a un seguro
// ============================================
export async function POST(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { descripcion_exclusion, orden } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de seguro inválido" },
        { status: 400 }
      );
    }

    if (!descripcion_exclusion || descripcion_exclusion.trim() === "") {
      return NextResponse.json(
        { message: "La descripción de la exclusión es obligatoria" },
        { status: 400 }
      );
    }

    // Verificar que el seguro existe
    const [seguro] = await db.query(
      "SELECT id FROM seguros_disponibles WHERE id = ?",
      [id]
    );

    if (seguro.length === 0) {
      return NextResponse.json(
        { message: "Seguro no encontrado" },
        { status: 404 }
      );
    }

    const [result] = await db.query(
      `INSERT INTO seguro_exclusiones 
      (seguro_id, descripcion_exclusion, orden) 
      VALUES (?, ?, ?)`,
      [id, descripcion_exclusion.trim(), orden || 1]
    );

    return NextResponse.json(
      {
        message: "Exclusión agregada exitosamente",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/seguros-disponibles/[id]/exclusiones error:", error);
    return NextResponse.json(
      { message: "Error al agregar exclusión", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar una exclusión
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { exclusion_id } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de seguro inválido" },
        { status: 400 }
      );
    }

    if (!exclusion_id || isNaN(exclusion_id)) {
      return NextResponse.json(
        { message: "ID de exclusión inválido" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      "DELETE FROM seguro_exclusiones WHERE id = ? AND seguro_id = ?",
      [exclusion_id, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Exclusión no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Exclusión eliminada exitosamente",
      exclusion_id,
    });
  } catch (error) {
    console.error("DELETE /api/seguros-disponibles/[id]/exclusiones error:", error);
    return NextResponse.json(
      { message: "Error al eliminar exclusión", error: error.message },
      { status: 500 }
    );
  }
}