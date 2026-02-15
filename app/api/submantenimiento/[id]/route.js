import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req, { params }) {
  const { id } = params;
  const { name, type_id, is_active } = await req.json();

  await db.query(`
    UPDATE submantenimiento
    SET name=?, type_id=?, is_active=?
    WHERE id=?
  `, [name, type_id, is_active ?? 1, id]);

  return NextResponse.json({ message: "Actualizado" });
}

export async function DELETE(req, { params }) {
  const { id } = params;

  await db.query(`DELETE FROM submantenimiento WHERE id=?`, [id]);

  return NextResponse.json({ message: "Eliminado" });
}
