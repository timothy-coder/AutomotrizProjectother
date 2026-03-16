import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const REGEX_LD = "^LD-[0-9]+$";

async function getEtapaIdByNombre(nombre) {
  const [rows] = await db.query(
    `
    SELECT id
    FROM etapasconversionpv
    WHERE LOWER(nombre) = LOWER(?)
    LIMIT 1
    `,
    [nombre]
  );

  return rows.length ? rows[0].id : null;
}

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const asignado_a =
      body.asignado_a === null ||
      body.asignado_a === undefined ||
      body.asignado_a === ""
        ? null
        : Number(body.asignado_a);

    const [exists] = await db.query(
      `
      SELECT id, oportunidad_id
      FROM oportunidadespv
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

    if (asignado_a !== null) {
      const [usuario] = await db.query(
        `SELECT id FROM usuarios WHERE id = ? LIMIT 1`,
        [asignado_a]
      );

      if (!usuario.length) {
        return NextResponse.json(
          { message: "El usuario asignado no existe" },
          { status: 404 }
        );
      }

      const etapaAsignadoId = await getEtapaIdByNombre("Asignado");

      if (!etapaAsignadoId) {
        return NextResponse.json(
          { message: "No existe la etapa 'Asignado' en etapasconversionpv" },
          { status: 400 }
        );
      }

      await db.query(
        `
        UPDATE oportunidadespv
        SET
          asignado_a = ?,
          etapasconversionpv_id = ?,
          updated_at = NOW()
        WHERE id = ?
          AND oportunidad_id REGEXP ?
        `,
        [asignado_a, etapaAsignadoId, id, REGEX_LD]
      );

      return NextResponse.json({
        message: "Lead LD asignado correctamente",
      });
    }

    const etapaNuevoId = await getEtapaIdByNombre("Nuevo");

    if (!etapaNuevoId) {
      return NextResponse.json(
        { message: "No existe la etapa 'Nuevo' en etapasconversionpv" },
        { status: 400 }
      );
    }

    await db.query(
      `
      UPDATE oportunidadespv
      SET
        asignado_a = NULL,
        etapasconversionpv_id = ?,
        updated_at = NOW()
      WHERE id = ?
        AND oportunidad_id REGEXP ?
      `,
      [etapaNuevoId, id, REGEX_LD]
    );

    return NextResponse.json({
      message: "Asignación removida correctamente del lead LD",
    });
  } catch (error) {
    console.error("PATCH /api/leads/[id]/asignar error:", error);
    return NextResponse.json(
      {
        message: "Error al asignar lead LD",
        error: error.message,
        sqlMessage: error.sqlMessage || null,
        code: error.code || null,
      },
      { status: 500 }
    );
  }
}