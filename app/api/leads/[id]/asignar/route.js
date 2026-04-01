import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const { asignado_a } = await req.json();

    if (!asignado_a && asignado_a !== null) {
      return NextResponse.json(
        { message: "asignado_a es requerido" },
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

    // ✅ Si asignado_a es null, desasignar
    if (asignado_a === null) {
      // Obtener la etapa "Nuevo"
      const [etapaNuevo] = await db.query(
        `SELECT id FROM etapasconversion WHERE LOWER(TRIM(nombre)) = 'nuevo' LIMIT 1`
      );

      if (!etapaNuevo.length) {
        return NextResponse.json(
          { message: "Etapa 'Nuevo' no encontrada" },
          { status: 404 }
        );
      }

      const etapaId = etapaNuevo[0].id;

      // Desasignar: quitar usuario y cambiar etapa a "Nuevo"
      await db.query(
        "UPDATE oportunidades_oportunidades SET asignado_a = NULL, etapasconversion_id = ? WHERE id = ? AND oportunidad_id LIKE 'LD-%'",
        [etapaId, id]
      );

      return NextResponse.json({
        message: "Lead desasignado y etapa actualizada a 'Nuevo'",
        etapa_id: etapaId,
      });
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

    // ✅ Actualizar lead: asignar usuario y cambiar etapa a "Asignado"
    await db.query(
      "UPDATE oportunidades_oportunidades SET asignado_a = ?, etapasconversion_id = ? WHERE id = ? AND oportunidad_id LIKE 'LD-%'",
      [asignado_a, etapaId, id]
    );

    return NextResponse.json({
      message: "Lead asignado y etapa actualizada",
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