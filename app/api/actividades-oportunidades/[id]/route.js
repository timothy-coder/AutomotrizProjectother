// app/api/oportunidades/[id]/etapa/route.js
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { etapasconversion_id } = body;

    if (!id || !etapasconversion_id) {
      return NextResponse.json(
        { error: "Faltan parámetros" },
        { status: 400 }
      );
    }

    await db.query(
      `UPDATE oportunidades SET etapasconversion_id = ? WHERE id = ?`,
      [etapasconversion_id, id]
    );

    return NextResponse.json({
      message: "Etapa actualizada correctamente",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}