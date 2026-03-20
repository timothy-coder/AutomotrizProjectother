// ============================================
// API DE PREGUNTAS DE ATENCIÓN
// archivo: app/api/preguntas-atencion/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const activa = searchParams.get("activa");
    const search = searchParams.get("search");

    let query = "SELECT * FROM preguntas_atencion WHERE 1=1";
    const params = [];

    if (activa !== null && activa !== undefined) {
      query += " AND es_activa = ?";
      params.push(activa === "true" || activa === "1" ? 1 : 0);
    } else {
      query += " AND es_activa = 1";
    }

    if (search) {
      query += " AND pregunta LIKE ?";
      params.push(`%${search}%`);
    }

    query += " ORDER BY orden ASC";

    const [rows] = await db.query(query, params);

    // Parsear JSON de opciones de forma segura para evitar romper todo el listado.
    const preguntasFormateadas = rows.map((row) => {
      let opcionesParseadas = null;

      if (row.opciones) {
        try {
          const trimmed = String(row.opciones).trim();
          if (trimmed && trimmed !== "null") {
            opcionesParseadas = JSON.parse(trimmed);
          }
        } catch {
          opcionesParseadas = null;
        }
      }

      return {
        ...row,
        opciones: opcionesParseadas,
      };
    });

    return NextResponse.json(preguntasFormateadas);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const {
      pregunta,
      tipo_respuesta,
      opciones,
      es_obligatoria,
      orden,
      es_activa,
    } = await req.json();

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
        } else {
          return NextResponse.json(
            { message: "Las opciones deben ser un arreglo o un JSON válido" },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { message: "Las opciones deben ser un JSON válido" },
          { status: 400 }
        );
      }
    }

    const [result] = await db.query(
      `INSERT INTO preguntas_atencion 
       (pregunta, tipo_respuesta, opciones, es_obligatoria, orden, es_activa) 
       VALUES(?, ?, ?, ?, ?, ?)`,
      [
        pregunta,
        tipo_respuesta,
        opcionesJSON,
        es_obligatoria !== undefined ? es_obligatoria : 1,
        orden || 0,
        es_activa !== undefined ? es_activa : 1,
      ]
    );

    return NextResponse.json(
      { message: "Pregunta creada", id: result.insertId },
      { status: 201 }
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}