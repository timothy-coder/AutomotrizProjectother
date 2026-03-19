// ============================================
// API DE PRECIOS - ID
// archivo: app/api/precios-region-version/[id]/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = params;

    const [rows] = await db.query(
      `SELECT 
        prv.*,
        m.name as marca,
        mo.name as modelo
      FROM precios_region_version prv
      INNER JOIN marcas m ON m.id = prv.marca_id
      INNER JOIN modelos mo ON mo.id = prv.modelo_id
      WHERE prv.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Precio no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const { precio_base } = await req.json();

    if (!precio_base) {
      return NextResponse.json(
        { message: "Precio es requerido" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      "UPDATE precios_region_version SET precio_base = ? WHERE id = ?",
      [precio_base, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Precio no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Precio actualizado" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    const [result] = await db.query(
      "DELETE FROM precios_region_version WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Precio no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Precio eliminado" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}