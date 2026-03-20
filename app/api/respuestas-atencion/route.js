// ============================================
// API DE RESPUESTAS DE ATENCIÓN
// archivo: app/api/respuestas-atencion/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const oportunidad_id = searchParams.get("oportunidad_id");
    const pregunta_id = searchParams.get("pregunta_id");

    let query = `
      SELECT 
        ra.*,
        pa.pregunta,
        pa.tipo_respuesta,
        pa.opciones,
        pa.es_obligatoria,
        u.name as creado_por_nombre,
        o.oportunidad_id,
        c.nombre as cliente_nombre,
        m.name as marca,
        mo.name as modelo
      FROM respuestas_atencion ra
      INNER JOIN preguntas_atencion pa ON pa.id = ra.pregunta_id
      LEFT JOIN usuarios u ON u.id = ra.created_by
      INNER JOIN oportunidades o ON o.id = ra.oportunidad_id
      INNER JOIN clientes c ON c.id = o.cliente_id
      INNER JOIN marcas m ON m.id = o.marca_id
      INNER JOIN modelos mo ON mo.id = o.modelo_id
      WHERE 1=1
    `;
    const params = [];

    if (oportunidad_id) {
      query += " AND ra.oportunidad_id = ?";
      params.push(oportunidad_id);
    }

    if (pregunta_id) {
      query += " AND ra.pregunta_id = ?";
      params.push(pregunta_id);
    }

    query += " ORDER BY pa.orden ASC, ra.created_at DESC";

    const [rows] = await db.query(query, params);

    // Parsear JSON de opciones
    const respuestasFormateadas = rows.map((row) => ({
      ...row,
      opciones: row.opciones ? JSON.parse(row.opciones) : null,
    }));

    return NextResponse.json(respuestasFormateadas);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { oportunidad_id, pregunta_id, respuesta, created_by } =
      await req.json();

    if (!oportunidad_id || !pregunta_id || !created_by) {
      return NextResponse.json(
        { message: "Oportunidad, pregunta y created_by son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que exista la oportunidad
    const [oportunidad] = await db.query(
      "SELECT id FROM oportunidades WHERE id = ?",
      [oportunidad_id]
    );

    if (oportunidad.length === 0) {
      return NextResponse.json(
        { message: "Oportunidad no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que exista la pregunta
    const [pregunta] = await db.query(
      "SELECT id FROM preguntas_atencion WHERE id = ?",
      [pregunta_id]
    );

    if (pregunta.length === 0) {
      return NextResponse.json(
        { message: "Pregunta no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que exista el usuario
    const [usuario] = await db.query(
      "SELECT id FROM usuarios WHERE id = ?",
      [created_by]
    );

    if (usuario.length === 0) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Insertar o actualizar respuesta
    const [result] = await db.query(
      `INSERT INTO respuestas_atencion (oportunidad_id, pregunta_id, respuesta, created_by)
       VALUES(?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE respuesta = ?, updated_at = NOW()`,
      [oportunidad_id, pregunta_id, respuesta, created_by, respuesta]
    );

    return NextResponse.json(
      { message: "Respuesta guardada", id: result.insertId },
      { status: 201 }
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}