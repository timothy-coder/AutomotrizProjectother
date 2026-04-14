// ============================================
// API DE VEHÍCULOS DE INTERÉS - ID
// archivo: app/api/client-interest-vehicles/[id]/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    // ✅ CAMBIO: Await params
    const { id } = await params;

    const [rows] = await db.query(
      `SELECT 
        civ.*,
        m.name as marca,
        mo.name as modelo
      FROM client_interest_vehicles civ
      LEFT JOIN marcas m ON m.id = civ.marca_id
      LEFT JOIN modelos mo ON mo.id = civ.modelo_id
      WHERE civ.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Vehículo de interés no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    // ✅ CAMBIO: Await params
    const { id } = await params;
    const { marca_id, modelo_id, anio_interes, active } = await req.json();

    const [result] = await db.query(
      `UPDATE client_interest_vehicles 
       SET marca_id = ?, modelo_id = ?, anio_interes = ?, active = ?, updated_at = NOW()
       WHERE id = ?`,
      [marca_id || null, modelo_id || null, anio_interes || null, active !== undefined ? active : 1, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Vehículo de interés no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Vehículo de interés actualizado" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    // ✅ CAMBIO: Await params
    const { id } = await params;

    const [result] = await db.query(
      "DELETE FROM client_interest_vehicles WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Vehículo de interés no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Vehículo de interés eliminado" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}