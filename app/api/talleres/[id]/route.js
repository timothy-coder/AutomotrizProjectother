import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req, { params }) {

  const { id } = await params;
  const { centro_id, nombre } = await req.json();

  await db.query(`
    UPDATE talleres
    SET centro_id=?, nombre=?
    WHERE id=?
  `, [centro_id, nombre, id]);

  return NextResponse.json({ message: "Taller actualizado" });
}

export async function DELETE(req, { params }) {

  const { id } = await params;

  await db.query(`DELETE FROM talleres WHERE id=?`, [id]);

  return NextResponse.json({ message: "Taller eliminado" });
}
