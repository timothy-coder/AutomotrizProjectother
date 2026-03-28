import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id, detalle_id } = await params;

    const [rows] = await db.query(
      `SELECT * FROM oportunidades_detalles 
       WHERE id = ? AND oportunidad_padre_id = ?`,
      [detalle_id, id]
    );

    if (!rows.length) {
      return NextResponse.json(
        { message: "Detalle no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
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
    const { id, detalle_id } = await params;
    const { fecha_agenda, hora_agenda } = await req.json();

    // Verificar que existe
    const [exists] = await db.query(
      `SELECT id FROM oportunidades_detalles 
       WHERE id = ? AND oportunidad_padre_id = ?`,
      [detalle_id, id]
    );

    if (!exists.length) {
      return NextResponse.json(
        { message: "Detalle no encontrado" },
        { status: 404 }
      );
    }

    const updates = [];
    const values = [];

    if (fecha_agenda !== undefined) {
      updates.push("fecha_agenda = ?");
      values.push(fecha_agenda);
    }
    if (hora_agenda !== undefined) {
      updates.push("hora_agenda = ?");
      values.push(hora_agenda);
    }

    if (!updates.length) {
      return NextResponse.json(
        { message: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    values.push(detalle_id);

    await db.query(
      `UPDATE oportunidades_detalles SET ${updates.join(", ")} WHERE id = ?`,
      values
    );

    return NextResponse.json({ message: "Detalle actualizado" });
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
    const { id, detalle_id } = await params;

    // Verificar que existe
    const [exists] = await db.query(
      `SELECT id FROM oportunidades_detalles 
       WHERE id = ? AND oportunidad_padre_id = ?`,
      [detalle_id, id]
    );

    if (!exists.length) {
      return NextResponse.json(
        { message: "Detalle no encontrado" },
        { status: 404 }
      );
    }

    await db.query("DELETE FROM oportunidades_detalles WHERE id = ?", [
      detalle_id,
    ]);

    return NextResponse.json(
      { message: "Detalle eliminado" },
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