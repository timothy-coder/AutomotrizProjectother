import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { etapasconversion_id, created_by } = await req.json();

    if (!etapasconversion_id) {
      return NextResponse.json(
        { message: "etapasconversion_id es requerido" },
        { status: 400 }
      );
    }

    if (!created_by) {
      return NextResponse.json(
        { message: "created_by es requerido" },
        { status: 400 }
      );
    }

    // ✅ Verificar que existe el lead
    const [exists] = await db.query(
      "SELECT id FROM oportunidades_oportunidades WHERE id = ? AND oportunidad_id LIKE 'LD-%'",
      [id]
    );

    if (!exists.length) {
      return NextResponse.json(
        { message: "Lead no encontrado" },
        { status: 404 }
      );
    }

    // Verificar que la etapa existe
    const [etapa] = await db.query(
      "SELECT id FROM etapasconversion WHERE id = ?",
      [etapasconversion_id]
    );

    if (!etapa.length) {
      return NextResponse.json(
        { message: "Etapa no encontrada" },
        { status: 404 }
      );
    }

    // ✅ Actualizar la etapa del lead
    await db.query(
      "UPDATE oportunidades_oportunidades SET etapasconversion_id = ?, updated_at = NOW() WHERE id = ? AND oportunidad_id LIKE 'LD-%'",
      [etapasconversion_id, id]
    );

    return NextResponse.json({ 
      message: "Etapa del lead actualizada",
      id: id,
      etapasconversion_id: etapasconversion_id
    });
  } catch (e) {
    console.error("Error en cambiar-etapa:", e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

// También agregar PATCH por si acaso
export async function PATCH(req, { params }) {
  return PUT(req, { params });
}