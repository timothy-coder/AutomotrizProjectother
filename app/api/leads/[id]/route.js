import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const REGEX_LD = "^LD-[0-9]+$";

/* =========================
   GET: obtener un lead
   - solo LD
========================= */
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const [rows] = await db.query(
      `
      SELECT
        o.id,
        o.oportunidad_id,
        o.oportunidad_padre_id,
        o.cliente_id,
        o.marca_id,
        o.modelo_id,
        o.origen_id,
        o.suborigen_id,
        o.detalle,
        o.etapasconversion_id,
        o.created_by,
        o.asignado_a,

        ec.sort_order AS etapa_sort_order,
        ec.color AS etapa_color,

        COALESCE((
          SELECT SUM(CAST(ec2.descripcion AS DECIMAL(10,2)))
          FROM etapasconversion ec2
          WHERE ec2.sort_order <= ec.sort_order
            AND ec2.descripcion IS NOT NULL
            AND ec2.descripcion REGEXP '^-?[0-9]+(\\\\.[0-9]+)?$'
        ), 0) AS temperatura,

        DATE_FORMAT(o.fecha_agenda, '%Y-%m-%d') AS fecha_agenda,
        TIME_FORMAT(o.hora_agenda, '%H:%i') AS hora_agenda,
        o.created_at,
        o.updated_at,

        c.nombre AS cliente_name,
        m.name AS marca_name,
        mo.name AS modelo_name,
        oc.name AS origen_name,
        sc.name AS suborigen_name,
        ec.nombre AS etapa_name,
        u1.fullname AS created_by_name,
        u2.fullname AS asignado_a_name

      FROM oportunidades o
      LEFT JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN marcas m ON m.id = o.marca_id
      LEFT JOIN modelos mo ON mo.id = o.modelo_id
      LEFT JOIN origenes_citas oc ON oc.id = o.origen_id
      LEFT JOIN suborigenes_citas sc ON sc.id = o.suborigen_id
      LEFT JOIN etapasconversion ec ON ec.id = o.etapasconversion_id
      LEFT JOIN usuarios u1 ON u1.id = o.created_by
      LEFT JOIN usuarios u2 ON u2.id = o.asignado_a
      WHERE o.id = ?
        AND o.oportunidad_id REGEXP ?
      LIMIT 1
      `,
      [id, REGEX_LD]
    );

    if (!rows.length) {
      return NextResponse.json(
        { message: "Lead LD no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("GET /api/leads/[id] error:", error);
    return NextResponse.json(
      {
        message: "Error al obtener lead",
        error: error.message,
      },
      { status: 500 }
    );
  }
}

/* =========================
   PUT: actualizar lead
   - solo LD
========================= */
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const cliente_id = body.cliente_id ? Number(body.cliente_id) : null;
    const marca_id = body.marca_id ? Number(body.marca_id) : null;
    const modelo_id = body.modelo_id ? Number(body.modelo_id) : null;
    const origen_id = body.origen_id ? Number(body.origen_id) : null;

    const suborigen_id =
      body.suborigen_id === null ||
      body.suborigen_id === undefined ||
      body.suborigen_id === ""
        ? null
        : Number(body.suborigen_id);

    const detalle = (body.detalle || "").trim() || null;

    const etapasconversion_id = body.etapasconversion_id
      ? Number(body.etapasconversion_id)
      : null;

    const created_by =
      body.created_by === null ||
      body.created_by === undefined ||
      body.created_by === ""
        ? null
        : Number(body.created_by);

    const asignado_a =
      body.asignado_a === null ||
      body.asignado_a === undefined ||
      body.asignado_a === ""
        ? null
        : Number(body.asignado_a);

    const fecha_agenda =
      body.fecha_agenda && String(body.fecha_agenda).trim() !== ""
        ? String(body.fecha_agenda).trim()
        : null;

    const hora_agenda =
      body.hora_agenda && String(body.hora_agenda).trim() !== ""
        ? String(body.hora_agenda).trim()
        : null;

    if (
      !cliente_id ||
      !marca_id ||
      !modelo_id ||
      !origen_id ||
      !etapasconversion_id ||
      !created_by ||
      !fecha_agenda ||
      !hora_agenda
    ) {
      return NextResponse.json(
        {
          message:
            "cliente_id, marca_id, modelo_id, origen_id, etapasconversion_id, created_by, fecha_agenda y hora_agenda son obligatorios",
        },
        { status: 400 }
      );
    }

    const [exists] = await db.query(
      `
      SELECT id
      FROM oportunidades
      WHERE id = ?
        AND oportunidad_id REGEXP ?
      LIMIT 1
      `,
      [id, REGEX_LD]
    );

    if (!exists.length) {
      return NextResponse.json(
        { message: "Lead LD no encontrado" },
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
      [created_by]
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
        created_by = ?,
        asignado_a = ?,
        fecha_agenda = ?,
        hora_agenda = ?,
        updated_at = NOW()
      WHERE id = ?
        AND oportunidad_id REGEXP ?
      `,
      [
        cliente_id,
        marca_id,
        modelo_id,
        origen_id,
        suborigen_id,
        detalle,
        etapasconversion_id,
        created_by,
        asignado_a,
        fecha_agenda,
        hora_agenda,
        id,
        REGEX_LD,
      ]
    );

    return NextResponse.json({
      message: "Lead LD actualizado",
    });
  } catch (error) {
    console.error("PUT /api/leads/[id] error:", error);
    return NextResponse.json(
      {
        message: "Error al actualizar lead",
        error: error.message,
        sqlMessage: error.sqlMessage || null,
        code: error.code || null,
      },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE: eliminar lead
   - solo LD
========================= */
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    const [result] = await db.query(
      `
      DELETE FROM oportunidades
      WHERE id = ?
        AND oportunidad_id REGEXP ?
      `,
      [id, REGEX_LD]
    );

    if (!result.affectedRows) {
      return NextResponse.json(
        { message: "Lead LD no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Lead LD eliminado" });
  } catch (error) {
    console.error("DELETE /api/leads/[id] error:", error);
    return NextResponse.json(
      {
        message: "Error al eliminar lead",
        error: error.message,
      },
      { status: 500 }
    );
  }
}
