import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * POST /api/leadspv/[id]/promover
 *
 * Convierte un lead LD- de oportunidadespv en una oportunidad OP-
 * en la misma tabla. Si ya fue promovido retorna el existente.
 */
export async function POST(req, { params }) {
  try {
    const { id } = await params;

    // Obtener el lead LD-
    const [[lead]] = await db.query(
      `SELECT o.*, ec.nombre AS etapa_nombre
       FROM oportunidadespv o
       LEFT JOIN etapasconversionpv ec ON ec.id = o.etapasconversionpv_id
       WHERE o.id = ? AND o.oportunidad_id REGEXP '^LD-[0-9]+$'
       LIMIT 1`,
      [id]
    );

    if (!lead) {
      return NextResponse.json(
        { message: "Lead no encontrado" },
        { status: 404 }
      );
    }

    // Verificar si ya fue promovido (existe un OP- hijo de este LD-)
    const [[opExistente]] = await db.query(
      `SELECT id, oportunidad_id FROM oportunidadespv
       WHERE oportunidad_padre_id = ? AND oportunidad_id REGEXP '^OP-[0-9]+$'
       LIMIT 1`,
      [lead.id]
    );

    if (opExistente) {
      return NextResponse.json({
        already_promoted: true,
        oportunidad_id: opExistente.oportunidad_id,
        oportunidad_db_id: opExistente.id,
      });
    }

    // Primera etapa de conversión PV
    const [[primeraEtapa]] = await db.query(
      `SELECT id FROM etapasconversionpv ORDER BY sort_order ASC, id ASC LIMIT 1`
    );

    if (!primeraEtapa) {
      return NextResponse.json(
        { message: "No hay etapas de conversión configuradas" },
        { status: 500 }
      );
    }

    // Generar código OP-
    const [[maxRow]] = await db.query(
      `SELECT COALESCE(MAX(CAST(SUBSTRING(oportunidad_id, 4) AS UNSIGNED)), 0) AS max_num
       FROM oportunidadespv
       WHERE oportunidad_padre_id IS NULL AND oportunidad_id REGEXP '^OP-[0-9]+$'`
    );
    const nextNum = Number(maxRow?.max_num || 0) + 1;
    const oportunidadCodigo = `OP-${nextNum}`;

    // Crear la oportunidad OP- copiando datos del lead LD-
    const [ins] = await db.query(
      `INSERT INTO oportunidadespv
         (oportunidad_id, oportunidad_padre_id, cliente_id, vehiculo_id,
          origen_id, suborigen_id, etapasconversionpv_id,
          detalle, created_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        oportunidadCodigo,
        lead.id,
        lead.cliente_id,
        lead.vehiculo_id,
        lead.origen_id,
        lead.suborigen_id,
        primeraEtapa.id,
        lead.detalle,
        lead.created_by,
      ]
    );

    return NextResponse.json({
      ok: true,
      oportunidad_id: oportunidadCodigo,
      oportunidad_db_id: ins.insertId,
    });
  } catch (error) {
    console.error("POST /api/leadspv/[id]/promover error:", error);
    return NextResponse.json(
      { message: "Error al promover lead", error: error.message },
      { status: 500 }
    );
  }
}
