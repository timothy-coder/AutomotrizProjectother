import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const [rows] = await db.query(`
      SELECT * FROM centros
      ORDER BY nombre
    `);

    return NextResponse.json(rows);

  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {

    const { nombre } = await req.json();

    if (!nombre)
      return NextResponse.json({ message: "Nombre requerido" }, { status: 400 });

    await db.query(`
      INSERT INTO centros(nombre)
      VALUES(?)
    `, [nombre]);

    return NextResponse.json({ message: "Centro creado" });

  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
