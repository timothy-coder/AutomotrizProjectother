import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* =========================
   GET: listar oportunidades por cliente
   /api/oportunidades/bycliente?cliente_id=1
========================= */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const cliente_id = searchParams.get("cliente_id");

    if (!cliente_id) {
      return NextResponse.json(
        { message: "cliente_id es obligatorio" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      `
      SELECT
        o.id,
        o.cliente_id,
        o.marca_id,
        o.modelo_id,
        o.origen_id,
        o.suborigen_id,
        o.detalle,
        o.etapasconversion_id,
        o.creado_por,
        o.asignado_a,
        o.created_at,
        o.updated_at,

        c.name AS cliente_name,
        m.name AS marca_name,
        mo.name AS modelo_name,
        oc.name AS origen_name,
        sc.name AS suborigen_name,
        ec.name AS etapa_name,
        u1.fullname AS creado_por_name,
        u2.fullname AS asignado_a_name

      FROM oportunidades o
      LEFT JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN marcas m ON m.id = o.marca_id
      LEFT JOIN modelos mo ON mo.id = o.modelo_id
      LEFT JOIN origenes_citas oc ON oc.id = o.origen_id
      LEFT JOIN suborigenes_citas sc ON sc.id = o.suborigen_id
      LEFT JOIN etapasconversion ec ON ec.id = o.etapasconversion_id
      LEFT JOIN usuarios u1 ON u1.id = o.creado_por
      LEFT JOIN usuarios u2 ON u2.id = o.asignado_a

      WHERE o.cliente_id = ?
      ORDER BY o.id DESC
      `,
      [cliente_id]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al listar oportunidades por cliente" },
      { status: 500 }
    );
  }
}