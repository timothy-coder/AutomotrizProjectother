// app/api/test-drives/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const oportunidadId = searchParams.get('oportunidad_id');
    const clienteId = searchParams.get('cliente_id');
    const estado = searchParams.get('estado');

    let sql = 'SELECT * FROM test_drives WHERE 1=1';
    const params = [];

    if (oportunidadId) {
      sql += ' AND oportunidad_id = ?';
      params.push(oportunidadId);
    }

    if (clienteId) {
      sql += ' AND cliente_id = ?';
      params.push(clienteId);
    }

    if (estado) {
      sql += ' AND estado = ?';
      params.push(estado);
    }

    sql += ' ORDER BY fecha_testdrive DESC';

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
      cliente_id,
      fecha_testdrive,
      hora_inicio,
      hora_fin,
      modelo_id,
      vin,
      placa,
      descripcion,
      estado,
      created_by,
    } = await req.json();

    if (!oportunidad_id || !cliente_id || !fecha_testdrive || !hora_inicio || !created_by) {
      return NextResponse.json(
        { message: "Faltan campos requeridos: oportunidad_id, cliente_id, fecha_testdrive, hora_inicio, created_by" },
        { status: 400 }
      );
    }

    await db.query(`
      INSERT INTO test_drives 
      (oportunidad_id, cliente_id, fecha_testdrive, hora_inicio, hora_fin, modelo_id, vin, placa, descripcion, estado, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      oportunidad_id,
      cliente_id,
      fecha_testdrive,
      hora_inicio,
      hora_fin || null,
      modelo_id || null,
      vin || null,
      placa || null,
      descripcion || null,
      estado || 'programado',
      created_by,
    ]);

    return NextResponse.json({ message: "Test drive creado" });

  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error: " + e.message }, { status: 500 });
  }
}