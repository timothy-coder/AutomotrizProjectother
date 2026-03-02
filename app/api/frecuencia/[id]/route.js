import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================
// PUT → ACTUALIZAR FRECUENCIA
// ============================
export async function PUT(req, context) {
  try {
    const { id } = await context.params; // 👈 IMPORTANTE (await)

    const { dias } = await req.json();

    const idNum = Number(id);
    const diasNum = Number(dias);

    if (Number.isNaN(idNum)) {
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    if (Number.isNaN(diasNum)) {
      return NextResponse.json(
        { message: "dias debe ser un número" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      "UPDATE frecuencia SET dias = ? WHERE id = ?",
      [diasNum, idNum]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Frecuencia no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: idNum,
      dias: diasNum,
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error al actualizar frecuencia" },
      { status: 500 }
    );
  }
}

// ============================
// DELETE → ELIMINAR FRECUENCIA
// ============================
export async function DELETE(req, context) {
  try {
    const { id } = await context.params; // 👈 IMPORTANTE (await)

    const idNum = Number(id);

    if (Number.isNaN(idNum)) {
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      "DELETE FROM frecuencia WHERE id = ?",
      [idNum]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Frecuencia no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Frecuencia eliminada correctamente",
    });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error al eliminar frecuencia" },
      { status: 500 }
    );
  }
}