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
      body?.descripcion === null || body?.descripcion === undefined
        ? null
        : String(body.descripcion).trim();

    const sort_order =
      body?.sort_order === "" || body?.sort_order === undefined || body?.sort_order === null
        ? null
        : Number(body.sort_order);

    const is_active =
      body?.is_active === undefined || body?.is_active === null
        ? 1
        : Number(Boolean(body.is_active));

    const color =
      body?.color === null || body?.color === undefined || String(body.color).trim() === ""
        ? null
        : String(body.color).trim();

    if (!nombre) {
      return NextResponse.json(
        { message: "nombre es requerido" },
        { status: 400 }
      );
    }

    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json(
        { message: "color debe ser HEX tipo #RRGGBB" },
        { status: 400 }
      );
    }

    if (sort_order !== null && Number.isNaN(sort_order)) {
      return NextResponse.json(
        { message: "sort_order debe ser numérico o null" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      `
      INSERT INTO etapasconversion (nombre, descripcion, color, sort_order, is_active)
      VALUES (?, ?, ?, ?, ?)
      `,
      [nombre, descripcion, color, sort_order, is_active]
    );

    return NextResponse.json(
      { id: result.insertId },
      { status: 201 }
    );
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error al crear etapa" },
      { status: 500 }
    );
  }
}