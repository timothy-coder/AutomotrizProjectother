// ============================================
// API DE SEGUROS - ID
// archivo: app/api/seguros-disponibles/[id]/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener un seguro por ID
// ============================================
export async function GET(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de seguro inválido" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      "SELECT * FROM seguros_disponibles WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Seguro no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("GET /api/seguros-disponibles/[id] error:", error);
    return NextResponse.json(
      { message: "Error al obtener seguro", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// PUT: Actualizar seguro
// ============================================
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const {
      aseguradora,
      nombre_paquete,
      tipo_cobertura,
      cobertura_robos,
      cobertura_incendios,
      cobertura_daños_terceros,
      cobertura_legal,
      cobertura_asistencia_viaje,
      prima_mensual,
      deducible,
      limite_cobertura,
      descripcion,
      es_activo,
    } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de seguro inválido" },
        { status: 400 }
      );
    }

    // Validaciones
    if (!aseguradora || aseguradora.trim() === "") {
      return NextResponse.json(
        { message: "El nombre de la aseguradora es obligatorio" },
        { status: 400 }
      );
    }

    if (!nombre_paquete || nombre_paquete.trim() === "") {
      return NextResponse.json(
        { message: "El nombre del paquete es obligatorio" },
        { status: 400 }
      );
    }

    if (!tipo_cobertura) {
      return NextResponse.json(
        { message: "El tipo de cobertura es obligatorio" },
        { status: 400 }
      );
    }

    if (!prima_mensual || isNaN(prima_mensual) || prima_mensual <= 0) {
      return NextResponse.json(
        { message: "La prima mensual debe ser mayor a 0" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id FROM seguros_disponibles WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Seguro no encontrado" },
        { status: 404 }
      );
    }

    // Verificar que no exista otro con la misma aseguradora y nombre
    const [duplicate] = await db.query(
      "SELECT id FROM seguros_disponibles WHERE aseguradora = ? AND nombre_paquete = ? AND id != ?",
      [aseguradora.trim(), nombre_paquete.trim(), id]
    );

    if (duplicate.length > 0) {
      return NextResponse.json(
        { message: "Ya existe otro seguro con esta aseguradora y nombre de paquete" },
        { status: 409 }
      );
    }

    await db.query(
      `UPDATE seguros_disponibles 
      SET aseguradora = ?, nombre_paquete = ?, tipo_cobertura = ?, cobertura_robos = ?, 
          cobertura_incendios = ?, cobertura_daños_terceros = ?, cobertura_legal = ?, 
          cobertura_asistencia_viaje = ?, prima_mensual = ?, deducible = ?, 
          limite_cobertura = ?, descripcion = ?, es_activo = ?
      WHERE id = ?`,
      [
        aseguradora.trim(),
        nombre_paquete.trim(),
        tipo_cobertura,
        cobertura_robos || false,
        cobertura_incendios || false,
        cobertura_daños_terceros || false,
        cobertura_legal || false,
        cobertura_asistencia_viaje || false,
        prima_mensual,
        deducible || null,
        limite_cobertura || null,
        descripcion || null,
        es_activo !== undefined ? es_activo : true,
        id,
      ]
    );

    return NextResponse.json({
      message: "Seguro actualizado exitosamente",
      id,
    });
  } catch (error) {
    console.error("PUT /api/seguros-disponibles/[id] error:", error);
    return NextResponse.json(
      { message: "Error al actualizar seguro", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar seguro
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de seguro inválido" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id, nombre_paquete FROM seguros_disponibles WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Seguro no encontrado" },
        { status: 404 }
      );
    }

    // Verificar si está siendo usado en contrataciones
    const [contrataciones] = await db.query(
      "SELECT COUNT(*) as count FROM seguro_contrataciones WHERE seguro_id = ?",
      [id]
    );

    if (contrataciones[0]?.count > 0) {
      return NextResponse.json(
        {
          message: `No se puede eliminar. Este seguro está siendo usado en ${contrataciones[0].count} póliza(s)`,
        },
        { status: 409 }
      );
    }

    await db.query("DELETE FROM seguros_disponibles WHERE id = ?", [id]);

    return NextResponse.json({
      message: "Seguro eliminado exitosamente",
      id,
      nombre_paquete: existing[0].nombre_paquete,
    });
  } catch (error) {
    console.error("DELETE /api/seguros-disponibles/[id] error:", error);
    return NextResponse.json(
      { message: "Error al eliminar seguro", error: error.message },
      { status: 500 }
    );
  }
}