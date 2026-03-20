// ============================================
// API DE RELACIONES SEGURO-MARCAS
// archivo: app/api/seguros-disponibles/[id]/marcas/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener marcas asociadas a un seguro
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

    // Verificar que el seguro existe
    const [seguro] = await db.query(
      "SELECT id, nombre_paquete FROM seguros_disponibles WHERE id = ?",
      [id]
    );

    if (seguro.length === 0) {
      return NextResponse.json(
        { message: "Seguro no encontrado" },
        { status: 404 }
      );
    }

    const [marcas] = await db.query(
      `SELECT m.id, m.name as marca_nombre, sm.prima_especifica, 
              sm.deducible_especifico, sm.limite_cobertura_especifico
       FROM marcas m
       INNER JOIN seguro_marcas sm ON sm.marca_id = m.id
       WHERE sm.seguro_id = ?
       ORDER BY m.name ASC`,
      [id]
    );

    return NextResponse.json({
      seguro_id: id,
      seguro_nombre: seguro[0].nombre_paquete,
      marcas,
      total_marcas: marcas.length,
    });
  } catch (error) {
    console.error("GET /api/seguros-disponibles/[id]/marcas error:", error);
    return NextResponse.json(
      { message: "Error al obtener marcas", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Agregar marcas a un seguro
// ============================================
export async function POST(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { marcas = [] } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de seguro inválido" },
        { status: 400 }
      );
    }

    // Verificar que el seguro existe
    const [seguro] = await db.query(
      "SELECT id FROM seguros_disponibles WHERE id = ?",
      [id]
    );

    if (seguro.length === 0) {
      return NextResponse.json(
        { message: "Seguro no encontrado" },
        { status: 404 }
      );
    }

    let agregadas = 0;
    const errores = [];

    for (const marca of marcas) {
      try {
        const { marca_id, prima_especifica, deducible_especifico, limite_cobertura_especifico } = marca;

        if (!marca_id || isNaN(marca_id)) {
          errores.push("ID de marca inválido");
          continue;
        }

        // Verificar que la marca existe
        const [marcaExiste] = await db.query(
          "SELECT id FROM marcas WHERE id = ?",
          [marca_id]
        );

        if (marcaExiste.length === 0) {
          errores.push(`Marca ${marca_id} no encontrada`);
          continue;
        }

        await db.query(
          "INSERT IGNORE INTO seguro_marcas (seguro_id, marca_id, prima_especifica, deducible_especifico, limite_cobertura_especifico) VALUES (?, ?, ?, ?, ?)",
          [id, marca_id, prima_especifica || null, deducible_especifico || null, limite_cobertura_especifico || null]
        );
        agregadas++;
      } catch (error) {
        errores.push(`Error: ${error.message}`);
      }
    }

    return NextResponse.json({
      message: "Marcas agregadas al seguro",
      marcas_agregadas: agregadas,
      errores: errores.length > 0 ? errores : undefined,
    });
  } catch (error) {
    console.error("POST /api/seguros-disponibles/[id]/marcas error:", error);
    return NextResponse.json(
      { message: "Error al agregar marcas", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// PUT: Actualizar relación marca-seguro
// ============================================
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { marca_id, prima_especifica, deducible_especifico, limite_cobertura_especifico } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de seguro inválido" },
        { status: 400 }
      );
    }

    if (!marca_id || isNaN(marca_id)) {
      return NextResponse.json(
        { message: "ID de marca inválido" },
        { status: 400 }
      );
    }

    // Verificar que la relación existe
    const [existe] = await db.query(
      "SELECT id FROM seguro_marcas WHERE seguro_id = ? AND marca_id = ?",
      [id, marca_id]
    );

    if (existe.length === 0) {
      return NextResponse.json(
        { message: "Relación seguro-marca no encontrada" },
        { status: 404 }
      );
    }

    await db.query(
      `UPDATE seguro_marcas 
       SET prima_especifica = ?, deducible_especifico = ?, limite_cobertura_especifico = ?
       WHERE seguro_id = ? AND marca_id = ?`,
      [prima_especifica || null, deducible_especifico || null, limite_cobertura_especifico || null, id, marca_id]
    );

    return NextResponse.json({
      message: "Relación actualizada exitosamente",
      seguro_id: id,
      marca_id,
    });
  } catch (error) {
    console.error("PUT /api/seguros-disponibles/[id]/marcas error:", error);
    return NextResponse.json(
      { message: "Error al actualizar relación", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar una marca de un seguro
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { marca_id } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de seguro inválido" },
        { status: 400 }
      );
    }

    if (!marca_id || isNaN(marca_id)) {
      return NextResponse.json(
        { message: "ID de marca inválido" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      "DELETE FROM seguro_marcas WHERE seguro_id = ? AND marca_id = ?",
      [id, marca_id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Relación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Marca eliminada del seguro",
      seguro_id: id,
      marca_id,
    });
  } catch (error) {
    console.error("DELETE /api/seguros-disponibles/[id]/marcas error:", error);
    return NextResponse.json(
      { message: "Error al eliminar marca", error: error.message },
      { status: 500 }
    );
  }
}