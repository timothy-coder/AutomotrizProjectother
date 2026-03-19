// ============================================
// API DE PREGUNTAS DE DOCUMENTO
// archivo: app/api/documentos/[id]/preguntas/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener preguntas de un documento
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

    // Verificar que el documento existe
    const [documento] = await db.query(
      "SELECT id, nombre FROM documentos WHERE id = ?",
      [id]
    );

    if (documento.length === 0) {
      return NextResponse.json(
        { message: "Documento no encontrado" },
        { status: 404 }
      );
    }

    const [preguntas] = await db.query(
      `SELECT * FROM documento_preguntas 
       WHERE documento_id = ? 
       ORDER BY orden ASC`,
      [id]
    );

    return NextResponse.json({
      documento_id: id,
      documento_nombre: documento[0].nombre,
      preguntas,
      total_preguntas: preguntas.length,
    });
  } catch (error) {
    console.error("GET /api/documentos/[id]/preguntas error:", error);
    return NextResponse.json(
      { message: "Error al obtener preguntas", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Crear pregunta en un documento
// ============================================
export async function POST(req, { params }) {
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
        { message: "ID de documento inválido" },
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

    // Verificar que el documento existe
    const [documento] = await db.query(
      "SELECT id FROM documentos WHERE id = ?",
      [id]
    );

    if (documento.length === 0) {
      return NextResponse.json(
        { message: "Documento no encontrado" },
        { status: 404 }
      );
    }

    // Obtener el máximo orden si no se especifica
    let ordenFinal = orden;
    if (!ordenFinal) {
      const [maxOrden] = await db.query(
        "SELECT MAX(orden) as max_orden FROM documento_preguntas WHERE documento_id = ?",
        [id]
      );
      ordenFinal = (maxOrden[0]?.max_orden || 0) + 1;
    }

    const [result] = await db.query(
      `INSERT INTO documento_preguntas 
      (documento_id, pregunta, respuesta, orden, es_obligatoria, tipo_respuesta, 
       opciones_json, validacion_regex, longitud_minima, longitud_maxima, 
       valor_por_defecto, ayuda, mostrar_condicionalmente, condicion_json) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        pregunta.trim(),
        respuesta || null,
        ordenFinal,
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
      ]
    );

    return NextResponse.json(
      {
        message: "Pregunta creada exitosamente",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/documentos/[id]/preguntas error:", error);
    return NextResponse.json(
      { message: "Error al crear pregunta", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// PUT: Actualizar orden de preguntas (reordenar)
// ============================================
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { preguntas_orden } = body; // Array de {id, orden}

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de documento inválido" },
        { status: 400 }
      );
    }

    if (!Array.isArray(preguntas_orden)) {
      return NextResponse.json(
        { message: "preguntas_orden debe ser un array" },
        { status: 400 }
      );
    }

    // Verificar que el documento existe
    const [documento] = await db.query(
      "SELECT id FROM documentos WHERE id = ?",
      [id]
    );

    if (documento.length === 0) {
      return NextResponse.json(
        { message: "Documento no encontrado" },
        { status: 404 }
      );
    }

    // Actualizar orden de cada pregunta
    for (const item of preguntas_orden) {
      await db.query(
        "UPDATE documento_preguntas SET orden = ? WHERE id = ? AND documento_id = ?",
        [item.orden, item.id, id]
      );
    }

    return NextResponse.json({
      message: "Preguntas reordenadas exitosamente",
    });
  } catch (error) {
    console.error("PUT /api/documentos/[id]/preguntas error:", error);
    return NextResponse.json(
      { message: "Error al reordenar preguntas", error: error.message },
      { status: 500 }
    );
  }
}