import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ✅ GET: trae todo (para matriz / tabla)
export async function GET() {
  try {
    const [rows] = await db.query(`
      SELECT 
        id,
        mantenimiento_id,
        submantenimiento_id,
        marca_id,
        modelo_id,
        precio
      FROM precios
    `);

    return NextResponse.json(rows); // ✅ array
  } catch (e) {
    console.log(e);
    return NextResponse.json([], { status: 200 }); // ✅ nunca rompe el front
  }
}

// ✅ POST: upsert por UNIQUE (mantenimiento_id, submantenimiento_id, marca_id, modelo_id)
export async function POST(req) {
  try {
    const {
      mantenimiento_id,
      submantenimiento_id,
      marca_id,
      modelo_id,
      precio
    } = await req.json();

    if (!mantenimiento_id || !submantenimiento_id || !marca_id || !modelo_id) {
      return NextResponse.json({ message: "IDs requeridos" }, { status: 400 });
    }

    const p = precio === "" || precio == null ? null : Number(precio);

    await db.query(
      `
      INSERT INTO precios (mantenimiento_id, submantenimiento_id, marca_id, modelo_id, precio)
      VALUES (?,?,?,?,?)
      ON DUPLICATE KEY UPDATE precio = VALUES(precio)
      `,
      [mantenimiento_id, submantenimiento_id, marca_id, modelo_id, p]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}