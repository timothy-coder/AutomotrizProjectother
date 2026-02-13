import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {

  const [rows] = await db.query(`
    SELECT m.*, c.nombre centro
    FROM mostradores m
    JOIN centros c ON c.id = m.centro_id
    ORDER BY m.nombre
  `);

  return NextResponse.json(rows);
}

export async function POST(req) {

  const { centro_id, nombre } = await req.json();

  await db.query(`
    INSERT INTO mostradores(centro_id,nombre)
    VALUES(?,?)
  `, [centro_id, nombre]);

  return NextResponse.json({ message: "Mostrador creado" });
}
