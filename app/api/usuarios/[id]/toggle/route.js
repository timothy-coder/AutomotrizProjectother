import { NextResponse } from "next/server";
import { db } from "@/lib/db";
export async function PATCH(req, context) {
  const { id } = await context.params;

  try {
    await db.query(`
      UPDATE usuarios
      SET is_active = NOT is_active
      WHERE id = ?
    `, [id]);

    return Response.json({ success: true });

  } catch (error) {
    return Response.json(
      { error: "Error al actualizar" },
      { status: 500 }
    );
  }
}
