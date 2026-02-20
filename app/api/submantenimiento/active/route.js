import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query(`
      SELECT
        s.id,
        s.name,
        s.description,
        s.type_id,
        m.name AS type_name
      FROM submantenimiento s
      JOIN mantenimiento m ON m.id = s.type_id
      WHERE s.is_active = 1
      ORDER BY m.name, s.name
    `);

    return NextResponse.json(rows);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error cargando submantenimiento" },
      { status: 500 }
    );
  }
}
