import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Actualizar un registro de carrosparamantenimiento, ahora con la columna clase_id
export async function PUT(req, context) {
  try {
    const { id } = context.params;
    const { marca_id, modelo_id, year, version, clase_id } = await req.json();

    await db.query(`
      UPDATE carrosparamantenimiento  
      SET marca_id=?, modelo_id=?, year=?, version=?, clase_id=?
      WHERE id=?
    `, [marca_id, modelo_id, year, version, clase_id, id]);

    return NextResponse.json({ message: "Actualizado" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

// Eliminar un registro de carrosparamantenimiento, ahora con la columna clase_id
export async function DELETE(req, { params }) {
  const { id } = params;

  await db.query(`
    DELETE FROM carrosparamantenimiento WHERE id=?
  `, [id]);

  return NextResponse.json({ message: "Eliminado" });
}