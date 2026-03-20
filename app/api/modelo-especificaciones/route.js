// ============================================
// API DE ESPECIFICACIONES DE MODELO Y MARCA
// archivo: app/api/modelo-especificaciones/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const marca_id = searchParams.get("marca_id");
    const modelo_id = searchParams.get("modelo_id");

    let query = `
      SELECT 
        me.*,
        m.name as marca,
        mo.name as modelo,
        e.nombre as especificacion_nombre,
        e.tipo_dato,
        e.opciones
      FROM modelo_especificaciones me
      INNER JOIN marcas m ON m.id = me.marca_id
      INNER JOIN modelos mo ON mo.id = me.modelo_id
      INNER JOIN especificaciones e ON e.id = me.especificacion_id
      WHERE 1=1
    `;
    const params = [];

    if (marca_id) {
      query += " AND me.marca_id = ?";
      params.push(marca_id);
    }

    if (modelo_id) {
      query += " AND me.modelo_id = ?";
      params.push(modelo_id);
    }

    query += " ORDER BY e.nombre ASC";

    const [rows] = await db.query(query, params);

    // Parsear opciones JSON
    const especificacionesFormateadas = rows.map((row) => ({
      ...row,
      opciones: row.opciones ? JSON.parse(row.opciones) : null,
    }));

    return NextResponse.json(especificacionesFormateadas);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { marca_id, modelo_id, especificacion_id, valor } = await req.json();

    if (!marca_id || !modelo_id || !especificacion_id) {
      return NextResponse.json(
        { message: "Marca, modelo y especificación son requeridos" },
        { status: 400 }
      );
    }

    // Verificar existencia
    const [marca] = await db.query("SELECT id FROM marcas WHERE id = ?", [marca_id]);
    const [modelo] = await db.query("SELECT id FROM modelos WHERE id = ?", [modelo_id]);
    const [especificacion] = await db.query("SELECT id FROM especificaciones WHERE id = ?", [especificacion_id]);

    if (!marca.length || !modelo.length || !especificacion.length) {
      return NextResponse.json(
        { message: "Marca, modelo o especificación no encontrada" },
        { status: 404 }
      );
    }

    const [result] = await db.query(
      `INSERT INTO modelo_especificaciones (marca_id, modelo_id, especificacion_id, valor)
       VALUES(?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE valor = ?`,
      [marca_id, modelo_id, especificacion_id, valor || null, valor || null]
    );

    return NextResponse.json(
      { message: "Especificación guardada", id: result.insertId },
      { status: 201 }
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}