import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req, { params }) {

  try {

    const { id } = params;

    await db.query(`
      UPDATE usuarios
      SET is_active = NOT is_active
      WHERE id=?
    `, [id]);

    return NextResponse.json({ message: "Estado actualizado" });

  } catch {
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
