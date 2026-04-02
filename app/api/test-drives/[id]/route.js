// app/api/test-drives/[id]/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const [rows] = await db.query('SELECT * FROM test_drives WHERE id = ?', [id]);

    if (rows.length === 0) {
      return NextResponse.json({ message: "Test drive no encontrado" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);

  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const {
      hora_inicio,
      hora_fin,
      vin,
      placa,
      descripcion,
      estado,
    } = await request.json();

    await db.query(`
      UPDATE test_drives 
      SET hora_inicio = ?, hora_fin = ?, vin = ?, placa = ?, descripcion = ?, estado = ?
      WHERE id = ?
    `, [
      hora_inicio || null,
      hora_fin || null,
      vin || null,
      placa || null,
      descripcion || null,
      estado || 'programado',
      id,
    ]);

    return NextResponse.json({ message: "Test drive actualizado" });

  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.query('DELETE FROM test_drives WHERE id = ?', [id]);
    return NextResponse.json({ message: "Test drive eliminado" });

  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}