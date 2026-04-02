import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";


// =====================================
// GET → listar recepciones
// =====================================
export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);

    const fecha = searchParams.get("fecha"); // opcional filtro
    const cliente_id = searchParams.get("cliente_id");

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
      WHERE (? IS NULL OR r.fecha_recepcion = ?)
        AND (? IS NULL OR r.cliente_id = ?)
      ORDER BY r.id DESC
      `,
      [fecha || null, fecha || null, cliente_id || null, cliente_id || null]
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
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

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

    const notas_cliente = body.notas_cliente?.trim() || null;
    const notas_generales = body.notas_generales?.trim() || null;

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
