import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET (con nombre del mantenimiento)
export async function GET() {
  const [rows] = await db.query(`
    SELECT s.*, m.name AS mantenimiento
    FROM submantenimiento s
    JOIN mantenimiento m ON m.id = s.type_id
    ORDER BY s.name
  `);

  return NextResponse.json(rows);
}

// CREAR
export async function POST(req) {
  const { name, type_id } = await req.json();

  if (!name || !type_id)
    return NextResponse.json({ message: "Datos incompletos" }, { status: 400 });

  await db.query(`
    INSERT INTO submantenimiento(name,type_id)
    VALUES(?,?)
  `, [name, type_id]);

  return NextResponse.json({ message: "Creado" });
}
