// ============================================
// API DE RELACIONES PAQUETE-MARCAS
// archivo: app/api/paquetes-mantenimiento/[id]/marcas/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener marcas asociadas a un paquete
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

    const [marcas] = await db.query(
      `SELECT m.id, m.name, pm.precio_especifico
       FROM marcas m
       INNER JOIN paquete_marcas pm ON pm.marca_id = m.id
       WHERE pm.paquete_id = ?
       ORDER BY m.name ASC`,
      [id]
    );

    return NextResponse.json({
      paquete_id: id,
      marcas,
      total_marcas: marcas.length,
    });
  } catch (error) {
    console.error("GET /api/paquetes-mantenimiento/[id]/marcas error:", error);
    return NextResponse.json(
      { message: "Error al obtener marcas", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Agregar marcas a un paquete
// ============================================
export async function POST(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { marcas = [] } = body;

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

    let agregadas = 0;
    const errores = [];

    for (const marca of marcas) {
      try {
        const { marca_id, precio_especifico } = marca;

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
          "INSERT IGNORE INTO paquete_marcas (paquete_id, marca_id, precio_especifico) VALUES (?, ?, ?)",
          [id, marca_id, precio_especifico || null]
        );
        agregadas++;
      } catch (error) {
        errores.push(`Error: ${error.message}`);
      }
    }

    return NextResponse.json({
      message: "Marcas agregadas al paquete",
      marcas_agregadas: agregadas,
      errores: errores.length > 0 ? errores : undefined,
    });
  } catch (error) {
    console.error("POST /api/paquetes-mantenimiento/[id]/marcas error:", error);
    return NextResponse.json(
      { message: "Error al agregar marcas", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar una marca de un paquete
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { marca_id } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de paquete inválido" },
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
      "DELETE FROM paquete_marcas WHERE paquete_id = ? AND marca_id = ?",
      [id, marca_id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Relación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Marca eliminada del paquete",
      paquete_id: id,
      marca_id,
    });
  } catch (error) {
    console.error("DELETE /api/paquetes-mantenimiento/[id]/marcas error:", error);
    return NextResponse.json(
      { message: "Error al eliminar marca", error: error.message },
      { status: 500 }
    );
  }
}