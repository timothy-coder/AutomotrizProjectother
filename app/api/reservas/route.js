import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const oportunidadId = searchParams.get('oportunidad_id');

    let sql = `SELECT 
                r.*, 
                u.fullname as created_by_name,
                oo.id as oportunidad_internal_id,
                CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre,
                c.id as cliente_id
               FROM reservas r
               LEFT JOIN usuarios u ON r.created_by = u.id
               INNER JOIN oportunidades_oportunidades oo ON r.oportunidad_id = oo.id
               INNER JOIN clientes c ON oo.cliente_id = c.id
               WHERE 1=1`;
    const params = [];

    if (oportunidadId) {
      sql += ' AND r.oportunidad_id = ?';
      params.push(oportunidadId);
    }

    sql += ' ORDER BY r.created_at DESC';

    const [rows] = await db.query(sql, params);
    return NextResponse.json(rows);

  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error: " + e.message }, { status: 500 });
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

    const [result] = await db.query(`
      INSERT INTO reservas (oportunidad_id, created_by, estado)
      VALUES (?, ?, 'borrador')
    `, [oportunidad_id, created_by]);

    return NextResponse.json({ 
      message: "Reserva creada",
      id: result.insertId
    });

  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error: " + e.message }, { status: 500 });
  }
}