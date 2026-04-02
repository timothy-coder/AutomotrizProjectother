// app/api/cierres/[id]/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    const { id } = await params;
    const [rows] = await db.query('SELECT * FROM cierres WHERE id = ?', [id]);

    if (rows.length === 0) {
      return NextResponse.json({ message: "Cierre no encontrado" }, { status: 404 });
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
    const { detalle } = await request.json();

    await db.query(`
      UPDATE cierres SET detalle = ? WHERE id = ?
    `, [detalle, id]);

    return NextResponse.json({ message: "Cierre actualizado" });

  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;
    await db.query('DELETE FROM cierres WHERE id = ?', [id]);
    return NextResponse.json({ message: "Cierre eliminado" });

  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}