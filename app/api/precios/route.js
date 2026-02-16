import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query(`
      SELECT carrosparamantenimiento_id, submantenimiento_id, precio
      FROM precios
    `);

    return NextResponse.json(rows); // ✅ array
  } catch (e) {
    console.log(e);
    return NextResponse.json([], { status: 200 }); // ✅ nunca rompe el front
  }
}

export async function POST(req) {
  try {
    const { carrosparamantenimiento_id, submantenimiento_id, precio } = await req.json();

    if (!carrosparamantenimiento_id || !submantenimiento_id) {
      return NextResponse.json({ message: "IDs requeridos" }, { status: 400 });
    }

    const p = precio === "" || precio == null ? null : Number(precio);

    await db.query(
      `
      INSERT INTO precios (carrosparamantenimiento_id, submantenimiento_id, precio)
      VALUES (?,?,?)
      ON DUPLICATE KEY UPDATE precio = VALUES(precio)
      `,
      [carrosparamantenimiento_id, submantenimiento_id, p]
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
