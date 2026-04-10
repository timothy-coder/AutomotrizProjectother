// File: app/api/cotizacionesagenda/[id]/route.js

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const [cotizaciones] = await db.query(
      `SELECT c.*, m.name as marca, mo.name as modelo, v.nombre as version, u.fullname
       FROM cotizacionesagenda c
       LEFT JOIN marcas m ON c.marca_id = m.id
       LEFT JOIN modelos mo ON c.modelo_id = mo.id
       LEFT JOIN versiones v ON c.version_id = v.id
       left join usuarios u on c.created_by = u.id
       WHERE c.id = ?`,
      [id]
    );

    if (cotizaciones.length === 0) {
      return NextResponse.json(
        { message: "Cotización no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(cotizaciones[0]);
  } catch (error) {
    console.error("Error fetching cotización:", error);
    return NextResponse.json(
      { message: "Error al cargar cotización" },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    // ✅ Extraer solo los campos enviados
    const {
      sku,
      color_externo,
      color_interno,
      version_id,
      anio,
      marca_id,
      modelo_id,
      estado,
      descuento_total_accesorios,
      descuento_total_regalos,
    } = body;

    // ✅ Construir dinámicamente los campos a actualizar
    const updates = [];
    const values = [];

    if (sku !== undefined) {
      updates.push("sku = ?");
      values.push(sku);
    }
    if (color_externo !== undefined) {
      updates.push("color_externo = ?");
      values.push(color_externo);
    }
    if (color_interno !== undefined) {
      updates.push("color_interno = ?");
      values.push(color_interno);
    }
    if (version_id !== undefined) {
      updates.push("version_id = ?");
      values.push(version_id);
    }
    if (anio !== undefined) {
      updates.push("anio = ?");
      values.push(anio);
    }
    if (marca_id !== undefined) {
      updates.push("marca_id = ?");
      values.push(marca_id);
    }
    if (modelo_id !== undefined) {
      updates.push("modelo_id = ?");
      values.push(modelo_id);
    }
    if (estado !== undefined) {
      updates.push("estado = ?");
      values.push(estado);
    }
    if (descuento_total_accesorios !== undefined) {
      updates.push("descuento_total_accesorios = ?");
      values.push(descuento_total_accesorios);
    }
    if (descuento_total_regalos !== undefined) {
      updates.push("descuento_total_regalos = ?");
      values.push(descuento_total_regalos);
    }

    // Si no hay campos para actualizar
    if (updates.length === 0) {
      return NextResponse.json(
        { message: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    // Agregar updated_at siempre
    updates.push("updated_at = NOW()");
    values.push(id);

    // Ejecutar UPDATE
    await db.query(
      `UPDATE cotizacionesagenda SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    // ✅ Retornar la cotización actualizada
    const [cotizaciones] = await db.query(
      `SELECT c.*, m.name as marca, mo.name as modelo 
       FROM cotizacionesagenda c
       LEFT JOIN marcas m ON c.marca_id = m.id
       LEFT JOIN modelos mo ON c.modelo_id = mo.id
       WHERE c.id = ?`,
      [id]
    );

    return NextResponse.json(cotizaciones[0]);
  } catch (error) {
    console.error("Error updating cotización:", error);
    return NextResponse.json(
      { message: "Error actualizando cotización: " + error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    await db.query("DELETE FROM cotizacionesagenda WHERE id = ?", [id]);

    return NextResponse.json({ message: "Cotización eliminada" });
  } catch (error) {
    console.error("Error deleting cotización:", error);
    return NextResponse.json(
      { message: "Error eliminando cotización" },
      { status: 500 }
    );
  }
}