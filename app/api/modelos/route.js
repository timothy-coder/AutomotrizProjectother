import { NextResponse } from "next/server";
import { db } from "@/lib/db";


// ============================
// GET → LISTAR MODELOS (con marca)
// ============================
export async function GET(req) {
  try {

    const { searchParams } = new URL(req.url);
    const marca_id = searchParams.get("marca_id");

    let query = `
      SELECT 
        m.id,
        m.name,
        m.marca_id,
        ma.name AS marca_name,
        m.created_at
      FROM modelos m
      INNER JOIN marcas ma ON ma.id = m.marca_id
    `;

    let params = [];

    if (marca_id) {
      query += ` WHERE m.marca_id = ?`;
      params.push(marca_id);
    }

    query += ` ORDER BY ma.name ASC, m.name ASC`;

    const [rows] = await db.query(query, params);

    return NextResponse.json(rows);

  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error al obtener modelos" },
      { status: 500 }
    );
  }
}


// ============================
// POST → CREAR MODELO
// ============================
export async function POST(req) {
  try {

    const { name, marca_id } = await req.json();

    const [result] = await db.query(`
      INSERT INTO modelos (name, marca_id)
      VALUES (?, ?)
    `, [name, marca_id]);

    return NextResponse.json({
      id: result.insertId
    });

  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error al crear modelo" },
      { status: 500 }
    );
  }
}
