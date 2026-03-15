import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* =========================
   GET: listar oportunidades
   - solo devuelve las vigentes
   - si una oportunidad fue reprogramada, muestra solo la última
   - solo lista registros LD-[numero]
========================= */
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const cliente_id = searchParams.get("cliente_id");
    const origen_id = searchParams.get("origen_id");
    const etapasconversion_id = searchParams.get("etapasconversion_id");
    const asignado_a = searchParams.get("asignado_a");
    const created_by = searchParams.get("created_by");
    const fecha_desde = searchParams.get("fecha_desde");
    const fecha_hasta = searchParams.get("fecha_hasta");

    let query = `
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
        o.fecha_agenda,
        o.hora_agenda,
        o.created_at,
        o.updated_at,

        ec.color AS etapa_color,
        ec.sort_order AS etapa_sort_order,

        COALESCE((
          SELECT SUM(CAST(ec2.descripcion AS DECIMAL(10,2)))
          FROM etapasconversion ec2
          WHERE ec2.sort_order <= ec.sort_order
            AND ec2.descripcion IS NOT NULL
            AND ec2.descripcion REGEXP '^-?[0-9]+(\\\\.[0-9]+)?$'
        ), 0) AS temperatura,

        c.nombre AS cliente_name,
        m.name AS marca_name,
        mo.name AS modelo_name,
        oc.name AS origen_name,
        sc.name AS suborigen_name,
        ec.nombre AS etapa_name,
        u1.fullname AS created_by_name,
        u2.fullname AS asignado_a_name,
        op.oportunidad_id AS oportunidad_padre_codigo

      FROM oportunidades o
      LEFT JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN marcas m ON m.id = o.marca_id
      LEFT JOIN modelos mo ON mo.id = o.modelo_id
      LEFT JOIN origenes_citas oc ON oc.id = o.origen_id
      LEFT JOIN suborigenes_citas sc ON sc.id = o.suborigen_id
      LEFT JOIN etapasconversion ec ON ec.id = o.etapasconversion_id
      LEFT JOIN usuarios u1 ON u1.id = o.created_by
      LEFT JOIN usuarios u2 ON u2.id = o.asignado_a
      LEFT JOIN oportunidades op ON op.id = o.oportunidad_padre_id
      WHERE 1 = 1
        AND o.oportunidad_id REGEXP '^LD-[0-9]+$'
        AND NOT EXISTS (
          SELECT 1
          FROM oportunidades child
          WHERE child.oportunidad_padre_id = o.id
        )
    `;

    const params = [];

    if (cliente_id) {
      query += ` AND o.cliente_id = ?`;
      params.push(cliente_id);
    }

    if (origen_id) {
      query += ` AND o.origen_id = ?`;
      params.push(origen_id);
    }

    if (etapasconversion_id) {
      query += ` AND o.etapasconversion_id = ?`;
      params.push(etapasconversion_id);
    }

    if (asignado_a) {
      query += ` AND o.asignado_a = ?`;
      params.push(asignado_a);
    }

    if (created_by) {
      query += ` AND o.created_by = ?`;
      params.push(created_by);
    }

    if (fecha_desde) {
      query += ` AND o.fecha_agenda >= ?`;
      params.push(fecha_desde);
    }

    if (fecha_hasta) {
      query += ` AND o.fecha_agenda <= ?`;
      params.push(fecha_hasta);
    }

    query += ` ORDER BY o.fecha_agenda ASC, o.hora_agenda ASC, o.id DESC`;

    const [rows] = await db.query(query, params);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/oportunidades error:", error);
    return NextResponse.json(
      { message: "Error al listar oportunidades", error: error.message },
      { status: 500 }
    );
  }
}

/* =========================
   POST: crear oportunidad o reprogramar
   - reprogramación conserva el mismo código del padre
   - nuevas oportunidades generan correlativo LD-[numero]
========================= */
export async function POST(req) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

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

    const created_by = Number(body.created_by || body.creado_por);

    const bodyTraeAsignadoA =
      body.asignado_a !== null &&
      body.asignado_a !== undefined &&
      body.asignado_a !== "";

    const asignado_a = bodyTraeAsignadoA ? Number(body.asignado_a) : null;

    const fecha_agenda =
      body.fecha_agenda && String(body.fecha_agenda).trim() !== ""
        ? String(body.fecha_agenda).trim()
        : null;

    const hora_agenda =
      body.hora_agenda && String(body.hora_agenda).trim() !== ""
        ? String(body.hora_agenda).trim()
        : null;

    const oportunidad_padre_id =
      body.oportunidad_padre_id === null ||
      body.oportunidad_padre_id === undefined ||
      body.oportunidad_padre_id === ""
        ? null
        : Number(body.oportunidad_padre_id);

    const esReprogramacion = !!oportunidad_padre_id;

    if (!created_by) {
      await conn.rollback();
      return NextResponse.json(
        { message: "created_by es obligatorio" },
        { status: 400 }
      );
    }

    const [creador] = await conn.query(
      `SELECT id FROM usuarios WHERE id = ? LIMIT 1`,
      [created_by]
    );

    if (!creador.length) {
      await conn.rollback();
      return NextResponse.json(
        { message: "El usuario creador no existe" },
        { status: 404 }
      );
    }

    let finalClienteId = cliente_id;
    let finalMarcaId = marca_id;
    let finalModeloId = modelo_id;
    let finalOrigenId = origen_id;
    let finalSuborigenId = suborigen_id;
    let finalEtapaId = etapasconversion_id;
    let finalAsignadoA = asignado_a;
    let finalOportunidadCodigo = null;

    if (esReprogramacion) {
      const [padreRows] = await conn.query(
        `
        SELECT *
        FROM oportunidades
        WHERE id = ?
        LIMIT 1
        `,
        [oportunidad_padre_id]
      );

      if (!padreRows.length) {
        await conn.rollback();
        return NextResponse.json(
          { message: "La oportunidad original no existe" },
          { status: 404 }
        );
      }

      const padre = padreRows[0];

      finalClienteId = padre.cliente_id;
      finalMarcaId = padre.marca_id;
      finalModeloId = padre.modelo_id;
      finalOrigenId = padre.origen_id;
      finalSuborigenId = padre.suborigen_id;
      finalEtapaId = padre.etapasconversion_id;
      finalOportunidadCodigo = padre.oportunidad_id;

      if (!bodyTraeAsignadoA) {
        finalAsignadoA = padre.asignado_a ?? null;
      }

      if (!fecha_agenda || !hora_agenda) {
        await conn.rollback();
        return NextResponse.json(
          { message: "Para reprogramar debes enviar fecha_agenda y hora_agenda" },
          { status: 400 }
        );
      }
    } else {
      if (
        !finalClienteId ||
        !finalMarcaId ||
        !finalModeloId ||
        !finalOrigenId ||
        !finalEtapaId
      ) {
        await conn.rollback();
        return NextResponse.json(
          {
            message:
              "cliente_id, marca_id, modelo_id, origen_id y etapasconversion_id son obligatorios",
          },
          { status: 400 }
        );
      }
    }

    const [cliente] = await conn.query(
      `SELECT id FROM clientes WHERE id = ? LIMIT 1`,
      [finalClienteId]
    );
    if (!cliente.length) {
      await conn.rollback();
      return NextResponse.json(
        { message: "El cliente no existe" },
        { status: 404 }
      );
    }

    const [marca] = await conn.query(
      `SELECT id FROM marcas WHERE id = ? LIMIT 1`,
      [finalMarcaId]
    );
    if (!marca.length) {
      await conn.rollback();
      return NextResponse.json(
        { message: "La marca no existe" },
        { status: 404 }
      );
    }

    const [modelo] = await conn.query(
      `SELECT id FROM modelos WHERE id = ? LIMIT 1`,
      [finalModeloId]
    );
    if (!modelo.length) {
      await conn.rollback();
      return NextResponse.json(
        { message: "El modelo no existe" },
        { status: 404 }
      );
    }

    const [origen] = await conn.query(
      `SELECT id FROM origenes_citas WHERE id = ? LIMIT 1`,
      [finalOrigenId]
    );
    if (!origen.length) {
      await conn.rollback();
      return NextResponse.json(
        { message: "El origen no existe" },
        { status: 404 }
      );
    }

    if (finalSuborigenId) {
      const [suborigen] = await conn.query(
        `
        SELECT id
        FROM suborigenes_citas
        WHERE id = ? AND origen_id = ?
        LIMIT 1
        `,
        [finalSuborigenId, finalOrigenId]
      );

      if (!suborigen.length) {
        await conn.rollback();
        return NextResponse.json(
          {
            message: "El suborigen no existe o no pertenece al origen seleccionado",
          },
          { status: 400 }
        );
      }
    }

    const [etapa] = await conn.query(
      `SELECT id FROM etapasconversion WHERE id = ? LIMIT 1`,
      [finalEtapaId]
    );
    if (!etapa.length) {
      await conn.rollback();
      return NextResponse.json(
        { message: "La etapa de conversión no existe" },
        { status: 404 }
      );
    }

    if (finalAsignadoA) {
      const [asignado] = await conn.query(
        `SELECT id FROM usuarios WHERE id = ? LIMIT 1`,
        [finalAsignadoA]
      );

      if (!asignado.length) {
        await conn.rollback();
        return NextResponse.json(
          { message: "El usuario asignado no existe" },
          { status: 404 }
        );
      }
    }

    if (!esReprogramacion) {
      const [maxRows] = await conn.query(`
        SELECT COALESCE(
          MAX(CAST(SUBSTRING(oportunidad_id, 4) AS UNSIGNED)),
          0
        ) AS max_num
        FROM oportunidades
        WHERE oportunidad_padre_id IS NULL
          AND oportunidad_id REGEXP '^LD-[0-9]+$'
      `);

      const nextNum = Number(maxRows?.[0]?.max_num || 0) + 1;
      finalOportunidadCodigo = `LD-${nextNum}`;
    }

    const [result] = await conn.query(
      `
      INSERT INTO oportunidades
      (
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
        oportunidad_padre_id,
        oportunidad_id
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        finalClienteId,
        finalMarcaId,
        finalModeloId,
        finalOrigenId,
        finalSuborigenId,
        detalle,
        finalEtapaId,
        created_by,
        finalAsignadoA,
        fecha_agenda,
        hora_agenda,
        oportunidad_padre_id,
        finalOportunidadCodigo,
      ]
    );

    await conn.commit();

    return NextResponse.json(
      {
        message: esReprogramacion
          ? "Oportunidad reprogramada"
          : "Oportunidad creada",
        id: result.insertId,
        oportunidad_id: finalOportunidadCodigo,
      },
      { status: 201 }
    );
  } catch (error) {
    await conn.rollback();
    console.error("POST /api/oportunidades error:", error);
    return NextResponse.json(
      {
        message: "Error al crear oportunidad",
        error: error.message,
      },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}
