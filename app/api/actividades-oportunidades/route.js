// app/api/actividades-oportunidades/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const oportunidadId = searchParams.get("oportunidad_id");

    if (!oportunidadId) {
      return NextResponse.json(
        { error: "oportunidad_id es requerido" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      `SELECT 
        a.id,
        a.oportunidad_id,
        a.etapasconversion_id,
        a.detalle,
        a.created_by,
        u.fullname as created_by_name,
        a.created_at,
        a.updated_at
      FROM actividades_oportunidades a
      LEFT JOIN usuarios u ON a.created_by = u.id
      WHERE a.oportunidad_id = ?
      ORDER BY a.created_at DESC`,
      [oportunidadId]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { oportunidad_id, etapasconversion_id, detalle, created_by } = body;

    if (!oportunidad_id || !detalle || !created_by) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      `INSERT INTO actividades_oportunidades 
        (oportunidad_id, etapasconversion_id, detalle, created_by) 
      VALUES (?, ?, ?, ?)`,
      [oportunidad_id, etapasconversion_id || null, detalle, created_by]
    );

    return NextResponse.json({
      id: result.insertId,
      message: "Actividad guardada correctamente",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}