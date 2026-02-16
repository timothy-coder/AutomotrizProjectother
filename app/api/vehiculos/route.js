import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/vehiculos?cliente_id=1
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const cliente_id = searchParams.get("cliente_id");

    let sql = `
      SELECT v.*,
        m.name AS marca_nombre,
        mo.name AS modelo_nombre,
        CONCAT(c.nombre,' ',c.apellido) AS cliente_nombre
      FROM vehiculos v
      LEFT JOIN marcas m ON m.id = v.marca_id
      LEFT JOIN modelos mo ON mo.id = v.modelo_id
      LEFT JOIN clientes c ON c.id = v.cliente_id
    `;

    const params = [];

    // si envían cliente_id → filtra
    if (cliente_id) {
      sql += " WHERE v.cliente_id=?";
      params.push(cliente_id);
    }

    sql += " ORDER BY v.id DESC";

    const [rows] = await db.query(sql, params);

    return NextResponse.json(rows);

  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

// POST /api/vehiculos
export async function POST(req) {
  try {
    const body = await req.json();

    const cliente_id = Number(body.cliente_id);
    if (!Number.isFinite(cliente_id) || cliente_id <= 0) {
      return NextResponse.json({ message: "cliente_id inválido" }, { status: 400 });
    }

    const placas = (body.placas || "").trim();
    const vin = (body.vin || "").trim();

    const marca_id = body.marca_id == null || body.marca_id === "" ? null : Number(body.marca_id);
    const modelo_id = body.modelo_id == null || body.modelo_id === "" ? null : Number(body.modelo_id);

    const anio = body.anio == null || body.anio === "" ? null : Number(body.anio);
    const color = (body.color || "").trim();
    const kilometraje = body.kilometraje == null || body.kilometraje === "" ? null : Number(body.kilometraje);

    if (!placas && !vin) {
      return NextResponse.json({ message: "Ingrese placas o VIN" }, { status: 400 });
    }

    const [result] = await db.query(
      `
      INSERT INTO vehiculos(
        cliente_id, placas, vin, marca_id, modelo_id,
        anio, color, kilometraje, created_at
      ) VALUES (?,?,?,?,?,?,?,?, CURRENT_DATE)
      `,
      [
        cliente_id,
        placas || null,
        vin || null,
        Number.isFinite(marca_id) ? marca_id : null,
        Number.isFinite(modelo_id) ? modelo_id : null,
        Number.isFinite(anio) ? anio : null,
        color || null,
        Number.isFinite(kilometraje) ? kilometraje : null,
      ]
    );

    return NextResponse.json({ message: "Vehículo creado", id: result.insertId });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
