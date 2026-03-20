import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    console.log("=== Generando enlace público ===");
    console.log("ID recibido:", id);

    // Validar ID
    if (!id || id === "undefined") {
      console.error("ID inválido:", id);
      return NextResponse.json(
        { message: "ID de cotización no válido" },
        { status: 400 }
      );
    }

    const cotizacionId = parseInt(id, 10);

    if (isNaN(cotizacionId)) {
      console.error("ID no es un número válido:", id);
      return NextResponse.json(
        { message: "ID de cotización debe ser un número" },
        { status: 400 }
      );
    }

    console.log("ID convertido a número:", cotizacionId);

    // Verificar que la cotización existe
    const [cotizaciones] = await db.query(
      "SELECT id FROM cotizacionesagenda WHERE id = ?",
      [cotizacionId]
    );

    if (cotizaciones.length === 0) {
      console.error("Cotización no encontrada:", cotizacionId);
      return NextResponse.json(
        { message: "Cotización no encontrada" },
        { status: 404 }
      );
    }

    // Verificar si ya existe enlace público
    const [existente] = await db.query(
      "SELECT * FROM cotizacion_enlaces_publicos WHERE cotizacion_id = ?",
      [cotizacionId]
    );

    if (existente.length > 0) {
      console.log("Enlace existente encontrado:", existente[0].id);
      return NextResponse.json(existente[0]);
    }

    // Crear nuevo enlace
    const token = crypto.randomBytes(32).toString("hex");

    console.log("Token generado:", token.substring(0, 20) + "...");

    const [result] = await db.query(
      "INSERT INTO cotizacion_enlaces_publicos (cotizacion_id, token, vistas_totales) VALUES (?, ?, 0)",
      [cotizacionId, token]
    );

    console.log("Enlace insertado con ID:", result.insertId);

    const nuevoEnlace = {
      id: result.insertId,
      cotizacion_id: cotizacionId,
      token,
      vistas_totales: 0,
      created_at: new Date().toISOString(),
    };

    console.log("Enlace público creado:", nuevoEnlace);

    return NextResponse.json(nuevoEnlace);
  } catch (error) {
    console.error("Error generando enlace:", error);
    return NextResponse.json(
      { message: "Error generando enlace", error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    const cotizacionId = parseInt(id, 10);

    if (isNaN(cotizacionId)) {
      return NextResponse.json(
        { message: "ID de cotización debe ser un número" },
        { status: 400 }
      );
    }

    await db.query(
      "DELETE FROM cotizacion_enlaces_publicos WHERE cotizacion_id = ?",
      [cotizacionId]
    );

    return NextResponse.json({ message: "Enlace eliminado" });
  } catch (error) {
    console.error("Error eliminando enlace:", error);
    return NextResponse.json(
      { message: "Error eliminando enlace" },
      { status: 500 }
    );
  }
}