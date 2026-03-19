// ============================================
// API DE RELACIONES ACCESORIO-MARCAS
// archivo: app/api/accesorios-disponibles/[id]/marcas/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener marcas asociadas a un accesorio
// ============================================
export async function GET(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de accesorio inválido" },
        { status: 400 }
      );
    }

    // Verificar que el accesorio existe
    const [accesorio] = await db.query(
      "SELECT id, nombre_accesorio FROM accesorios_disponibles WHERE id = ?",
      [id]
    );

    if (accesorio.length === 0) {
      return NextResponse.json(
        { message: "Accesorio no encontrado" },
        { status: 404 }
      );
    }

    const [marcas] = await db.query(
      `SELECT m.id, m.name as marca_nombre, am.precio_especifico, 
              am.descuento_especifico, am.compatibilidad_nota, am.tiempo_instalacion_especifico
       FROM marcas m
       INNER JOIN accesorio_marcas am ON am.marca_id = m.id
       WHERE am.accesorio_id = ?
       ORDER BY m.name ASC`,
      [id]
    );

    return NextResponse.json({
      accesorio_id: id,
      accesorio_nombre: accesorio[0].nombre_accesorio,
      marcas,
      total_marcas: marcas.length,
    });
  } catch (error) {
    console.error("GET /api/accesorios-disponibles/[id]/marcas error:", error);
    return NextResponse.json(
      { message: "Error al obtener marcas", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Agregar marcas a un accesorio
// ============================================
export async function POST(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { marcas = [] } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de accesorio inválido" },
        { status: 400 }
      );
    }

    // Verificar que el accesorio existe
    const [accesorio] = await db.query(
      "SELECT id FROM accesorios_disponibles WHERE id = ?",
      [id]
    );

    if (accesorio.length === 0) {
      return NextResponse.json(
        { message: "Accesorio no encontrado" },
        { status: 404 }
      );
    }

    let agregadas = 0;
    const errores = [];

    for (const marca of marcas) {
      try {
        const { marca_id, precio_especifico, descuento_especifico, compatibilidad_nota, tiempo_instalacion_especifico } = marca;

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
          "INSERT IGNORE INTO accesorio_marcas (accesorio_id, marca_id, precio_especifico, descuento_especifico, compatibilidad_nota, tiempo_instalacion_especifico) VALUES (?, ?, ?, ?, ?, ?)",
          [id, marca_id, precio_especifico || null, descuento_especifico || null, compatibilidad_nota || null, tiempo_instalacion_especifico || null]
        );
        agregadas++;
      } catch (error) {
        errores.push(`Error: ${error.message}`);
      }
    }

    return NextResponse.json({
      message: "Marcas agregadas al accesorio",
      marcas_agregadas: agregadas,
      errores: errores.length > 0 ? errores : undefined,
    });
  } catch (error) {
    console.error("POST /api/accesorios-disponibles/[id]/marcas error:", error);
    return NextResponse.json(
      { message: "Error al agregar marcas", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// PUT: Actualizar relación accesorio-marca
// ============================================
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { marca_id, precio_especifico, descuento_especifico, compatibilidad_nota, tiempo_instalacion_especifico } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de accesorio inválido" },
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
      "SELECT id FROM accesorio_marcas WHERE accesorio_id = ? AND marca_id = ?",
      [id, marca_id]
    );

    if (existe.length === 0) {
      return NextResponse.json(
        { message: "Relación accesorio-marca no encontrada" },
        { status: 404 }
      );
    }

    await db.query(
      `UPDATE accesorio_marcas 
       SET precio_especifico = ?, descuento_especifico = ?, compatibilidad_nota = ?, tiempo_instalacion_especifico = ?
       WHERE accesorio_id = ? AND marca_id = ?`,
      [precio_especifico || null, descuento_especifico || null, compatibilidad_nota || null, tiempo_instalacion_especifico || null, id, marca_id]
    );

    return NextResponse.json({
      message: "Relación actualizada exitosamente",
      accesorio_id: id,
      marca_id,
    });
  } catch (error) {
    console.error("PUT /api/accesorios-disponibles/[id]/marcas error:", error);
    return NextResponse.json(
      { message: "Error al actualizar relación", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar una marca de un accesorio
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { marca_id } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de accesorio inválido" },
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
      "DELETE FROM accesorio_marcas WHERE accesorio_id = ? AND marca_id = ?",
      [id, marca_id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Relación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Marca eliminada del accesorio",
      accesorio_id: id,
      marca_id,
    });
  } catch (error) {
    console.error("DELETE /api/accesorios-disponibles/[id]/marcas error:", error);
    return NextResponse.json(
      { message: "Error al eliminar marca", error: error.message },
      { status: 500 }
    );
  }
}