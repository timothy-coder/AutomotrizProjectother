// ============================================
// API DE COBERTURAS DE SEGURO
// archivo: app/api/seguros-disponibles/[id]/coberturas/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener coberturas de un seguro
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

    const [coberturas] = await db.query(
      `SELECT id, nombre_cobertura, descripcion, limite_cobertura, deducible, orden
       FROM seguro_coberturas
       WHERE seguro_id = ?
       ORDER BY orden ASC`,
      [id]
    );

    return NextResponse.json({
      seguro_id: id,
      seguro_nombre: seguro[0].nombre_paquete,
      coberturas,
      total_coberturas: coberturas.length,
    });
  } catch (error) {
    console.error("GET /api/seguros-disponibles/[id]/coberturas error:", error);
    return NextResponse.json(
      { message: "Error al obtener coberturas", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Agregar cobertura a un seguro
// ============================================
export async function POST(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { nombre_cobertura, descripcion, limite_cobertura, deducible, orden } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de seguro inválido" },
        { status: 400 }
      );
    }

    if (!nombre_cobertura || nombre_cobertura.trim() === "") {
      return NextResponse.json(
        { message: "El nombre de la cobertura es obligatorio" },
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
      `INSERT INTO seguro_coberturas 
      (seguro_id, nombre_cobertura, descripcion, limite_cobertura, deducible, orden) 
      VALUES (?, ?, ?, ?, ?, ?)`,
      [
        id,
        nombre_cobertura.trim(),
        descripcion || null,
        limite_cobertura || null,
        deducible || null,
        orden || 1,
      ]
    );

    return NextResponse.json(
      {
        message: "Cobertura agregada exitosamente",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/seguros-disponibles/[id]/coberturas error:", error);
    return NextResponse.json(
      { message: "Error al agregar cobertura", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar una cobertura
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { cobertura_id } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de seguro inválido" },
        { status: 400 }
      );
    }

    if (!cobertura_id || isNaN(cobertura_id)) {
      return NextResponse.json(
        { message: "ID de cobertura inválido" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      "DELETE FROM seguro_coberturas WHERE id = ? AND seguro_id = ?",
      [cobertura_id, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Cobertura no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Cobertura eliminada exitosamente",
      cobertura_id,
    });
  } catch (error) {
    console.error("DELETE /api/seguros-disponibles/[id]/coberturas error:", error);
    return NextResponse.json(
      { message: "Error al eliminar cobertura", error: error.message },
      { status: 500 }
    );
  }
}