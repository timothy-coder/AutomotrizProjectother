// ============================================
// API DE REQUISITOS DE SEGURO
// archivo: app/api/seguros-disponibles/[id]/requisitos/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener requisitos de un seguro
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

    const [requisitos] = await db.query(
      `SELECT id, descripcion_requisito, orden
       FROM seguro_requisitos
       WHERE seguro_id = ?
       ORDER BY orden ASC`,
      [id]
    );

    return NextResponse.json({
      seguro_id: id,
      seguro_nombre: seguro[0].nombre_paquete,
      requisitos,
      total_requisitos: requisitos.length,
    });
  } catch (error) {
    console.error("GET /api/seguros-disponibles/[id]/requisitos error:", error);
    return NextResponse.json(
      { message: "Error al obtener requisitos", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Agregar requisito a un seguro
// ============================================
export async function POST(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { descripcion_requisito, orden } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de seguro inválido" },
        { status: 400 }
      );
    }

    if (!descripcion_requisito || descripcion_requisito.trim() === "") {
      return NextResponse.json(
        { message: "La descripción del requisito es obligatoria" },
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
      `INSERT INTO seguro_requisitos 
      (seguro_id, descripcion_requisito, orden) 
      VALUES (?, ?, ?)`,
      [id, descripcion_requisito.trim(), orden || 1]
    );

    return NextResponse.json(
      {
        message: "Requisito agregado exitosamente",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/seguros-disponibles/[id]/requisitos error:", error);
    return NextResponse.json(
      { message: "Error al agregar requisito", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar un requisito
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { requisito_id } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de seguro inválido" },
        { status: 400 }
      );
    }

    if (!requisito_id || isNaN(requisito_id)) {
      return NextResponse.json(
        { message: "ID de requisito inválido" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      "DELETE FROM seguro_requisitos WHERE id = ? AND seguro_id = ?",
      [requisito_id, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Requisito no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Requisito eliminado exitosamente",
      requisito_id,
    });
  } catch (error) {
    console.error("DELETE /api/seguros-disponibles/[id]/requisitos error:", error);
    return NextResponse.json(
      { message: "Error al eliminar requisito", error: error.message },
      { status: 500 }
    );
  }
}