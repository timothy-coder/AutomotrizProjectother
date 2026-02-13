import { NextResponse } from "next/server";
import { db } from "@/lib/db";


// =============================
// GET ONE
// =============================
export async function GET(req, { params }) {
  try {

    const { id } = await params;

    const [rows] = await db.query(`
      SELECT *
      FROM tiposactividades
      WHERE id = ?
    `, [id]);

    if (!rows.length) {
      return NextResponse.json(
        { message: "No encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);

  } catch (error) {
    console.log(error);

    return NextResponse.json(
      { message: "Error al obtener" },
      { status: 500 }
    );
  }
}



// =============================
// UPDATE
// =============================
export async function PUT(req, { params }) {
  try {

    const { id } = await params;
    const { name, tipo, is_active } = await req.json();

    await db.query(`
      UPDATE tiposactividades
      SET
        name = ?,
        tipo = ?,
        is_active = ?
      WHERE id = ?
    `, [
      name,
      tipo,
      is_active ? 1 : 0,
      id
    ]);

    return NextResponse.json({ message: "Actualizado" });

  } catch (error) {
    console.log(error);

    return NextResponse.json(
      { message: "Error al actualizar" },
      { status: 500 }
    );
  }
}



// =============================
// DELETE
// =============================
export async function DELETE(req, { params }) {
  try {

    const { id } = await params;

    await db.query(`
      DELETE FROM tiposactividades
      WHERE id = ?
    `, [id]);

    return NextResponse.json({ message: "Eliminado" });

  } catch (error) {
    console.log(error);

    return NextResponse.json(
      { message: "Error al eliminar" },
      { status: 500 }
    );
  }
}
