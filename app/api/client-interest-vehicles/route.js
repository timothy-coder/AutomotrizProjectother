// ============================================
// API DE VEHÍCULOS DE INTERÉS
// archivo: app/api/client-interest-vehicles/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const client_id = searchParams.get("client_id");
    const active = searchParams.get("active");

    let query = `
      SELECT 
        civ.*,
        m.name as marca,
        mo.name as modelo
      FROM client_interest_vehicles civ
      LEFT JOIN marcas m ON m.id = civ.marca_id
      LEFT JOIN modelos mo ON mo.id = civ.modelo_id
      WHERE 1=1
    `;
    const params = [];

    if (client_id) {
      query += " AND civ.client_id = ?";
      params.push(client_id);
    }

    if (active !== null && active !== undefined) {
      query += " AND civ.active = ?";
      params.push(active === "true" || active === "1" ? 1 : 0);
    }

    query += " ORDER BY civ.created_at DESC";

    const [rows] = await db.query(query, params);
    return NextResponse.json(rows);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const { client_id, marca_id, modelo_id, anio_interes, source } =
      await req.json();

    if (!client_id) {
      return NextResponse.json(
        { message: "Client ID es requerido" },
        { status: 400 }
      );
    }

    // Verificar que el cliente existe
    const [cliente] = await db.query(
      "SELECT id FROM clientes WHERE id = ?",
      [client_id]
    );

    if (cliente.length === 0) {
      return NextResponse.json(
        { message: "Cliente no encontrado" },
        { status: 404 }
      );
    }

    // Verificar si ya existe el registro
    const [existing] = await db.query(
      `SELECT id FROM client_interest_vehicles 
       WHERE client_id = ? AND marca_id <=> ? AND modelo_id <=> ? AND anio_interes <=> ?`,
      [client_id, marca_id || null, modelo_id || null, anio_interes || null]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "Este vehículo ya está registrado como interés" },
        { status: 409 }
      );
    }

    const [result] = await db.query(
      `INSERT INTO client_interest_vehicles 
       (client_id, marca_id, modelo_id, anio_interes, source, active, created_at, updated_at)
       VALUES(?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [client_id, marca_id || null, modelo_id || null, anio_interes || null, source || "manual", 1]
    );

    return NextResponse.json(
      { message: "Vehículo de interés creado", id: result.insertId },
      { status: 201 }
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}