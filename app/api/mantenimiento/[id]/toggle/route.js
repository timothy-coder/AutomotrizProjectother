import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req, context) {
  try {
    // ✅ IMPORTANTE: await params
    const { id } = await context.params;

    const { is_active } = await req.json();

    if (!id) {
      return NextResponse.json(
        { message: "ID requerido" },
        { status: 400 }
      );
    }

    await db.query(
      `UPDATE mantenimiento SET is_active=? WHERE id=?`,
      [is_active ? 1 : 0, id]
    );

    return NextResponse.json({ ok: true });

  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error actualizando estado" },
      { status: 500 }
    );
  }
}
