// ============================================
// API DE PAQUETES - ID
// archivo: app/api/paquetes-mantenimiento/[id]/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener un paquete por ID
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

    const [rows] = await db.query(
      `SELECT pm.*, COUNT(DISTINCT ps.servicio_id) as total_servicios
       FROM paquetes_mantenimiento pm
       LEFT JOIN paquete_servicios ps ON ps.paquete_id = pm.id
       WHERE pm.id = ?
       GROUP BY pm.id`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Paquete no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("GET /api/paquetes-mantenimiento/[id] error:", error);
    return NextResponse.json(
      { message: "Error al obtener paquete", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// PUT: Actualizar paquete
// ============================================
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const {
      nombre,
      descripcion,
      duracion_meses,
      kilometraje_maximo,
      servicios_incluidos,
      precio,
      precio_especial_compra,
      es_opcional,
      descuento_compra_simultanea,
      es_activo,
    } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de paquete inválido" },
        { status: 400 }
      );
    }

    // Validaciones
    if (!nombre || nombre.trim() === "") {
      return NextResponse.json(
        { message: "El nombre del paquete es obligatorio" },
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
      "SELECT id FROM paquetes_mantenimiento WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Paquete no encontrado" },
        { status: 404 }
      );
    }

    // Verificar nombre duplicado
    const [duplicate] = await db.query(
      "SELECT id FROM paquetes_mantenimiento WHERE nombre = ? AND id != ?",
      [nombre.trim(), id]
    );

    if (duplicate.length > 0) {
      return NextResponse.json(
        { message: "Ya existe otro paquete con este nombre" },
        { status: 409 }
      );
    }

    await db.query(
      `UPDATE paquetes_mantenimiento 
      SET nombre = ?, descripcion = ?, duracion_meses = ?, kilometraje_maximo = ?,
          servicios_incluidos = ?, precio = ?, precio_especial_compra = ?,
          es_opcional = ?, descuento_compra_simultanea = ?, es_activo = ?
      WHERE id = ?`,
      [
        nombre.trim(),
        descripcion || null,
        duracion_meses,
        kilometraje_maximo,
        Array.isArray(servicios_incluidos) ? JSON.stringify(servicios_incluidos) : "[]",
        precio,
        precio_especial_compra || null,
        es_opcional !== undefined ? es_opcional : true,
        descuento_compra_simultanea || null,
        es_activo !== undefined ? es_activo : true,
        id,
      ]
    );

    return NextResponse.json({
      message: "Paquete actualizado exitosamente",
      id,
    });
  } catch (error) {
    console.error("PUT /api/paquetes-mantenimiento/[id] error:", error);
    return NextResponse.json(
      { message: "Error al actualizar paquete", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar paquete
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de paquete inválido" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id, nombre FROM paquetes_mantenimiento WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Paquete no encontrado" },
        { status: 404 }
      );
    }

    // Verificar si está siendo usado en historial
    const [historial] = await db.query(
      "SELECT COUNT(*) as count FROM historial_mantenimiento WHERE paquete_id = ?",
      [id]
    );

    if (historial[0]?.count > 0) {
      return NextResponse.json(
        {
          message: `No se puede eliminar. Este paquete está siendo usado en ${historial[0].count} registro(s) de historial`,
        },
        { status: 409 }
      );
    }

    await db.query("DELETE FROM paquetes_mantenimiento WHERE id = ?", [id]);

    return NextResponse.json({
      message: "Paquete eliminado exitosamente",
      id,
      nombre: existing[0].nombre,
    });
  } catch (error) {
    console.error("DELETE /api/paquetes-mantenimiento/[id] error:", error);
    return NextResponse.json(
      { message: "Error al eliminar paquete", error: error.message },
      { status: 500 }
    );
  }
}