import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {

  const [rows] = await db.query(`
    SELECT * FROM motivos_citas
    ORDER BY nombre
  `);

  return NextResponse.json(rows);
}

export async function POST(req) {

  const { nombre, is_active } = await req.json();

  await db.query(`
    INSERT INTO motivos_citas(nombre,is_active)
    VALUES(?,?)
  `, [nombre, is_active ?? 1]);

  return NextResponse.json({ message: "Motivo creado" });
}
