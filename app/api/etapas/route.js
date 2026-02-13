import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {

    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");

    let query = "SELECT * FROM etapas";
    let values = [];

    if (tipo) {
      query += " WHERE tipo = ?";
      values.push(tipo);
    }

    query += " ORDER BY sort_order ASC";

    const [rows] = await db.query(query, values);

    return NextResponse.json(rows);

  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error obteniendo etapas" },
      { status: 500 }
    );
  }
}
