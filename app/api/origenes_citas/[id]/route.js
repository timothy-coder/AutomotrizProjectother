import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req, { params }) {

  const { id } = await params;
  const { name, is_active } = await req.json();

  await db.query(`
    UPDATE origenes_citas
    SET name=?, is_active=?
    WHERE id=?
  `, [name, is_active, id]);

  return NextResponse.json({ message: "Origen actualizado" });
}

export async function DELETE(req, { params }) {

  const { id } = await params;

  await db.query(`DELETE FROM origenes_citas WHERE id=?`, [id]);

  return NextResponse.json({ message: "Origen eliminado" });
}
