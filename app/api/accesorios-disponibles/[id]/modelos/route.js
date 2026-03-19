// ============================================
// API DE RELACIONES ACCESORIO-MODELOS
// archivo: app/api/accesorios-disponibles/[id]/modelos/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener modelos asociados a un accesorio
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

    const [modelos] = await db.query(
      `SELECT mo.id, mo.name as modelo_nombre, ma.name as marca_nombre, 
              am.precio_especifico, am.descuento_especifico, am.compatibilidad_nota, am.tiempo_instalacion_especifico
       FROM modelos mo
       INNER JOIN marcas ma ON ma.id = mo.marca_id
       INNER JOIN accesorio_modelos am ON am.modelo_id = mo.id
       WHERE am.accesorio_id = ?
       ORDER BY ma.name, mo.name ASC`,
      [id]
    );

    return NextResponse.json({
      accesorio_id: id,
      accesorio_nombre: accesorio[0].nombre_accesorio,
      modelos,
      total_modelos: modelos.length,
    });
  } catch (error) {
    console.error("GET /api/accesorios-disponibles/[id]/modelos error:", error);
    return NextResponse.json(
      { message: "Error al obtener modelos", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Agregar modelos a un accesorio
// ============================================
export async function POST(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { modelos = [] } = body;

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

    let agregados = 0;
    const errores = [];

    for (const modelo of modelos) {
      try {
        const { modelo_id, precio_especifico, descuento_especifico, compatibilidad_nota, tiempo_instalacion_especifico } = modelo;

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
          "INSERT IGNORE INTO accesorio_modelos (accesorio_id, modelo_id, precio_especifico, descuento_especifico, compatibilidad_nota, tiempo_instalacion_especifico) VALUES (?, ?, ?, ?, ?, ?)",
          [id, modelo_id, precio_especifico || null, descuento_especifico || null, compatibilidad_nota || null, tiempo_instalacion_especifico || null]
        );
        agregados++;
      } catch (error) {
        errores.push(`Error: ${error.message}`);
      }
    }

    return NextResponse.json({
      message: "Modelos agregados al accesorio",
      modelos_agregados: agregados,
      errores: errores.length > 0 ? errores : undefined,
    });
  } catch (error) {
    console.error("POST /api/accesorios-disponibles/[id]/modelos error:", error);
    return NextResponse.json(
      { message: "Error al agregar modelos", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// PUT: Actualizar relación accesorio-modelo
// ============================================
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { modelo_id, precio_especifico, descuento_especifico, compatibilidad_nota, tiempo_instalacion_especifico } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de accesorio inválido" },
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
      "SELECT id FROM accesorio_modelos WHERE accesorio_id = ? AND modelo_id = ?",
      [id, modelo_id]
    );

    if (existe.length === 0) {
      return NextResponse.json(
        { message: "Relación accesorio-modelo no encontrada" },
        { status: 404 }
      );
    }

    await db.query(
      `UPDATE accesorio_modelos 
       SET precio_especifico = ?, descuento_especifico = ?, compatibilidad_nota = ?, tiempo_instalacion_especifico = ?
       WHERE accesorio_id = ? AND modelo_id = ?`,
      [precio_especifico || null, descuento_especifico || null, compatibilidad_nota || null, tiempo_instalacion_especifico || null, id, modelo_id]
    );

    return NextResponse.json({
      message: "Relación actualizada exitosamente",
      accesorio_id: id,
      modelo_id,
    });
  } catch (error) {
    console.error("PUT /api/accesorios-disponibles/[id]/modelos error:", error);
    return NextResponse.json(
      { message: "Error al actualizar relación", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar un modelo de un accesorio
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const { modelo_id } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de accesorio inválido" },
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
      "DELETE FROM accesorio_modelos WHERE accesorio_id = ? AND modelo_id = ?",
      [id, modelo_id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Relación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Modelo eliminado del accesorio",
      accesorio_id: id,
      modelo_id,
    });
  } catch (error) {
    console.error("DELETE /api/accesorios-disponibles/[id]/modelos error:", error);
    return NextResponse.json(
      { message: "Error al eliminar modelo", error: error.message },
      { status: 500 }
    );
  }
}