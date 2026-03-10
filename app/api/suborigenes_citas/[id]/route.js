import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* =========================
   GET: obtener uno
========================= */
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const [rows] = await db.query(
      `
      SELECT
        s.id,
        s.origen_id,
        s.name,
        s.is_active,
        s.created_at,
        o.name AS origen_name
      FROM suborigenes_citas s
      INNER JOIN origenes_citas o ON o.id = s.origen_id
      WHERE s.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return NextResponse.json(
        { message: "Suborigen no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al obtener suborigen" },
      { status: 500 }
    );
  }
}

/* =========================
   PUT: actualizar
========================= */
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
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

    const [exists] = await db.query(
      `SELECT id FROM suborigenes_citas WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!exists.length) {
      return NextResponse.json(
        { message: "Suborigen no encontrado" },
        { status: 404 }
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
      WHERE origen_id = ? AND name = ? AND id <> ?
      LIMIT 1
      `,
      [origen_id, name, id]
    );

    if (dup.length > 0) {
      return NextResponse.json(
        { message: "Ya existe otro suborigen con ese nombre para este origen" },
        { status: 409 }
      );
    }

    await db.query(
      `
      UPDATE suborigenes_citas
      SET origen_id = ?, name = ?, is_active = ?
      WHERE id = ?
      `,
      [origen_id, name, is_active ? 1 : 0, id]
    );

    return NextResponse.json({ message: "Suborigen actualizado" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al actualizar suborigen" },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE: eliminar
========================= */
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    const [result] = await db.query(
      `DELETE FROM suborigenes_citas WHERE id = ?`,
      [id]
    );

    if (!result.affectedRows) {
      return NextResponse.json(
        { message: "Suborigen no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Suborigen eliminado" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al eliminar suborigen" },
      { status: 500 }
    );
  }
}