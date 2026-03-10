import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* =========================
   GET: listar suborigenes
   ?origen_id=1
========================= */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const origen_id = searchParams.get("origen_id");

    let query = `
      SELECT
        s.id,
        s.origen_id,
        s.name,
        s.is_active,
        s.created_at,
        o.name AS origen_name
      FROM suborigenes_citas s
      INNER JOIN origenes_citas o ON o.id = s.origen_id
    `;

    const params = [];

    if (origen_id) {
      query += ` WHERE s.origen_id = ?`;
      params.push(origen_id);
    }

    query += ` ORDER BY o.name ASC, s.name ASC`;

    const [rows] = await db.query(query, params);

    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al listar suborígenes" },
      { status: 500 }
    );
  }
}

/* =========================
   POST: crear suborigen
========================= */
export async function POST(req) {
  try {
    const body = await req.json();

    const origen_id = Number(body.origen_id);
    const name = (body.name || "").trim();
    const is_active = body.is_active ?? 1;

    if (!origen_id || !name) {
      return NextResponse.json(
        { message: "origen_id y name son obligatorios" },
        { status: 400 }
      );
    }

    const [origen] = await db.query(
      `SELECT id FROM origenes_citas WHERE id = ? LIMIT 1`,
      [origen_id]
    );

    if (!origen.length) {
      return NextResponse.json(
        { message: "El origen no existe" },
        { status: 404 }
      );
    }

    const [dup] = await db.query(
      `
      SELECT id
      FROM suborigenes_citas
      WHERE origen_id = ? AND name = ?
      LIMIT 1
      `,
      [origen_id, name]
    );

    if (dup.length > 0) {
      return NextResponse.json(
        { message: "Ya existe un suborigen con ese nombre para este origen" },
        { status: 409 }
      );
    }

    const [result] = await db.query(
      `
      INSERT INTO suborigenes_citas (origen_id, name, is_active)
      VALUES (?, ?, ?)
      `,
      [origen_id, name, is_active ? 1 : 0]
    );

    return NextResponse.json(
      {
        message: "Suborigen creado",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al crear suborigen" },
      { status: 500 }
    );
  }
}