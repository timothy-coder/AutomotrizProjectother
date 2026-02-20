import { NextResponse } from "next/server";
import { db } from "@/lib/db";


// =====================================
// GET → listar recepciones
// =====================================
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const fecha = searchParams.get("fecha"); // opcional filtro
    const cliente_id = searchParams.get("cliente_id");

    const where = [];
    const params = [];

    if (fecha) {
      where.push("r.fecha_recepcion = ?");
      params.push(fecha);
    }

    if (cliente_id) {
      where.push("r.cliente_id = ?");
      params.push(cliente_id);
    }

    const whereSQL = where.length ? `WHERE ${where.join(" AND ")}` : "";

    const [rows] = await db.query(
      `
      SELECT
        r.*,
        CONCAT(c.nombre,' ',c.apellido) AS cliente_nombre,
        v.placas,
        ce.nombre AS centro,
        t.nombre AS taller,
        u.fullname AS creado_por
      FROM recepciones r
      LEFT JOIN clientes c ON c.id = r.cliente_id
      LEFT JOIN vehiculos v ON v.id = r.carro_id
      LEFT JOIN centros ce ON ce.id = r.centro_id
      LEFT JOIN talleres t ON t.id = r.taller_id
      LEFT JOIN usuarios u ON u.id = r.created_by
      ${whereSQL}
      ORDER BY r.id DESC
      `,
      params
    );

    return NextResponse.json(rows);

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error obteniendo recepciones" },
      { status: 500 }
    );
  }
}


// =====================================
// POST → crear recepción
// =====================================
export async function POST(req) {
  try {
    const body = await req.json();

    const cliente_id = Number(body.cliente_id);
    const carro_id = Number(body.carro_id);

    if (!cliente_id || !carro_id) {
      return NextResponse.json(
        { message: "cliente_id y carro_id son obligatorios" },
        { status: 400 }
      );
    }

    const centro_id = body.centro_id || null;
    const taller_id = body.taller_id || null;
    const cita_id = body.cita_id || null;

    const notas_cliente = body.notas_cliente || null;
    const notas_generales = body.notas_generales || null;

    // fecha y hora automáticas si no se envían
    const fecha_recepcion =
      body.fecha_recepcion ||
      new Date().toISOString().slice(0, 10);

    const hora_recepcion =
      body.hora_recepcion ||
      new Date().toTimeString().slice(0, 8);

    const created_by = body.created_by || null;

    const [result] = await db.query(
      `
      INSERT INTO recepciones (
        cliente_id,
        carro_id,
        centro_id,
        taller_id,
        cita_id,
        notas_cliente,
        notas_generales,
        fecha_recepcion,
        hora_recepcion,
        created_by
      )
      VALUES (?,?,?,?,?,?,?,?,?,?)
      `,
      [
        cliente_id,
        carro_id,
        centro_id,
        taller_id,
        cita_id,
        notas_cliente,
        notas_generales,
        fecha_recepcion,
        hora_recepcion,
        created_by,
      ]
    );

    return NextResponse.json({
      message: "Recepción creada",
      id: result.insertId,
    });

  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error creando recepción" },
      { status: 500 }
    );
  }
}
