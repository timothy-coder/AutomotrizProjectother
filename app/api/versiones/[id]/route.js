import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { nombre, descripcion } = await req.json();

    // Validaciones
    if (!nombre || !nombre.trim()) {
      return NextResponse.json(
        { message: "El nombre es requerido" },
        { status: 400 }
      );
    }

    // Verificar que la versión existe
    const [existing] = await db.query(
      "SELECT id FROM versiones WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Versión no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que no exista otra versión con el mismo nombre
    const [duplicate] = await db.query(
      "SELECT id FROM versiones WHERE nombre = ? AND id != ?",
      [nombre.trim(), id]
    );

    if (duplicate.length > 0) {
      return NextResponse.json(
        { message: "Ya existe otra versión con este nombre" },
        { status: 400 }
      );
    }

    // Actualizar versión
    await db.query(
      "UPDATE versiones SET nombre = ?, descripcion = ? WHERE id = ?",
      [nombre.trim(), descripcion?.trim() || null, id]
    );

    return NextResponse.json({
      message: "Versión actualizada exitosamente",
      data: {
        id,
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || null,
      },
    });
  } catch (e) {
    console.error("Error updating versión:", e);
    return NextResponse.json(
      { message: "Error al actualizar versión" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    // Verificar que la versión existe
    const [existing] = await db.query(
      "SELECT id, nombre FROM versiones WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Versión no encontrada" },
        { status: 404 }
      );
    }

    // Verificar si la versión está siendo usada en otras tablas
    // Ajusta esto según tu estructura de BD
    const [used] = await db.query(
      "SELECT COUNT(*) as count FROM camionetas WHERE version_id = ?",
      [id]
    );

    if (used[0]?.count > 0) {
      return NextResponse.json(
        {
          message: `No se puede eliminar: esta versión está siendo usada en ${used[0].count} camioneta(s)`,
        },
        { status: 400 }
      );
    }

    // Eliminar versión
    await db.query("DELETE FROM versiones WHERE id = ?", [id]);

    return NextResponse.json({
      message: "Versión eliminada exitosamente",
      data: { id, nombre: existing[0].nombre },
    });
  } catch (e) {
    console.error("Error deleting versión:", e);
    return NextResponse.json(
      { message: "Error al eliminar versión" },
      { status: 500 }
    );
  }
}