import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req, { params }) {
  const { id } = params;
  const { year, version, marca_id, modelo_id } = await req.json();

  await db.query(`
    UPDATE carrosparamantenimiento
    SET year=?, version=?, marca_id=?, modelo_id=?
    WHERE id=?
  `, [year, version, marca_id, modelo_id, id]);

  return NextResponse.json({ message: "Actualizado" });
}

export async function DELETE(req, { params }) {
  const { id } = params;

  await db.query(
    `DELETE FROM carrosparamantenimiento WHERE id=?`,
    [id]
  );

  return NextResponse.json({ message: "Eliminado" });
}
