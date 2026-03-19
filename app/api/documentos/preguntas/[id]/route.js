// ============================================
// API DE PREGUNTAS - ID
// archivo: app/api/documentos/preguntas/[id]/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener una pregunta por ID
// ============================================
export async function GET(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de pregunta inválido" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      "SELECT * FROM documento_preguntas WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Pregunta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("GET /api/documentos/preguntas/[id] error:", error);
    return NextResponse.json(
      { message: "Error al obtener pregunta", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// PUT: Actualizar pregunta
// ============================================
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const {
      pregunta,
      respuesta,
      orden,
      es_obligatoria,
      tipo_respuesta,
      opciones_json,
      validacion_regex,
      longitud_minima,
      longitud_maxima,
      valor_por_defecto,
      ayuda,
      mostrar_condicionalmente,
      condicion_json,
    } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de pregunta inválido" },
        { status: 400 }
      );
    }

    // Validaciones
    if (!pregunta || pregunta.trim() === "") {
      return NextResponse.json(
        { message: "La pregunta es obligatoria" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id FROM documento_preguntas WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Pregunta no encontrada" },
        { status: 404 }
      );
    }

    await db.query(
      `UPDATE documento_preguntas 
      SET pregunta = ?, respuesta = ?, orden = ?, es_obligatoria = ?, tipo_respuesta = ?, 
          opciones_json = ?, validacion_regex = ?, longitud_minima = ?, longitud_maxima = ?, 
          valor_por_defecto = ?, ayuda = ?, mostrar_condicionalmente = ?, condicion_json = ?
      WHERE id = ?`,
      [
        pregunta.trim(),
        respuesta || null,
        orden || 1,
        es_obligatoria || false,
        tipo_respuesta || "texto",
        opciones_json ? JSON.stringify(opciones_json) : null,
        validacion_regex || null,
        longitud_minima || null,
        longitud_maxima || null,
        valor_por_defecto || null,
        ayuda || null,
        mostrar_condicionalmente || false,
        condicion_json ? JSON.stringify(condicion_json) : null,
        id,
      ]
    );

    return NextResponse.json({
      message: "Pregunta actualizada exitosamente",
      id,
    });
  } catch (error) {
    console.error("PUT /api/documentos/preguntas/[id] error:", error);
    return NextResponse.json(
      { message: "Error al actualizar pregunta", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar pregunta
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de pregunta inválido" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id, pregunta FROM documento_preguntas WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Pregunta no encontrada" },
        { status: 404 }
      );
    }

    // Verificar si hay respuestas del usuario
    const [respuestas] = await db.query(
      "SELECT COUNT(*) as count FROM documento_respuestas_usuario WHERE documento_pregunta_id = ?",
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

    await db.query("DELETE FROM documento_preguntas WHERE id = ?", [id]);

    return NextResponse.json({
      message: "Pregunta eliminada exitosamente",
      id,
      pregunta: existing[0].pregunta,
    });
  } catch (error) {
    console.error("DELETE /api/documentos/preguntas/[id] error:", error);
    return NextResponse.json(
      { message: "Error al eliminar pregunta", error: error.message },
      { status: 500 }
    );
  }
}