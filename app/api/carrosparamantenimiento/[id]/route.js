import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req, context) {
  try {
    const { id } = await context.params;
    const { marca_id, modelo_id, year, version } = await req.json();

    await db.query(`
      UPDATE carrosparamantenimiento
      SET marca_id=?, modelo_id=?, year=?, version=?
      WHERE id=?
    `, [marca_id, modelo_id, year, version, id]);

    return NextResponse.json({ message:"Actualizado" });

  } catch (e) {
    console.log(e);
    return NextResponse.json({ message:"Error" },{ status:500 });
  }
}


export async function DELETE(req, { params }) {
  const { id } = params;

  await db.query(
    `DELETE FROM carrosparamantenimiento WHERE id=?`,
    [id]
  );

  return NextResponse.json({ message: "Eliminado" });
}
