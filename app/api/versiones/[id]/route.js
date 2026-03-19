
// ============================================
// API DE VERSIONES - ID
// archivo: app/api/versiones/[id]/route.js
// ============================================

export async function GET_ID(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de versión inválido" },
        { status: 400 }
      );
    }

    const [rows] = await db.query("SELECT * FROM versiones WHERE id = ?", [id]);

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Versión no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("GET /api/versiones/[id] error:", error);
    return NextResponse.json(
      { message: "Error al obtener versión", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// PUT: Actualizar versión
// ============================================
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { nombre, descripcion } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de versión inválido" },
        { status: 400 }
      );
    }

    // Validaciones
    if (!nombre || nombre.trim() === "") {
      return NextResponse.json(
        { message: "El nombre de la versión es obligatorio" },
        { status: 400 }
      );
    }

    // Verificar que existe
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

    // Verificar que no exista otro con el mismo nombre
    const [duplicate] = await db.query(
      "SELECT id FROM versiones WHERE nombre = ? AND id != ?",
      [nombre.trim(), id]
    );

    if (duplicate.length > 0) {
      return NextResponse.json(
        { message: "Ya existe otra versión con este nombre" },
        { status: 409 }
      );
    }

    await db.query(
      "UPDATE versiones SET nombre = ?, descripcion = ? WHERE id = ?",
      [nombre.trim(), descripcion || null, id]
    );

    return NextResponse.json({
      message: "Versión actualizada exitosamente",
      id,
      nombre,
      descripcion,
    });
  } catch (error) {
    console.error("PUT /api/versiones/[id] error:", error);
    return NextResponse.json(
      { message: "Error al actualizar versión", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar versión
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de versión inválido" },
        { status: 400 }
      );
    }

    // Verificar que existe
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

    // Verificar si está siendo usada en otras tablas
    const [modeloVersiones] = await db.query(
      "SELECT COUNT(*) as count FROM modelo_versiones WHERE nombre_version = (SELECT nombre FROM versiones WHERE id = ?)",
      [id]
    );

    if (modeloVersiones[0]?.count > 0) {
      return NextResponse.json(
        {
          message:
            "No se puede eliminar. Esta versión está siendo usada en modelos de vehículos",
        },
        { status: 409 }
      );
    }

    const [promocionesVersiones] = await db.query(
      "SELECT COUNT(*) as count FROM promociones_versiones WHERE version_id = ?",
      [id]
    );

    if (promocionesVersiones[0]?.count > 0) {
      return NextResponse.json(
        {
          message:
            "No se puede eliminar. Esta versión está siendo usada en promociones",
        },
        { status: 409 }
      );
    }

    await db.query("DELETE FROM versiones WHERE id = ?", [id]);

    return NextResponse.json({
      message: "Versión eliminada exitosamente",
      id,
      nombre: existing[0].nombre,
    });
  } catch (error) {
    console.error("DELETE /api/versiones/[id] error:", error);
    return NextResponse.json(
      { message: "Error al eliminar versión", error: error.message },
      { status: 500 }
    );
  }
}