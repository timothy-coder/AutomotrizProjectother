import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// UPDATE
export async function PUT(req, { params }) {
  try {
    const { id } = await params;   // ✅ IMPORTANTE
    const { nombre } = await req.json();

    await db.query(`
      UPDATE mostradores
      SET nombre = ?
      WHERE id = ?
    `, [nombre, id]);

    return NextResponse.json({ message: "Actualizado" });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error actualizando mostrador" },
      { status: 500 }
    );
  }
}

// DELETE
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;   // ✅ IMPORTANTE

    await db.query(`
      DELETE FROM mostradores
      WHERE id = ?
    `, [id]);

    return NextResponse.json({ message: "Eliminado" });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error eliminando mostrador" },
      { status: 500 }
    );
  }
}
