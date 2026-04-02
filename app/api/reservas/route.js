// app/api/reservas/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const oportunidadId = searchParams.get('oportunidad_id');

    let sql = 'SELECT * FROM reservas WHERE 1=1';
    const params = [];

    if (oportunidadId) {
      sql += ' AND oportunidad_id = ?';
      params.push(oportunidadId);
    }

    sql += ' ORDER BY created_at DESC';

    const [rows] = await db.query(sql, params);
    return NextResponse.json(rows);

  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const {
      oportunidad_id,
      created_by,
    } = await req.json();

    if (!oportunidad_id || !created_by) {
      return NextResponse.json(
        { message: "oportunidad_id y created_by son requeridos" },
        { status: 400 }
      );
    }

    await db.query(`
      INSERT INTO reservas (oportunidad_id, created_by)
      VALUES (?, ?)
    `, [oportunidad_id, created_by]);

    return NextResponse.json({ message: "Reserva creada" });

  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error: " + e.message }, { status: 500 });
  }
}