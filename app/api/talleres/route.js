import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {

  const [rows] = await db.query(`
    SELECT t.*, c.nombre centro
    FROM talleres t
    JOIN centros c ON c.id = t.centro_id
    ORDER BY t.nombre
  `);

  return NextResponse.json(rows);
}

export async function POST(req) {

  const { centro_id, nombre } = await req.json();

  await db.query(`
    INSERT INTO talleres(centro_id,nombre)
    VALUES(?,?)
  `, [centro_id, nombre]);

  return NextResponse.json({ message: "Taller creado" });
}
