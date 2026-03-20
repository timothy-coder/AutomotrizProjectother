// app/api/oportunidades/[id]/cambiar-etapa/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(request, { params }) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id } = await params;
    const body = await request.json();

    const {
      etapasconversion_id,
      created_by,
    } = body;

    // Validar campos requeridos
    if (!etapasconversion_id) {
      await conn.rollback();
      return NextResponse.json(
        { message: "etapasconversion_id es obligatorio" },
        { status: 400 }
      );
    }

    if (!created_by) {
      await conn.rollback();
      return NextResponse.json(
        { message: "created_by es obligatorio" },
        { status: 400 }
      );
    }

    // Verificar que la oportunidad existe
    const [oportunidad] = await conn.query(
      `SELECT id, oportunidad_id, etapasconversion_id FROM oportunidades WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!oportunidad.length) {
      await conn.rollback();
      return NextResponse.json(
        { message: "Oportunidad no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que el usuario existe
    const [usuario] = await conn.query(
      `SELECT id FROM usuarios WHERE id = ? LIMIT 1`,
      [created_by]
    );

    if (!usuario.length) {
      await conn.rollback();
      return NextResponse.json(
        { message: "El usuario no existe" },
        { status: 404 }
      );
    }

    // Verificar que la etapa existe
    const [etapa] = await conn.query(
      `SELECT id, nombre FROM etapasconversion WHERE id = ? LIMIT 1`,
      [etapasconversion_id]
    );

    if (!etapa.length) {
      await conn.rollback();
      return NextResponse.json(
        { message: "La etapa de conversión no existe" },
        { status: 404 }
      );
    }

    const etapaActual = oportunidad[0].etapasconversion_id;
    const etapaNueva = etapasconversion_id;

    // No permitir cambio a la misma etapa
    if (etapaActual === etapaNueva) {
      await conn.rollback();
      return NextResponse.json(
        { message: "La oportunidad ya está en esta etapa" },
        { status: 400 }
      );
    }

    // Actualizar la etapa
    await conn.query(
      `UPDATE oportunidades SET etapasconversion_id = ? WHERE id = ?`,
      [etapasconversion_id, id]
    );

    // Registrar la actividad del cambio de etapa
    await conn.query(
      `
      INSERT INTO actividades_oportunidades
      (oportunidad_id, etapasconversion_id, detalle, created_by)
      VALUES (?, ?, ?, ?)
      `,
      [
        id,
        etapasconversion_id,
        `Cambio de etapa`,
        created_by,
      ]
    );

    await conn.commit();

    return NextResponse.json({
      message: "Etapa actualizada exitosamente",
      oportunidad_id: oportunidad[0].oportunidad_id,
      etapa_anterior: etapaActual,
      etapa_nueva: etapaNueva,
      etapa_nombre: etapa[0].nombre,
    });

  } catch (error) {
    await conn.rollback();
    console.error("PUT /api/oportunidades/[id]/cambiar-etapa error:", error);
    return NextResponse.json(
      {
        message: "Error al cambiar etapa",
        error: error.message,
      },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}