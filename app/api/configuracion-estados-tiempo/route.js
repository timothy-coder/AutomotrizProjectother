import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* =========================
   GET: listar configuración de estados de tiempo
========================= */
export async function GET(req) {
  try {
    const query = `
      SELECT
        id,
        nombre,
        estado,
        minutos_desde,
        minutos_hasta,
        color_hexadecimal,
        descripcion,
        activo,
        created_at,
        updated_at
      FROM configuracion_estados_tiempo
      WHERE activo = 1
      ORDER BY minutos_desde DESC
    `;

    const [rows] = await db.query(query);

    return NextResponse.json(rows);
  } catch (error) {
    console.error("GET /api/configuracion-estados-tiempo error:", error);
    return NextResponse.json(
      { message: "Error al listar configuración", error: error.message },
      { status: 500 }
    );
  }
}

/* =========================
   POST: crear configuración de estado de tiempo
========================= */
export async function POST(req) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const body = await req.json();

    const nombre = body.nombre?.trim();
    const estado = body.estado?.trim();
    const minutos_desde = body.minutos_desde ? Number(body.minutos_desde) : null;
    const minutos_hasta = body.minutos_hasta ? Number(body.minutos_hasta) : null;
    const color_hexadecimal = body.color_hexadecimal?.trim();
    const descripcion = body.descripcion?.trim() || null;
    const activo = body.activo !== undefined ? Number(body.activo) : 1;

    // Validaciones
    if (!nombre) {
      await conn.rollback();
      return NextResponse.json(
        { message: "nombre es obligatorio" },
        { status: 400 }
      );
    }

    if (!estado) {
      await conn.rollback();
      return NextResponse.json(
        { message: "estado es obligatorio" },
        { status: 400 }
      );
    }

    if (minutos_desde === null || minutos_desde === undefined) {
      await conn.rollback();
      return NextResponse.json(
        { message: "minutos_desde es obligatorio" },
        { status: 400 }
      );
    }

    if (minutos_hasta === null || minutos_hasta === undefined) {
      await conn.rollback();
      return NextResponse.json(
        { message: "minutos_hasta es obligatorio" },
        { status: 400 }
      );
    }

    if (!color_hexadecimal) {
      await conn.rollback();
      return NextResponse.json(
        { message: "color_hexadecimal es obligatorio" },
        { status: 400 }
      );
    }

    // Validar que el estado sea único
    const [existente] = await conn.query(
      `SELECT id FROM configuracion_estados_tiempo WHERE estado = ? LIMIT 1`,
      [estado]
    );

    if (existente.length) {
      await conn.rollback();
      return NextResponse.json(
        { message: "El estado ya existe" },
        { status: 400 }
      );
    }

    // Validar rango de minutos
    if (minutos_desde > minutos_hasta) {
      await conn.rollback();
      return NextResponse.json(
        { message: "minutos_desde no puede ser mayor que minutos_hasta" },
        { status: 400 }
      );
    }

    const [result] = await conn.query(
      `
      INSERT INTO configuracion_estados_tiempo
      (nombre, estado, minutos_desde, minutos_hasta, color_hexadecimal, descripcion, activo)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [nombre, estado, minutos_desde, minutos_hasta, color_hexadecimal, descripcion, activo]
    );

    await conn.commit();

    return NextResponse.json(
      {
        message: "Configuración de estado de tiempo creada",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    await conn.rollback();
    console.error("POST /api/configuracion-estados-tiempo error:", error);
    return NextResponse.json(
      {
        message: "Error al crear configuración",
        error: error.message,
      },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}