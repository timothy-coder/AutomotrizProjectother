import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const [cotizaciones] = await db.query(
      `SELECT c.*, m.name as marca, mo.name as modelo 
       FROM cotizacionesagenda c
       LEFT JOIN marcas m ON c.marca_id = m.id
       LEFT JOIN modelos mo ON c.modelo_id = mo.id
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
    const {
      sku,
      color_externo,
      color_interno,
      version_id,
      anio,
      marca_id,
      modelo_id,
      estado,
    } = await req.json();

    await db.query(
      `UPDATE cotizacionesagenda 
       SET sku = ?, color_externo = ?, color_interno = ?, version_id = ?, 
           anio = ?, marca_id = ?, modelo_id = ?, estado = ?, updated_at = NOW()
       WHERE id = ?`,
      [
        sku,
        color_externo,
        color_interno,
        version_id,
        anio,
        marca_id,
        modelo_id,
        estado,
        id,
      ]
    );

    return NextResponse.json({ message: "Cotización actualizada" });
  } catch (error) {
    console.error("Error updating cotización:", error);
    return NextResponse.json(
      { message: "Error actualizando cotización" },
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