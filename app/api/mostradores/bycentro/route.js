import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {

  try {

    const { searchParams } = new URL(req.url);
    const centro_id = searchParams.get("centro_id");

    let query = `
      SELECT m.*, c.nombre AS centro
      FROM mostradores m
      JOIN centros c ON c.id = m.centro_id
    `;

    let params = [];

    // ✅ Filtrar por centro si se envía
    if (centro_id) {
      query += ` WHERE m.centro_id = ?`;
      params.push(centro_id);
    }

    query += ` ORDER BY m.nombre`;

    const [rows] = await db.query(query, params);

    return NextResponse.json(rows);

  } catch (error) {

    console.error(error);
    return NextResponse.json(
      { message: "Error obteniendo mostradores" },
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
      INSERT INTO mostradores (centro_id, nombre)
      VALUES (?, ?)
    `, [centro_id, nombre]);

    return NextResponse.json({ message: "Mostrador creado" });

  } catch (error) {

    console.error(error);
    return NextResponse.json(
      { message: "Error creando mostrador" },
      { status: 500 }
    );
  }
}
