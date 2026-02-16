import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req) {
  try {
    const { type_id, is_active } = await req.json();

    if (!type_id) {
      return NextResponse.json(
        { error: "type_id requerido" },
        { status: 400 }
      );
    }

    await db.query(
      `UPDATE submantenimiento
       SET is_active = ?
       WHERE type_id = ?`,
      [is_active, type_id]
    );

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Error actualizando submantenimientos" },
      { status: 500 }
    );
  }
}
