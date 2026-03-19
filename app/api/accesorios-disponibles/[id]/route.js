// ============================================
// API DE ACCESORIOS - ID
// archivo: app/api/accesorios-disponibles/[id]/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener un accesorio por ID
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

    const [rows] = await db.query(
      "SELECT * FROM accesorios_disponibles WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Accesorio no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("GET /api/accesorios-disponibles/[id] error:", error);
    return NextResponse.json(
      { message: "Error al obtener accesorio", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// PUT: Actualizar accesorio
// ============================================
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const {
      nombre_accesorio,
      categoria,
      descripcion,
      precio,
      descuento_compra_con_auto,
      compatibilidad_notas,
      tiempo_instalacion_horas,
      imagen_url,
      es_disponible,
    } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de accesorio inválido" },
        { status: 400 }
      );
    }

    // Validaciones
    if (!nombre_accesorio || nombre_accesorio.trim() === "") {
      return NextResponse.json(
        { message: "El nombre del accesorio es obligatorio" },
        { status: 400 }
      );
    }

    if (!categoria) {
      return NextResponse.json(
        { message: "La categoría es obligatoria" },
        { status: 400 }
      );
    }

    if (!precio || isNaN(precio) || precio <= 0) {
      return NextResponse.json(
        { message: "El precio debe ser mayor a 0" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id FROM accesorios_disponibles WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Accesorio no encontrado" },
        { status: 404 }
      );
    }

    // Verificar nombre duplicado
    const [duplicate] = await db.query(
      "SELECT id FROM accesorios_disponibles WHERE nombre_accesorio = ? AND id != ?",
      [nombre_accesorio.trim(), id]
    );

    if (duplicate.length > 0) {
      return NextResponse.json(
        { message: "Ya existe otro accesorio con este nombre" },
        { status: 409 }
      );
    }

    await db.query(
      `UPDATE accesorios_disponibles 
      SET nombre_accesorio = ?, categoria = ?, descripcion = ?, precio = ?, 
          descuento_compra_con_auto = ?, compatibilidad_notas = ?, 
          tiempo_instalacion_horas = ?, imagen_url = ?, es_disponible = ?
      WHERE id = ?`,
      [
        nombre_accesorio.trim(),
        categoria,
        descripcion || null,
        precio,
        descuento_compra_con_auto || null,
        compatibilidad_notas || null,
        tiempo_instalacion_horas || null,
        imagen_url || null,
        es_disponible !== undefined ? es_disponible : true,
        id,
      ]
    );

    return NextResponse.json({
      message: "Accesorio actualizado exitosamente",
      id,
    });
  } catch (error) {
    console.error("PUT /api/accesorios-disponibles/[id] error:", error);
    return NextResponse.json(
      { message: "Error al actualizar accesorio", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar accesorio
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de accesorio inválido" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id, nombre_accesorio FROM accesorios_disponibles WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Accesorio no encontrado" },
        { status: 404 }
      );
    }

    // Verificar si está siendo usado en compras
    const [compras] = await db.query(
      "SELECT COUNT(*) as count FROM accesorio_compras WHERE accesorio_id = ? AND estado IN ('comprado', 'instalado')",
      [id]
    );

    if (compras[0]?.count > 0) {
      return NextResponse.json(
        {
          message: `No se puede eliminar. Este accesorio está siendo usado en ${compras[0].count} compra(s)`,
        },
        { status: 409 }
      );
    }

    await db.query("DELETE FROM accesorios_disponibles WHERE id = ?", [id]);

    return NextResponse.json({
      message: "Accesorio eliminado exitosamente",
      id,
      nombre_accesorio: existing[0].nombre_accesorio,
    });
  } catch (error) {
    console.error("DELETE /api/accesorios-disponibles/[id] error:", error);
    return NextResponse.json(
      { message: "Error al eliminar accesorio", error: error.message },
      { status: 500 }
    );
  }
}