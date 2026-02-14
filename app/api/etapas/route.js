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
export async function POST(req) {
  try {
    const body = await req.json();

    const nombre = String(body.nombre || "").trim();
    const descripcion = String(body.descripcion || "").trim();
    const tipo = Number(body.tipo);
    const is_active = body.is_active == null ? 1 : (body.is_active ? 1 : 0);

    if (!nombre) {
      return NextResponse.json({ message: "Nombre requerido" }, { status: 400 });
    }
    if (![1, 2].includes(tipo)) {
      return NextResponse.json({ message: "tipo debe ser 1 o 2" }, { status: 400 });
    }

    // sort_order siguiente dentro del mismo tipo
    const [[maxRow]] = await db.query(
      "SELECT COALESCE(MAX(sort_order), 0) AS maxOrder FROM etapas WHERE tipo=?",
      [tipo]
    );
    const nextOrder = Number(maxRow?.maxOrder || 0) + 1;

    const [result] = await db.query(
      `
      INSERT INTO etapas(nombre, descripcion, tipo, sort_order, is_active, created_at)
      VALUES(?,?,?,?,?, NOW())
      `,
      [nombre, descripcion || null, tipo, nextOrder, is_active]
    );

    return NextResponse.json({ message: "Etapa creada", id: result.insertId });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ message: "Error creando etapa" }, { status: 500 });
  }
}