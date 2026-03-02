// app/api/etapasconversion/[id]/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req, context) {
  try {
    const { id } = await context.params;
    const idNum = Number(id);

    if (Number.isNaN(idNum)) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

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
      UPDATE etapasconversion
      SET nombre = ?, descripcion = ?, color = ?, sort_order = ?, is_active = ?
      WHERE id = ?
      `,
      [nombre, descripcion, color, sort_order, is_active, idNum]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Etapa no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Actualizado" });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error al actualizar etapa" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, context) {
  try {
    const { id } = await context.params;
    const idNum = Number(id);

    if (Number.isNaN(idNum)) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

    const [result] = await db.query(
      `DELETE FROM etapasconversion WHERE id = ?`,
      [idNum]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Etapa no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Eliminado" });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error al eliminar etapa" },
      { status: 500 }
    );
  }
}