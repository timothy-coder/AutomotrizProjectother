import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req, { params }) {
  try {

    const { id } = await params;
    const body = await req.json();

    const {
      nombre,
      descripcion,
      tipo,
      sort_order,
      is_active
    } = body;

    if (![1, 2].includes(Number(tipo))) {
      return NextResponse.json(
        { message: "Tipo inválido (1 o 2)" },
        { status: 400 }
      );
    }

    await db.query(`
      UPDATE etapas SET
        nombre=?,
        descripcion=?,
        tipo=?,
        sort_order=?,
        is_active=?
      WHERE id=?
    `, [
      nombre,
      descripcion,
      tipo,
      sort_order,
      is_active ? 1 : 0,
      id
    ]);

    return NextResponse.json({ message: "Etapa actualizada" });

  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error actualizando etapa" },
      { status: 500 }
    );
  }
}


export async function DELETE(req, { params }) {
  try {

    const { id } = await params;

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {

      // Obtener tipo y orden
      const [[etapa]] = await connection.query(
        "SELECT tipo, sort_order FROM etapas WHERE id=?",
        [id]
      );

      if (!etapa) {
        return NextResponse.json(
          { message: "No encontrada" },
          { status: 404 }
        );
      }

      const { tipo, sort_order } = etapa;

      // Eliminar etapa
      await connection.query(
        "DELETE FROM etapas WHERE id=?",
        [id]
      );

      // Reordenar SOLO del mismo tipo
      await connection.query(`
        UPDATE etapas
        SET sort_order = sort_order - 1
        WHERE tipo=? AND sort_order > ?
      `, [tipo, sort_order]);

      await connection.commit();
      connection.release();

      return NextResponse.json({ message: "Etapa eliminada" });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error eliminando etapa" },
      { status: 500 }
    );
  }
}
