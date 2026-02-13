import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {

  const { searchParams } = new URL(req.url);
  const centro_id = searchParams.get("centro_id");

  try {

    let query = `
      SELECT t.*, c.nombre AS centro
      FROM talleres t
      JOIN centros c ON c.id = t.centro_id
    `;

    let params = [];

    // ✅ si envían centro → filtra
    if (centro_id) {
      query += ` WHERE t.centro_id = ?`;
      params.push(centro_id);
    }

    query += ` ORDER BY t.nombre`;

    const [rows] = await db.query(query, params);

    return NextResponse.json(rows);

  } catch (error) {

    console.error(error);
    return NextResponse.json(
      { message: "Error obteniendo talleres" },
      { status: 500 }
    );
  }
}

export async function POST(req) {

  try {

    const { centro_id, nombre } = await req.json();

    if (!centro_id || !nombre)
      return NextResponse.json(
        { message: "Datos incompletos" },
        { status: 400 }
      );

    await db.query(`
      INSERT INTO talleres (centro_id, nombre)
      VALUES (?, ?)
    `, [centro_id, nombre]);

    return NextResponse.json({ message: "Taller creado" });

  } catch (error) {

    console.error(error);
    return NextResponse.json(
      { message: "Error creando taller" },
      { status: 500 }
    );
  }
}
