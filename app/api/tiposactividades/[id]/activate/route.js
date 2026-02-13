import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req, { params }) {
  try {

    const { id } = await params;

    const [rows] = await db.query(`
      SELECT is_active
      FROM tiposactividades
      WHERE id = ?
    `, [id]);

    if (!rows.length) {
      return NextResponse.json(
        { message: "No encontrado" },
        { status: 404 }
      );
    }

    const newState = rows[0].is_active ? 0 : 1;

    await db.query(`
      UPDATE tiposactividades
      SET is_active = ?
      WHERE id = ?
    `, [newState, id]);

    return NextResponse.json({ is_active: newState });

  } catch (error) {
    console.log(error);

    return NextResponse.json(
      { message: "Error al cambiar estado" },
      { status: 500 }
    );
  }
}
