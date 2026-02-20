import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/tipo-inventario/10
export async function GET(req, ctx) {
  try {
    const { id } = await ctx.params; // ✅ params async
    const tipoId = Number(id);

    if (!tipoId) {
      return NextResponse.json({ message: "id inválido" }, { status: 400 });
    }

    const [rows] = await db.query(
      `SELECT id, nombre, created_at, updated_at
       FROM tipo_inventario
       WHERE id=?`,
      [tipoId]
    );

    if (!rows?.length) {
      return NextResponse.json({ message: "No existe" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

// PUT /api/tipo-inventario/10
export async function PUT(req, ctx) {
  try {
    const { id } = await ctx.params; // ✅
    const tipoId = Number(id);
    const body = await req.json();

    const nombre = String(body?.nombre || "").trim();
    if (!tipoId) {
      return NextResponse.json({ message: "id inválido" }, { status: 400 });
    }
    if (!nombre) {
      return NextResponse.json({ message: "nombre requerido" }, { status: 400 });
    }

    const [result] = await db.query(
      `UPDATE tipo_inventario
       SET nombre=?, updated_at=NOW()
       WHERE id=?`,
      [nombre, tipoId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: "No existe" }, { status: 404 });
    }

    return NextResponse.json({ message: "Actualizado" });
  } catch (e) {
    if (e?.code === "ER_DUP_ENTRY") {
      return NextResponse.json({ message: "Ya existe ese nombre" }, { status: 409 });
    }
    console.error(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

// DELETE /api/tipo-inventario/10
export async function DELETE(req, ctx) {
  try {
    const { id } = await ctx.params; // ✅
    const tipoId = Number(id);

    if (!tipoId) {
      return NextResponse.json({ message: "id inválido" }, { status: 400 });
    }

    const [result] = await db.query(
      `DELETE FROM tipo_inventario WHERE id=?`,
      [tipoId]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: "No existe" }, { status: 404 });
    }

    return NextResponse.json({ message: "Eliminado" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
