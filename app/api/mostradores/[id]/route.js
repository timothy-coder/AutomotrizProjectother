import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req, { params }) {

  try {

    const { nombre } = await req.json();

    await db.query(`
      UPDATE mostradores
      SET nombre = ?
      WHERE id = ?
    `, [nombre, params.id]);

    return NextResponse.json({ message: "Actualizado" });

  } catch (error) {

    console.error(error);
    return NextResponse.json(
      { message: "Error actualizando mostrador" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {

  try {

    await db.query(`
      DELETE FROM mostradores
      WHERE id = ?
    `, [params.id]);

    return NextResponse.json({ message: "Eliminado" });

  } catch (error) {

    console.error(error);
    return NextResponse.json(
      { message: "Error eliminando mostrador" },
      { status: 500 }
    );
  }
}
