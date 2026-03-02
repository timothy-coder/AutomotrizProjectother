// app/api/etapasconversion/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query(`
      SELECT id, nombre, descripcion, color, sort_order, is_active, created_at
      FROM etapasconversion
      ORDER BY sort_order IS NULL, sort_order ASC, id ASC
    `);

    return NextResponse.json(rows);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error al obtener etapas" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const body = await req.json();
    const nombre = String(body?.nombre ?? "").trim();
    const descripcion =
      body?.descripcion === undefined || body?.descripcion === null || String(body.descripcion).trim() === ""
        ? null
        : String(body.descripcion).trim();

    const color =
      body?.color === undefined || body?.color === null || String(body.color).trim() === ""
        ? null
        : String(body.color).trim();

    if (!nombre) {
      return NextResponse.json({ message: "nombre requerido" }, { status: 400 });
    }

    // activo por defecto
    const is_active = 1;

    // al final: max(sort_order)+1 (si no hay, 1)
    const [maxRows] = await db.query(
      "SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM etapasconversion"
    );
    const nextOrder = Number(maxRows?.[0]?.maxOrder ?? 0) + 1;

    const [result] = await db.query(
      `
        INSERT INTO etapasconversion (nombre, descripcion, color, sort_order, is_active)
        VALUES (?, ?, ?, ?, ?)
      `,
      [nombre, descripcion, color, nextOrder, is_active]
    );

    return NextResponse.json(
      { id: result.insertId, sort_order: nextOrder, is_active },
      { status: 201 }
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json({ message: "Error al crear etapa" }, { status: 500 });
  }
}