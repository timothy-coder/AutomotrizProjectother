import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {

    const [rows] = await db.query(`
      SELECT
        id,
        fullname,
        username,
        email,
        phone,
        role,
        is_active,
        permissions,
        work_schedule,
        created_at,
        color
      FROM usuarios
      ORDER BY id DESC
    `);

    return NextResponse.json(rows);

  } catch (error) {
    return NextResponse.json({ message: "Error al listar" }, { status: 500 });
  }
}
