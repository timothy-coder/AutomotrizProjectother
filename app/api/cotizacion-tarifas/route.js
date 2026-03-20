import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/cotizacion-tarifas?tipo=mano_obra|panos
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");

    let query = `
      SELECT 
        ct.*,
        m.codigo,
        m.nombre as moneda_nombre,
        m.simbolo as moneda_simbolo
      FROM cotizacion_tarifas ct
      LEFT JOIN monedas m ON ct.moneda_id = m.id
    `;
    const params = [];

    if (tipo) {
      query += " WHERE ct.tipo = ?";
      params.push(tipo);
    }

    query += " ORDER BY ct.tipo, ct.nombre";

    const [rows] = await db.query(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching tarifas:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/cotizacion-tarifas
export async function POST(req) {
  try {
    const { tipo, nombre, precio_hora, moneda_id, activo } = await req.json();

    if (!tipo || !nombre || precio_hora == null || !moneda_id) {
      return NextResponse.json(
        { message: "Faltan campos requeridos: tipo, nombre, precio_hora, moneda_id" },
        { status: 400 }
      );
    }

    // Verificar que la moneda existe
    const [monedaCheck] = await db.query(
      "SELECT id FROM monedas WHERE id = ? AND is_active = 1",
      [moneda_id]
    );

    if (monedaCheck.length === 0) {
      return NextResponse.json(
        { message: "Moneda inválida o inactiva" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      `INSERT INTO cotizacion_tarifas 
       (tipo, nombre, precio_hora, moneda_id, activo) 
       VALUES (?, ?, ?, ?, ?)`,
      [tipo, nombre.trim(), precio_hora, moneda_id, activo ?? 1]
    );

    return NextResponse.json({
      message: "Tarifa creada",
      id: result.insertId,
    });
  } catch (error) {
    console.error("Error creating tarifa:", error);
    return NextResponse.json(
      { message: "Error al crear tarifa" },
      { status: 500 }
    );
  }
}