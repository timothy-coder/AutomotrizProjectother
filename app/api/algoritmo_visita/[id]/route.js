"use server";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================
// GET ONE (Obtener un registro de algoritmo_visita)
// ============================
export async function GET(req, { params }) {
  try {
    const { id } = params; // Obtener el ID del registro desde los parámetros de la URL

    const [rows] = await db.query(
      `
      SELECT modelo_id, marca_id, kilometraje, meses, años
      FROM algoritmo_visita
      WHERE id = ?
    `,
      [id] // Pasamos el ID para obtener el registro
    );

    if (!rows.length) {
      return NextResponse.json({ message: "No encontrado" }, { status: 404 });
    }

    return NextResponse.json(rows[0]); // Retornar el registro encontrado
  } catch (error) {
    console.log(error);
    return NextResponse.json({ message: "Error al obtener el registro" }, { status: 500 });
  }
}

// ============================
// UPDATE (Actualizar un registro de algoritmo_visita)
// body: { modelo_id, marca_id, kilometraje, meses, años }
// ============================
export async function PUT(req, { params }) {
  try {
    const { id } = params; // Obtener el ID desde los parámetros de la URL
    const { modelo_id, marca_id, kilometraje, meses, años } = await req.json(); // Obtener los datos del cuerpo de la solicitud

    // Validación de los campos requeridos
    if (!modelo_id || !marca_id || !kilometraje || !meses || !años) {
      return NextResponse.json({ message: "Todos los campos son requeridos" }, { status: 400 });
    }

    // Validar que 'años' sea una cadena de texto
    if (typeof años !== "string") {
      return NextResponse.json({ message: "El campo 'años' debe ser una cadena de texto." }, { status: 400 });
    }

    // Realizar la actualización del registro en la base de datos
    await db.query(
      `
      UPDATE algoritmo_visita
      SET modelo_id = ?, marca_id = ?, kilometraje = ?, meses = ?, años = ?
      WHERE id = ?
    `,
      [modelo_id, marca_id, kilometraje, meses, años, id] // Los valores para actualizar
    );

    return NextResponse.json({ message: "Registro actualizado con éxito" });
  } catch (error) {
    console.log(error);

    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { message: "Ya existe un registro con estos datos." },
        { status: 409 }
      );
    }

    return NextResponse.json({ message: "Error al actualizar el registro" }, { status: 500 });
  }
}

// ============================
// DELETE (Eliminar un registro de algoritmo_visita)
// ============================
export async function DELETE(req, { params }) {
  try {
    const { id } = params; // Obtener el ID desde los parámetros de la URL

    // Eliminar el registro de la base de datos
    await db.query(
      `
      DELETE FROM algoritmo_visita
      WHERE id = ?
    `,
      [id] // El ID del registro que se quiere eliminar
    );

    return NextResponse.json({ message: "Registro eliminado con éxito" });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ message: "Error al eliminar el registro" }, { status: 500 });
  }
}