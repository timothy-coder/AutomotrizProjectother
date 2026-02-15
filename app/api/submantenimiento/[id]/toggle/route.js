import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req, { params }) {
  try {

    const { id } = await params;   // ✅ IMPORTANTE en Next 15

    const { is_active } = await req.json();

    await db.query(
      `
      UPDATE submantenimiento
      SET is_active = ?
      WHERE id = ?
      `,
      [is_active, id]
    );

    return NextResponse.json({
      message: "Estado actualizado"
    });

  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error actualizando estado" },
      { status: 500 }
    );
  }
}
