import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET todos
export async function GET() {
  const [rows] = await db.query(`
    SELECT * FROM mantenimiento
    ORDER BY name
  `);
  return NextResponse.json(rows);
}

// CREAR
export async function POST(req) {
  const { name } = await req.json();

  if (!name)
    return NextResponse.json({ message: "Nombre requerido" }, { status: 400 });

  await db.query(
    `INSERT INTO mantenimiento(name) VALUES(?)`,
    [name]
  );

  return NextResponse.json({ message: "Creado" });
}
