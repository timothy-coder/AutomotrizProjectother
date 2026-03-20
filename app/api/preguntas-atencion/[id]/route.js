// ============================================
// API DE PREGUNTAS - ID
// archivo: app/api/preguntas-atencion/[id]/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const [rows] = await db.query(
      "SELECT * FROM preguntas_atencion WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Pregunta no encontrada" },
        { status: 404 }
      );
    }

    const pregunta = { ...rows[0] };
    if (pregunta.opciones) {
      try {
        pregunta.opciones = JSON.parse(pregunta.opciones);
      } catch {
        pregunta.opciones = null;
      }
    } else {
      pregunta.opciones = null;
    }

    return NextResponse.json(pregunta);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { pregunta, tipo_respuesta, opciones, es_obligatoria, orden, es_activa } =
      await req.json();

    if (!pregunta || !tipo_respuesta) {
      return NextResponse.json(
        { message: "Pregunta y tipo de respuesta son requeridos" },
        { status: 400 }
      );
    }

    let opcionesJSON = null;
    if (tipo_respuesta === "opcion_multiple" && opciones !== undefined && opciones !== null) {
      try {
        if (Array.isArray(opciones)) {
          opcionesJSON = JSON.stringify(opciones);
        } else if (typeof opciones === "string") {
          const parsed = JSON.parse(opciones);
          opcionesJSON = JSON.stringify(parsed);
        }
      } catch {
        return NextResponse.json(
          { message: "Las opciones deben ser un JSON válido" },
          { status: 400 }
        );
      }
    }

    const [result] = await db.query(
      `UPDATE preguntas_atencion 
       SET pregunta = ?, tipo_respuesta = ?, opciones = ?, es_obligatoria = ?, orden = ?, es_activa = ?
       WHERE id = ?`,
      [pregunta, tipo_respuesta, opcionesJSON, es_obligatoria, orden, es_activa, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Pregunta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Pregunta actualizada" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    // Verificar si la pregunta está siendo usada
    const [respuestas] = await db.query(
      "SELECT COUNT(*) as count FROM respuestas_atencion WHERE pregunta_id = ?",
      [id]
    );

    if (respuestas[0].count > 0) {
      return NextResponse.json(
        {
          message: `No se puede eliminar. La pregunta está siendo usada en ${respuestas[0].count} respuesta(s)`,
        },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      "DELETE FROM preguntas_atencion WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Pregunta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Pregunta eliminada" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}