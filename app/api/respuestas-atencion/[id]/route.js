// ============================================
// API DE RESPUESTAS - ID
// archivo: app/api/respuestas-atencion/[id]/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = params;

    const [rows] = await db.query(
      `SELECT 
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
      WHERE ra.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Respuesta no encontrada" },
        { status: 404 }
      );
    }

    const respuesta = rows[0];
    respuesta.opciones = respuesta.opciones ? JSON.parse(respuesta.opciones) : null;

    return NextResponse.json(respuesta);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const { respuesta, created_by } = await req.json();

    if (!respuesta || !created_by) {
      return NextResponse.json(
        { message: "Respuesta y created_by son requeridos" },
        { status: 400 }
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

    const [result] = await db.query(
      `UPDATE respuestas_atencion 
       SET respuesta = ?, created_by = ?
       WHERE id = ?`,
      [respuesta, created_by, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Respuesta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Respuesta actualizada" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    const [result] = await db.query(
      "DELETE FROM respuestas_atencion WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Respuesta no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Respuesta eliminada" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}