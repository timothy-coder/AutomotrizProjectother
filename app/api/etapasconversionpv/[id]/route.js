import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const idNum = Number(id);

    if (!Number.isInteger(idNum) || idNum <= 0) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

    const body = await req.json();

    const nombre = String(body?.nombre ?? "").trim();

    const descripcion =
      body?.descripcion === null || body?.descripcion === undefined
        ? null
        : String(body.descripcion).trim();

    const color =
      body?.color === null ||
      body?.color === undefined ||
      String(body.color).trim() === ""
        ? null
        : String(body.color).trim();

    const sort_order =
      body?.sort_order === "" ||
      body?.sort_order === null ||
      body?.sort_order === undefined
        ? null
        : Number(body.sort_order);

    const is_active =
      body?.is_active === null || body?.is_active === undefined
        ? 1
        : body.is_active
        ? 1
        : 0;

    if (!nombre) {
      return NextResponse.json(
        { message: "nombre es requerido" },
        { status: 400 }
      );
    }

    if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json(
        { message: "color debe tener formato HEX #RRGGBB" },
        { status: 400 }
      );
    }

    if (sort_order !== null && Number.isNaN(sort_order)) {
      return NextResponse.json(
        { message: "sort_order debe ser numérico o null" },
        { status: 400 }
      );
    }

    const [result] = await db.execute(
      `
      UPDATE etapasconversionpv
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

    return NextResponse.json({ message: "Actualizado correctamente" });
  } catch (error) {
    console.error("PUT /api/etapasconversionpv/[id] =>", error);

    return NextResponse.json(
      {
        message: "Error al actualizar etapa",
        error: error?.code || "UNKNOWN_ERROR",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;
    const idNum = Number(id);

    if (!Number.isInteger(idNum) || idNum <= 0) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

    const [result] = await db.execute(
      `DELETE FROM etapasconversionpv WHERE id = ?`,
      [idNum]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Etapa no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Eliminado correctamente" });
  } catch (error) {
    console.error("DELETE /api/etapasconversionpv/[id] =>", error);

    return NextResponse.json(
      {
        message: "Error al eliminar etapa",
        error: error?.code || "UNKNOWN_ERROR",
      },
      { status: 500 }
    );
  }
}