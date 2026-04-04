import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ✅ GET - Obtener un detalle de cierre específico
export async function GET(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      "SELECT * FROM cierres_detalle WHERE id = ?",
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Detalle de cierre no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { message: "Error: " + error.message },
      { status: 500 }
    );
  }
}

// ✅ PUT - Actualizar un detalle de cierre
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const { detalle } = await req.json();

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    if (!detalle || !detalle.trim()) {
      return NextResponse.json(
        { message: "El detalle es requerido" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [checkRows] = await db.query(
      "SELECT id FROM cierres_detalle WHERE id = ?",
      [id]
    );

    if (checkRows.length === 0) {
      return NextResponse.json(
        { message: "Detalle de cierre no encontrado" },
        { status: 404 }
      );
    }

    await db.query(
      "UPDATE cierres_detalle SET detalle = ? WHERE id = ?",
      [detalle, id]
    );

    return NextResponse.json({
      message: "Detalle de cierre actualizado",
      id,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { message: "Error: " + error.message },
      { status: 500 }
    );
  }
}

// ✅ DELETE - Eliminar un detalle de cierre
export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [checkRows] = await db.query(
      "SELECT id FROM cierres_detalle WHERE id = ?",
      [id]
    );

    if (checkRows.length === 0) {
      return NextResponse.json(
        { message: "Detalle de cierre no encontrado" },
        { status: 404 }
      );
    }

    await db.query(
      "DELETE FROM cierres_detalle WHERE id = ?",
      [id]
    );

    return NextResponse.json({
      message: "Detalle de cierre eliminado",
      id,
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { message: "Error: " + error.message },
      { status: 500 }
    );
  }
}