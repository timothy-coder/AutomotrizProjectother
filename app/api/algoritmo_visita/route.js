"use server";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";


// ============================
// GET → LISTAR REGISTROS DE ALGORITMO VISITA
// /api/algoritmo_visita?id=1
// ============================
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    let query = `
      SELECT a.id, a.modelo_id, a.marca_id, a.kilometraje, a.meses, a.años, 
             m.name AS modelo_name, ma.name AS marca_name
      FROM algoritmo_visita a
      JOIN modelos m ON m.id = a.modelo_id
      JOIN marcas ma ON ma.id = a.marca_id
    `;

    const params = [];
    const where = [];

    if (id) {
      where.push("a.id = ?");
      params.push(id);
    }

    if (where.length) {
      query += ` WHERE ${where.join(" AND ")}`;
    }

    query += ` ORDER BY a.id ASC`;

    const [rows] = await db.query(query, params);

    return NextResponse.json(rows);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error al obtener registros de algoritmo_visita" },
      { status: 500 }
    );
  }
}

// ============================
// POST → CREAR UN NUEVO REGISTRO EN ALGORITMO VISITA
// body: { modelo_id, marca_id, kilometraje, meses, años }
// ============================

export async function POST(req) {
  try {
    const { modelo_id, marca_id, kilometraje, meses, años } = await req.json();

    console.log('Datos recibidos:', { modelo_id, marca_id, kilometraje, meses, años });

    // Validar que todos los campos sean proporcionados
    if (!modelo_id || !marca_id || !kilometraje || !meses || !años) {
      return NextResponse.json({ message: "Todos los campos son requeridos" }, { status: 400 });
    }

    // Validar que 'años' sea un array válido
    if (!Array.isArray(años)) {
      return NextResponse.json({ message: "El campo 'años' debe ser un array." }, { status: 400 });
    }

    // Validar que cada elemento del array 'años' sea una cadena en el formato 'YYYY-YYYY'
    for (let range of años) {
      if (!/^\d{4}-\d{4}$/.test(range)) {
        return NextResponse.json({ message: "Cada rango de 'años' debe tener el formato 'YYYY-YYYY'." }, { status: 400 });
      }
    }

    // Insertar en la base de datos, guardando 'años' como un JSON
    const [result] = await db.query(
      `
      INSERT INTO algoritmo_visita (modelo_id, marca_id, kilometraje, meses, años)
      VALUES (?, ?, ?, ?, ?)
      `,
      [modelo_id, marca_id, kilometraje, meses, JSON.stringify(años)] // Guardar 'años' como JSON
    );

    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (error) {
    console.log("Error al crear el registro:", error);
    return NextResponse.json(
      { message: "Error al crear el registro" },
      { status: 500 }
    );
  }
}