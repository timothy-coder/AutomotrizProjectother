// ============================================
// API DE COTIZACIONES AGENDA - ID
// archivo: app/api/cotizacionesagenda/[id]/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = params;

    const [rows] = await db.query(
      `SELECT 
        ca.*,
        m.name as marca,
        mo.name as modelo,
        o.oportunidad_id as numero_oportunidad,
        o.cliente_name,
        u.nombre as created_by_name
      FROM cotizacionesagenda ca
      INNER JOIN marcas m ON m.id = ca.marca_id
      INNER JOIN modelos mo ON mo.id = ca.modelo_id
      INNER JOIN oportunidades o ON o.id = ca.oportunidad_id
      LEFT JOIN usuarios u ON u.id = ca.created_by
      WHERE ca.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Cotización de agenda no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (e) {
    console.log("Error en GET cotizacionesagenda por ID:", e);
    return NextResponse.json(
      { message: "Error", error: e.message },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const {
      sku,
      color_externo,
      color_interno,
      estado,
      marca_id,
      modelo_id,
      version_id,
    } = body;

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id FROM cotizacionesagenda WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Cotización de agenda no encontrada" },
        { status: 404 }
      );
    }

    // Actualizar
    const [result] = await db.query(
      `UPDATE cotizacionesagenda 
       SET sku = ?, color_externo = ?, color_interno = ?, estado = ?, 
           marca_id = ?, modelo_id = ?, version_id = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        sku || null,
        color_externo || null,
        color_interno || null,
        estado || "borrador",
        marca_id,
        modelo_id,
        version_id || null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "No se pudo actualizar" },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Cotización de agenda actualizada" });
  } catch (e) {
    console.log("Error en PUT cotizacionesagenda:", e);
    return NextResponse.json(
      { message: "Error actualizando", error: e.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id FROM cotizacionesagenda WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Cotización de agenda no encontrada" },
        { status: 404 }
      );
    }

    // Eliminar
    const [result] = await db.query(
      "DELETE FROM cotizacionesagenda WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "No se pudo eliminar" },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "Cotización de agenda eliminada" });
  } catch (e) {
    console.log("Error en DELETE cotizacionesagenda:", e);
    return NextResponse.json(
      { message: "Error eliminando", error: e.message },
      { status: 500 }
    );
  }
}