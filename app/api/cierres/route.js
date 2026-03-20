// app/api/cierres/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const oportunidadId = searchParams.get('oportunidad_id');

    let sql = 'SELECT * FROM cierres WHERE 1=1';
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
      detalle,
      created_by,
    } = await req.json();

    if (!oportunidad_id || !detalle || !created_by) {
      return NextResponse.json(
        { message: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    await db.query(`
      INSERT INTO cierres (oportunidad_id, detalle, created_by)
      VALUES (?, ?, ?)
    `, [oportunidad_id, detalle, created_by]);

    return NextResponse.json({ message: "Cierre creado" });

  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}