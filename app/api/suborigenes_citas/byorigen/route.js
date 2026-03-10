import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* =========================
   GET: listar por origen
   /api/suborigenes_citas/byorigen?origen_id=1
========================= */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const origen_id = searchParams.get("origen_id");

    if (!origen_id) {
      return NextResponse.json(
        { message: "origen_id es obligatorio" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      `
      SELECT
        id,
        origen_id,
        name,
        is_active,
        created_at
      FROM suborigenes_citas
      WHERE origen_id = ? AND is_active = 1
      ORDER BY name ASC
      `,
      [origen_id]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al listar suborígenes por origen" },
      { status: 500 }
    );
  }
}