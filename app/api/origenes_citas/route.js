import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {

  const [rows] = await db.query(`
    SELECT * FROM origenes_citas
    ORDER BY name
  `);

  return NextResponse.json(rows);
}

export async function POST(req) {

  const { name, is_active } = await req.json();

  await db.query(`
    INSERT INTO origenes_citas(name,is_active)
    VALUES(?,?)
  `, [name, is_active ?? 1]);

  return NextResponse.json({ message: "Origen creado" });
}
