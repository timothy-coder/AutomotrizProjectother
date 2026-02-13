import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req, { params }) {

  const { id } = await params;
  const { nombre, is_active } = await req.json();

  await db.query(`
    UPDATE motivos_citas
    SET nombre=?, is_active=?
    WHERE id=?
  `, [nombre, is_active, id]);

  return NextResponse.json({ message: "Motivo actualizado" });
}

export async function DELETE(req, { params }) {

  const { id } = await params;

  await db.query(`DELETE FROM motivos_citas WHERE id=?`, [id]);

  return NextResponse.json({ message: "Motivo eliminado" });
}
