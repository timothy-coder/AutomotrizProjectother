import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ACTUALIZAR
export async function PUT(req, { params }) {
  const { id } = params;
  const { name, is_active } = await req.json();

  await db.query(`
    UPDATE mantenimiento
    SET name=?, is_active=?
    WHERE id=?
  `, [name, is_active, id]);

  return NextResponse.json({ message:"Actualizado" });
}

// ELIMINAR
export async function DELETE(req, { params }) {
  const { id } = params;

  await db.query(`DELETE FROM mantenimiento WHERE id=?`, [id]);

  return NextResponse.json({ message: "Eliminado" });
}
