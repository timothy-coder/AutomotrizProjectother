// ============================================
// API DE DOCUMENTOS - ID
// archivo: app/api/documentos/[id]/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener un documento por ID
// ============================================
export async function GET(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de documento inválido" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      "SELECT * FROM documentos WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Documento no encontrado" },
        { status: 404 }
      );
    }

    // Obtener preguntas del documento
    const [preguntas] = await db.query(
      "SELECT * FROM documento_preguntas WHERE documento_id = ? ORDER BY orden ASC",
      [id]
    );

    return NextResponse.json({
      ...rows[0],
      preguntas,
      total_preguntas: preguntas.length,
    });
  } catch (error) {
    console.error("GET /api/documentos/[id] error:", error);
    return NextResponse.json(
      { message: "Error al obtener documento", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// PUT: Actualizar documento
// ============================================
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const {
      nombre,
      descripcion,
      es_digital,
      ruta_archivo,
      tipo_archivo,
      tamaño_kb,
    } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de documento inválido" },
        { status: 400 }
      );
    }

    // Validaciones
    if (!nombre || nombre.trim() === "") {
      return NextResponse.json(
        { message: "El nombre del documento es obligatorio" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id FROM documentos WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Documento no encontrado" },
        { status: 404 }
      );
    }

    // Verificar que no exista otro con el mismo nombre
    const [duplicate] = await db.query(
      "SELECT id FROM documentos WHERE nombre = ? AND id != ?",
      [nombre.trim(), id]
    );

    if (duplicate.length > 0) {
      return NextResponse.json(
        { message: "Ya existe otro documento con este nombre" },
        { status: 409 }
      );
    }

    await db.query(
      `UPDATE documentos 
      SET nombre = ?, descripcion = ?, es_digital = ?, ruta_archivo = ?, 
          tipo_archivo = ?, tamaño_kb = ?
      WHERE id = ?`,
      [
        nombre.trim(),
        descripcion || null,
        es_digital !== undefined ? es_digital : true,
        ruta_archivo || null,
        tipo_archivo || null,
        tamaño_kb || null,
        id,
      ]
    );

    return NextResponse.json({
      message: "Documento actualizado exitosamente",
      id,
    });
  } catch (error) {
    console.error("PUT /api/documentos/[id] error:", error);
    return NextResponse.json(
      { message: "Error al actualizar documento", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar documento
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de documento inválido" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id, nombre FROM documentos WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Documento no encontrado" },
        { status: 404 }
      );
    }

    // Verificar si hay respuestas del usuario
    const [respuestas] = await db.query(
      "SELECT COUNT(*) as count FROM documento_respuestas_usuario WHERE documento_pregunta_id IN (SELECT id FROM documento_preguntas WHERE documento_id = ?)",
      [id]
    );

    if (respuestas[0]?.count > 0) {
      return NextResponse.json(
        {
          message: `No se puede eliminar. Existen ${respuestas[0].count} respuesta(s) de usuarios`,
        },
        { status: 409 }
      );
    }

    // Eliminar preguntas asociadas (cascada)
    await db.query(
      "DELETE FROM documento_preguntas WHERE documento_id = ?",
      [id]
    );

    await db.query("DELETE FROM documentos WHERE id = ?", [id]);

    return NextResponse.json({
      message: "Documento eliminado exitosamente",
      id,
      nombre: existing[0].nombre,
    });
  } catch (error) {
    console.error("DELETE /api/documentos/[id] error:", error);
    return NextResponse.json(
      { message: "Error al eliminar documento", error: error.message },
      { status: 500 }
    );
  }
}