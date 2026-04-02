import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const [rows] = await db.query(
      `SELECT o.*, 
              c.nombre as cliente_nombre,
              c.email as cliente_email,
              origen.name as origen_nombre,
              so.name as suborigen_nombre,
              e.nombre as etapa_nombre,
              u1.fullname as creado_por_nombre,
              u1.email as creado_por_email,
              u2.fullname as asignado_a_nombre,
              u2.email as asignado_a_email
       FROM oportunidades_oportunidades o
       LEFT JOIN clientes c ON o.cliente_id = c.id
       LEFT JOIN origenes_citas origen ON o.origen_id = origen.id
       LEFT JOIN suborigenes_citas so ON o.suborigen_id = so.id
       LEFT JOIN etapasconversion e ON o.etapasconversion_id = e.id
       LEFT JOIN usuarios u1 ON o.created_by = u1.id
       LEFT JOIN usuarios u2 ON o.asignado_a = u2.id
       WHERE o.id = ?`,
      [id]
    );

    if (!rows.length) {
      return NextResponse.json(
        { message: "Oportunidad no encontrada" },
        { status: 404 }
      );
    }

    // Obtener detalles
    const [detalles] = await db.query(
      "SELECT * FROM oportunidades_detalles WHERE oportunidad_padre_id = ? ORDER BY created_at DESC",
      [id]
    );

    const oportunidad = rows[0];
    oportunidad.detalles = detalles;

    return NextResponse.json(oportunidad);
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { suborigen_id, detalle, etapasconversion_id, asignado_a } =
      await req.json();

    // Verificar que existe
    const [exists] = await db.query(
      "SELECT id FROM oportunidades_oportunidades WHERE id = ?",
      [id]
    );

    if (!exists.length) {
      return NextResponse.json(
        { message: "Oportunidad no encontrada" },
        { status: 404 }
      );
    }

    const updates = [];
    const values = [];

    if (suborigen_id !== undefined) {
      updates.push("suborigen_id = ?");
      values.push(suborigen_id);
    }
    if (detalle !== undefined) {
      updates.push("detalle = ?");
      values.push(detalle);
    }
    if (etapasconversion_id !== undefined) {
      updates.push("etapasconversion_id = ?");
      values.push(etapasconversion_id);
    }
    if (asignado_a !== undefined) {
      updates.push("asignado_a = ?");
      values.push(asignado_a);
    }

    if (!updates.length) {
      return NextResponse.json(
        { message: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    values.push(id);

    await db.query(
      `UPDATE oportunidades_oportunidades SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    return NextResponse.json({ message: "Oportunidad actualizada" });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    // Verificar que existe
    const [exists] = await db.query(
      "SELECT id FROM oportunidades_oportunidades WHERE id = ?",
      [id]
    );

    if (!exists.length) {
      return NextResponse.json(
        { message: "Oportunidad no encontrada" },
        { status: 404 }
      );
    }

    // Los detalles se eliminan por CASCADE
    await db.query("DELETE FROM oportunidades_oportunidades WHERE id = ?", [
      id,
    ]);

    return NextResponse.json(
      { message: "Oportunidad eliminada" },
      { status: 204 }
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}