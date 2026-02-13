import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req, { params }) {

  try {

    const { id } = await params;
    const { nombre } = await req.json();

    await db.query(`
      UPDATE centros
      SET nombre=?
      WHERE id=?
    `, [nombre, id]);

    return NextResponse.json({ message: "Centro actualizado" });

  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {

  try {

    const { id } = await params;

    await db.query(`DELETE FROM centros WHERE id=?`, [id]);

    return NextResponse.json({ message: "Centro eliminado" });

  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
