import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* =========================
   GET: obtener una oportunidad
========================= */
export async function GET(req, { params }) {
  try {
    const { id } = await params;

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
      WHERE o.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return NextResponse.json(
        { message: "Oportunidad no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al obtener oportunidad" },
      { status: 500 }
    );
  }
}

/* =========================
   PUT: actualizar oportunidad
========================= */
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const cliente_id = Number(body.cliente_id);
    const marca_id = Number(body.marca_id);
    const modelo_id = Number(body.modelo_id);
    const origen_id = Number(body.origen_id);

    const suborigen_id =
      body.suborigen_id === null ||
      body.suborigen_id === undefined ||
      body.suborigen_id === ""
        ? null
        : Number(body.suborigen_id);

    const detalle = (body.detalle || "").trim() || null;
    const etapasconversion_id = Number(body.etapasconversion_id);
    const creado_por = Number(body.creado_por);

    const asignado_a =
      body.asignado_a === null ||
      body.asignado_a === undefined ||
      body.asignado_a === ""
        ? null
        : Number(body.asignado_a);

    if (
      !cliente_id ||
      !marca_id ||
      !modelo_id ||
      !origen_id ||
      !etapasconversion_id ||
      !creado_por
    ) {
      return NextResponse.json(
        {
          message:
            "cliente_id, marca_id, modelo_id, origen_id, etapasconversion_id y creado_por son obligatorios",
        },
        { status: 400 }
      );
    }

    const [exists] = await db.query(
      `SELECT id FROM oportunidades WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!exists.length) {
      return NextResponse.json(
        { message: "Oportunidad no encontrada" },
        { status: 404 }
      );
    }

    const [cliente] = await db.query(
      `SELECT id FROM clientes WHERE id = ? LIMIT 1`,
      [cliente_id]
    );
    if (!cliente.length) {
      return NextResponse.json(
        { message: "El cliente no existe" },
        { status: 404 }
      );
    }

    const [marca] = await db.query(
      `SELECT id FROM marcas WHERE id = ? LIMIT 1`,
      [marca_id]
    );
    if (!marca.length) {
      return NextResponse.json(
        { message: "La marca no existe" },
        { status: 404 }
      );
    }

    const [modelo] = await db.query(
      `SELECT id FROM modelos WHERE id = ? LIMIT 1`,
      [modelo_id]
    );
    if (!modelo.length) {
      return NextResponse.json(
        { message: "El modelo no existe" },
        { status: 404 }
      );
    }

    const [origen] = await db.query(
      `SELECT id FROM origenes_citas WHERE id = ? LIMIT 1`,
      [origen_id]
    );
    if (!origen.length) {
      return NextResponse.json(
        { message: "El origen no existe" },
        { status: 404 }
      );
    }

    if (suborigen_id) {
      const [suborigen] = await db.query(
        `
        SELECT id
        FROM suborigenes_citas
        WHERE id = ? AND origen_id = ?
        LIMIT 1
        `,
        [suborigen_id, origen_id]
      );

      if (!suborigen.length) {
        return NextResponse.json(
          {
            message: "El suborigen no existe o no pertenece al origen seleccionado",
          },
          { status: 400 }
        );
      }
    }

    const [etapa] = await db.query(
      `SELECT id FROM etapasconversion WHERE id = ? LIMIT 1`,
      [etapasconversion_id]
    );
    if (!etapa.length) {
      return NextResponse.json(
        { message: "La etapa de conversión no existe" },
        { status: 404 }
      );
    }

    const [creador] = await db.query(
      `SELECT id FROM usuarios WHERE id = ? LIMIT 1`,
      [creado_por]
    );
    if (!creador.length) {
      return NextResponse.json(
        { message: "El usuario creador no existe" },
        { status: 404 }
      );
    }

    if (asignado_a) {
      const [asignado] = await db.query(
        `SELECT id FROM usuarios WHERE id = ? LIMIT 1`,
        [asignado_a]
      );

      if (!asignado.length) {
        return NextResponse.json(
          { message: "El usuario asignado no existe" },
          { status: 404 }
        );
      }
    }

    await db.query(
      `
      UPDATE oportunidades
      SET
        cliente_id = ?,
        marca_id = ?,
        modelo_id = ?,
        origen_id = ?,
        suborigen_id = ?,
        detalle = ?,
        etapasconversion_id = ?,
        creado_por = ?,
        asignado_a = ?
      WHERE id = ?
      `,
      [
        cliente_id,
        marca_id,
        modelo_id,
        origen_id,
        suborigen_id,
        detalle,
        etapasconversion_id,
        creado_por,
        asignado_a,
        id,
      ]
    );

    return NextResponse.json({ message: "Oportunidad actualizada" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al actualizar oportunidad" },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE: eliminar oportunidad
========================= */
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    const [result] = await db.query(
      `DELETE FROM oportunidades WHERE id = ?`,
      [id]
    );

    if (!result.affectedRows) {
      return NextResponse.json(
        { message: "Oportunidad no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Oportunidad eliminada" });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al eliminar oportunidad" },
      { status: 500 }
    );
  }
}