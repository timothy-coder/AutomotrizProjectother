import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req) {
  try {

    const { tipo, items } = await req.json();

    if (!tipo || !Array.isArray(items)) {
      return NextResponse.json(
        { message: "Formato inválido" },
        { status: 400 }
      );
    }

    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {

      for (const item of items) {
        await connection.query(`
          UPDATE etapas
          SET sort_order=?
          WHERE id=? AND tipo=?
        `, [item.sort_order, item.id, tipo]);
      }

      await connection.commit();
      connection.release();

      return NextResponse.json({ message: "Orden actualizado" });

    } catch (error) {
      await connection.rollback();
      connection.release();
      throw error;
    }

  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error reorder" },
      { status: 500 }
    );
  }
}
