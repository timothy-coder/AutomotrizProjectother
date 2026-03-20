// ============================================
// API DE OPCIONES DE FINANCIAMIENTO - ID
// archivo: app/api/opciones-financiamiento/[id]/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener una opción de financiamiento por ID
// ============================================
export async function GET(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de opción de financiamiento inválido" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      "SELECT * FROM opciones_financiamiento WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Opción de financiamiento no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("GET /api/opciones-financiamiento/[id] error:", error);
    return NextResponse.json(
      { message: "Error al obtener opción de financiamiento", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// PUT: Actualizar opción de financiamiento
// ============================================
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const {
      nombre,
      proveedor,
      tasa_interes_anual,
      plazo_minimo_meses,
      plazo_maximo_meses,
      cuota_inicial_porcentaje,
      cuota_inicial_monto_minimo,
      seguro_obligatorio,
      seguro_incluido,
      descripcion_requisitos,
      aplica_historial_limitado,
      documentacion_requerida,
      tiempo_aprobacion_dias,
      comisiones_adicionales,
      es_activo,
      observaciones,
    } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de opción de financiamiento inválido" },
        { status: 400 }
      );
    }

    // Validaciones
    if (!nombre || nombre.trim() === "") {
      return NextResponse.json(
        { message: "El nombre de la opción de financiamiento es obligatorio" },
        { status: 400 }
      );
    }

    if (
      !plazo_minimo_meses ||
      !plazo_maximo_meses ||
      plazo_minimo_meses > plazo_maximo_meses
    ) {
      return NextResponse.json(
        { message: "Los plazos son obligatorios y el mínimo no puede ser mayor al máximo" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id FROM opciones_financiamiento WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Opción de financiamiento no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que no exista otro con el mismo nombre
    const [duplicate] = await db.query(
      "SELECT id FROM opciones_financiamiento WHERE nombre = ? AND id != ?",
      [nombre.trim(), id]
    );

    if (duplicate.length > 0) {
      return NextResponse.json(
        { message: "Ya existe otra opción de financiamiento con este nombre" },
        { status: 409 }
      );
    }

    await db.query(
      `UPDATE opciones_financiamiento 
      SET nombre = ?, proveedor = ?, tasa_interes_anual = ?, plazo_minimo_meses = ?,
          plazo_maximo_meses = ?, cuota_inicial_porcentaje = ?, cuota_inicial_monto_minimo = ?,
          seguro_obligatorio = ?, seguro_incluido = ?, descripcion_requisitos = ?,
          aplica_historial_limitado = ?, documentacion_requerida = ?, tiempo_aprobacion_dias = ?,
          comisiones_adicionales = ?, es_activo = ?, observaciones = ?
      WHERE id = ?`,
      [
        nombre.trim(),
        proveedor || null,
        tasa_interes_anual || null,
        plazo_minimo_meses,
        plazo_maximo_meses,
        cuota_inicial_porcentaje || null,
        cuota_inicial_monto_minimo || null,
        seguro_obligatorio || false,
        seguro_incluido || false,
        descripcion_requisitos || null,
        aplica_historial_limitado || false,
        documentacion_requerida || null,
        tiempo_aprobacion_dias || null,
        comisiones_adicionales || null,
        es_activo !== undefined ? es_activo : true,
        observaciones || null,
        id,
      ]
    );

    return NextResponse.json({
      message: "Opción de financiamiento actualizada exitosamente",
      id,
    });
  } catch (error) {
    console.error("PUT /api/opciones-financiamiento/[id] error:", error);
    return NextResponse.json(
      { message: "Error al actualizar opción de financiamiento", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar opción de financiamiento
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de opción de financiamiento inválido" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id, nombre FROM opciones_financiamiento WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Opción de financiamiento no encontrada" },
        { status: 404 }
      );
    }

    // Verificar si está siendo usada en otras tablas
    const [modeloFinanciamiento] = await db.query(
      "SELECT COUNT(*) as count FROM modelo_financiamiento WHERE opcion_financiamiento_id = ?",
      [id]
    );

    if (modeloFinanciamiento[0]?.count > 0) {
      return NextResponse.json(
        {
          message: `No se puede eliminar. Esta opción está siendo usada en ${modeloFinanciamiento[0].count} modelo(s)`,
        },
        { status: 409 }
      );
    }

    // Verificar si está siendo usada en solicitudes de financiamiento
    const [solicitudes] = await db.query(
      "SELECT COUNT(*) as count FROM solicitudes_financiamiento WHERE opcion_financiamiento_id = ?",
      [id]
    );

    if (solicitudes[0]?.count > 0) {
      return NextResponse.json(
        {
          message: `No se puede eliminar. Esta opción está siendo usada en ${solicitudes[0].count} solicitud(es) de financiamiento`,
        },
        { status: 409 }
      );
    }

    await db.query("DELETE FROM opciones_financiamiento WHERE id = ?", [id]);

    return NextResponse.json({
      message: "Opción de financiamiento eliminada exitosamente",
      id,
      nombre: existing[0].nombre,
    });
  } catch (error) {
    console.error("DELETE /api/opciones-financiamiento/[id] error:", error);
    return NextResponse.json(
      { message: "Error al eliminar opción de financiamiento", error: error.message },
      { status: 500 }
    );
  }
}