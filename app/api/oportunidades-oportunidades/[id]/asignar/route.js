import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const { asignado_a } = await req.json();

    if (!asignado_a) {
      return NextResponse.json(
        { message: "asignado_a es requerido" },
        { status: 400 }
      );
    }

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

    // Verificar que el usuario existe
    const [usuario] = await db.query(
      "SELECT id FROM usuarios WHERE id = ?",
      [asignado_a]
    );

    if (!usuario.length) {
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    // Obtener la etapa "Asignado"
    const [etapaAsignado] = await db.query(
      `SELECT id FROM etapasconversion WHERE LOWER(TRIM(nombre)) = 'asignado' LIMIT 1`
    );

    if (!etapaAsignado.length) {
      return NextResponse.json(
        { message: "Etapa 'Asignado' no encontrada" },
        { status: 404 }
      );
    }

    const etapaId = etapaAsignado[0].id;

    // Actualizar oportunidad: asignar usuario y cambiar etapa a "Asignado"
    await db.query(
      "UPDATE oportunidades_oportunidades SET asignado_a = ?, etapasconversion_id = ? WHERE id = ?",
      [asignado_a, etapaId, id]
    );

    return NextResponse.json({
      message: "Oportunidad asignada y etapa actualizada",
      etapa_id: etapaId,
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}