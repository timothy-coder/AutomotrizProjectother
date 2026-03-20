// ============================================
// API DE RELACIONES SEGURO-MODELOS
// archivo: app/api/seguros-disponibles/[id]/modelos/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener modelos asociados a un seguro
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

    const [modelos] = await db.query(
      `SELECT mo.id, mo.name as modelo_nombre, ma.name as marca_nombre, 
              smo.prima_especifica, smo.deducible_especifico, smo.limite_cobertura_especifico
       FROM modelos mo
       INNER JOIN marcas ma ON ma.id = mo.marca_id
       INNER JOIN seguro_modelos smo ON smo.modelo_id = mo.id
       WHERE smo.seguro_id = ?
       ORDER BY ma.name, mo.name ASC`,
      [id]
    );

    return NextResponse.json({
      seguro_id: id,
      seguro_nombre: seguro[0].nombre_paquete,
      modelos,
      total_modelos: modelos.length,
    });
  } catch (error) {
    console.error("GET /api/seguros-disponibles/[id]/modelos error:", error);
    return NextResponse.json(
      { message: "Error al obtener modelos", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Agregar modelos a un seguro
// ============================================
export async function POST(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { modelos = [] } = body;

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

    let agregados = 0;
    const errores = [];

    for (const modelo of modelos) {
      try {
        const { modelo_id, prima_especifica, deducible_especifico, limite_cobertura_especifico } = modelo;

        if (!modelo_id || isNaN(modelo_id)) {
          errores.push("ID de modelo inválido");
          continue;
        }

        // Verificar que el modelo existe
        const [modeloExiste] = await db.query(
          "SELECT id FROM modelos WHERE id = ?",
          [modelo_id]
        );

        if (modeloExiste.length === 0) {
          errores.push(`Modelo ${modelo_id} no encontrado`);
          continue;
        }

        await db.query(
          "INSERT IGNORE INTO seguro_modelos (seguro_id, modelo_id, prima_especifica, deducible_especifico, limite_cobertura_especifico) VALUES (?, ?, ?, ?, ?)",
          [id, modelo_id, prima_especifica || null, deducible_especifico || null, limite_cobertura_especifico || null]
        );
        agregados++;
      } catch (error) {
        errores.push(`Error: ${error.message}`);
      }
    }

    return NextResponse.json({
      message: "Modelos agregados al seguro",
      modelos_agregados: agregados,
      errores: errores.length > 0 ? errores : undefined,
    });
  } catch (error) {
    console.error("POST /api/seguros-disponibles/[id]/modelos error:", error);
    return NextResponse.json(
      { message: "Error al agregar modelos", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// PUT: Actualizar relación modelo-seguro
// ============================================
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { modelo_id, prima_especifica, deducible_especifico, limite_cobertura_especifico } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de seguro inválido" },
        { status: 400 }
      );
    }

    if (!modelo_id || isNaN(modelo_id)) {
      return NextResponse.json(
        { message: "ID de modelo inválido" },
        { status: 400 }
      );
    }

    // Verificar que la relación existe
    const [existe] = await db.query(
      "SELECT id FROM seguro_modelos WHERE seguro_id = ? AND modelo_id = ?",
      [id, modelo_id]
    );

    if (existe.length === 0) {
      return NextResponse.json(
        { message: "Relación seguro-modelo no encontrada" },
        { status: 404 }
      );
    }

    await db.query(
      `UPDATE seguro_modelos 
       SET prima_especifica = ?, deducible_especifico = ?, limite_cobertura_especifico = ?
       WHERE seguro_id = ? AND modelo_id = ?`,
      [prima_especifica || null, deducible_especifico || null, limite_cobertura_especifico || null, id, modelo_id]
    );

    return NextResponse.json({
      message: "Relación actualizada exitosamente",
      seguro_id: id,
      modelo_id,
    });
  } catch (error) {
    console.error("PUT /api/seguros-disponibles/[id]/modelos error:", error);
    return NextResponse.json(
      { message: "Error al actualizar relación", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar un modelo de un seguro
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { modelo_id } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de seguro inválido" },
        { status: 400 }
      );
    }

    if (!modelo_id || isNaN(modelo_id)) {
      return NextResponse.json(
        { message: "ID de modelo inválido" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      "DELETE FROM seguro_modelos WHERE seguro_id = ? AND modelo_id = ?",
      [id, modelo_id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Relación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Modelo eliminado del seguro",
      seguro_id: id,
      modelo_id,
    });
  } catch (error) {
    console.error("DELETE /api/seguros-disponibles/[id]/modelos error:", error);
    return NextResponse.json(
      { message: "Error al eliminar modelo", error: error.message },
      { status: 500 }
    );
  }
}