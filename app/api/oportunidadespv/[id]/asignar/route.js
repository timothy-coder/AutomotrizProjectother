import { NextResponse } from "next/server";
import { db } from "@/lib/db";

const REGEX_OP = "^OP-[0-9]+$";

async function getEtapaIdByNombre(nombre) {
  const [rows] = await db.query(
    `
    SELECT id
    FROM etapasconversion
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
      FROM oportunidades
      WHERE id = ?
        AND oportunidad_id REGEXP ?
      LIMIT 1
      `,
      [id, REGEX_OP]
    );

    if (!exists.length) {
      return NextResponse.json(
        { message: "Oportunidad OP no encontrada" },
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
          { message: "No existe la etapa 'Asignado' en etapasconversion" },
          { status: 400 }
        );
      }

      await db.query(
        `
        UPDATE oportunidades
        SET
          asignado_a = ?,
          etapasconversion_id = ?,
          updated_at = NOW()
        WHERE id = ?
          AND oportunidad_id REGEXP ?
        `,
        [asignado_a, etapaAsignadoId, id, REGEX_OP]
      );

      return NextResponse.json({
        message: "Oportunidad OP asignada correctamente",
      });
    }

    const etapaNuevoId = await getEtapaIdByNombre("Nuevo");

    if (!etapaNuevoId) {
      return NextResponse.json(
        { message: "No existe la etapa 'Nuevo' en etapasconversion" },
        { status: 400 }
      );
    }

    await db.query(
      `
      UPDATE oportunidades
      SET
        asignado_a = NULL,
        etapasconversion_id = ?,
        updated_at = NOW()
      WHERE id = ?
        AND oportunidad_id REGEXP ?
      `,
      [etapaNuevoId, id, REGEX_OP]
    );

    return NextResponse.json({
      message: "Asignación removida correctamente de la oportunidad OP",
    });
  } catch (error) {
    console.error("PATCH /api/oportunidades/[id]/asignar error:", error);
    return NextResponse.json(
      {
        message: "Error al asignar oportunidad OP",
        error: error.message,
        sqlMessage: error.sqlMessage || null,
        code: error.code || null,
      },
      { status: 500 }
    );
  }
}
