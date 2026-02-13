import { NextResponse } from "next/server";
import { db } from "@/lib/db";


// ============================
// GET ONE
// ============================
export async function GET(req, { params }) {
  try {

    const { id } = await params;

    const [rows] = await db.query(`
      SELECT *
      FROM modelos
      WHERE id = ?
    `, [id]);

    if (!rows.length) {
      return NextResponse.json({ message: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);

  } catch (error) {
    console.log(error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}


// ============================
// UPDATE
// ============================
export async function PUT(req, { params }) {
  try {

    const { id } = await params;
    const { name, marca_id } = await req.json();

    await db.query(`
      UPDATE modelos
      SET name = ?, marca_id = ?
      WHERE id = ?
    `, [name, marca_id, id]);

    return NextResponse.json({ message: "Actualizado" });

  } catch (error) {
    console.log(error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}


// ============================
// DELETE
// ============================
export async function DELETE(req, { params }) {
  try {

    const { id } = await params;

    await db.query(`
      DELETE FROM modelos
      WHERE id = ?
    `, [id]);

    return NextResponse.json({ message: "Eliminado" });

  } catch (error) {
    console.log(error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
