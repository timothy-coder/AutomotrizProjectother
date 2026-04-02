import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    // Verificar que la oportunidad existe
    const [exists] = await db.query(
      "SELECT id FROM oportunidades_oportunidades WHERE id = ?",
      [id]
    );

    if (!exists.length) {
      return NextResponse.json(
        { message: "Oportunidad no encontrada" },
        { status: 404 }
      );
    }

    // Contar total
    const [countResult] = await db.query(
      "SELECT COUNT(*) as total FROM oportunidades_detalles WHERE oportunidad_padre_id = ?",
      [id]
    );
    const total = countResult[0].total;

    const [rows] = await db.query(
      `SELECT * FROM oportunidades_detalles 
       WHERE oportunidad_padre_id = ? 
       ORDER BY created_at DESC 
       LIMIT ? OFFSET ?`,
      [id, limit, offset]
    );

    return NextResponse.json({
      data: rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const { fecha_agenda, hora_agenda } = await req.json();

    // Verificar que la oportunidad existe
    const [exists] = await db.query(
      "SELECT id FROM oportunidades_oportunidades WHERE id = ?",
      [id]
    );

    if (!exists.length) {
      return NextResponse.json(
        { message: "Oportunidad no encontrada" },
        { status: 404 }
      );
    }

    if (!fecha_agenda || !hora_agenda) {
      return NextResponse.json(
        { message: "fecha_agenda y hora_agenda son requeridos" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      `INSERT INTO oportunidades_detalles 
       (oportunidad_padre_id, fecha_agenda, hora_agenda) 
       VALUES (?, ?, ?)`,
      [id, fecha_agenda, hora_agenda]
    );

    return NextResponse.json(
      {
        message: "Detalle creado",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}