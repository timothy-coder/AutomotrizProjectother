// ============================================
// API DE RELACIONES PAQUETE-MODELOS
// archivo: app/api/paquetes-mantenimiento/[id]/modelos/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener modelos asociados a un paquete
// ============================================
export async function GET(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de paquete inválido" },
        { status: 400 }
      );
    }

    // Verificar que el paquete existe
    const [paquete] = await db.query(
      "SELECT id FROM paquetes_mantenimiento WHERE id = ?",
      [id]
    );

    if (paquete.length === 0) {
      return NextResponse.json(
        { message: "Paquete no encontrado" },
        { status: 404 }
      );
    }

    const [modelos] = await db.query(
      `SELECT mo.id, mo.name as modelo_nombre, ma.name as marca_nombre, pmod.precio_especifico
       FROM modelos mo
       INNER JOIN marcas ma ON ma.id = mo.marca_id
       INNER JOIN paquete_modelos pmod ON pmod.modelo_id = mo.id
       WHERE pmod.paquete_id = ?
       ORDER BY ma.name, mo.name ASC`,
      [id]
    );

    return NextResponse.json({
      paquete_id: id,
      modelos,
      total_modelos: modelos.length,
    });
  } catch (error) {
    console.error("GET /api/paquetes-mantenimiento/[id]/modelos error:", error);
    return NextResponse.json(
      { message: "Error al obtener modelos", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Agregar modelos a un paquete
// ============================================
export async function POST(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { modelos = [] } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de paquete inválido" },
        { status: 400 }
      );
    }

    // Verificar que el paquete existe
    const [paquete] = await db.query(
      "SELECT id FROM paquetes_mantenimiento WHERE id = ?",
      [id]
    );

    if (paquete.length === 0) {
      return NextResponse.json(
        { message: "Paquete no encontrado" },
        { status: 404 }
      );
    }

    let agregados = 0;
    const errores = [];

    for (const modelo of modelos) {
      try {
        const { modelo_id, precio_especifico } = modelo;

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
          "INSERT IGNORE INTO paquete_modelos (paquete_id, modelo_id, precio_especifico) VALUES (?, ?, ?)",
          [id, modelo_id, precio_especifico || null]
        );
        agregados++;
      } catch (error) {
        errores.push(`Error: ${error.message}`);
      }
    }

    return NextResponse.json({
      message: "Modelos agregados al paquete",
      modelos_agregados: agregados,
      errores: errores.length > 0 ? errores : undefined,
    });
  } catch (error) {
    console.error("POST /api/paquetes-mantenimiento/[id]/modelos error:", error);
    return NextResponse.json(
      { message: "Error al agregar modelos", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar un modelo de un paquete
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { modelo_id } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de paquete inválido" },
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
      "DELETE FROM paquete_modelos WHERE paquete_id = ? AND modelo_id = ?",
      [id, modelo_id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Relación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Modelo eliminado del paquete",
      paquete_id: id,
      modelo_id,
    });
  } catch (error) {
    console.error("DELETE /api/paquetes-mantenimiento/[id]/modelos error:", error);
    return NextResponse.json(
      { message: "Error al eliminar modelo", error: error.message },
      { status: 500 }
    );
  }
}