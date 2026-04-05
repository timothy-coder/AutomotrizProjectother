import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* =========================
   GET: obtener rol por ID
=========================*/
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const [rows] = await db.query(
      `
      SELECT 
        id,
        name,
        description,
        created_at
      FROM roles
      WHERE id = ?
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Rol no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al obtener rol" },
      { status: 500 }
    );
  }
}

/* =========================
   PUT: actualizar rol
=========================*/
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const name = (body.name || "").trim();
    const description = (body.description || "").trim();

    /* =========================
       VALIDACIONES
    =========================*/
    if (!name) {
      return NextResponse.json(
        { message: "Nombre del rol es requerido" },
        { status: 400 }
      );
    }

    if (name.length < 3) {
      return NextResponse.json(
        { message: "El nombre debe tener mínimo 3 caracteres" },
        { status: 400 }
      );
    }

    /* =========================
       Verificar que el rol existe
    =========================*/
    const [exists] = await db.query(
      `SELECT id FROM roles WHERE id = ?`,
      [id]
    );

    if (exists.length === 0) {
      return NextResponse.json(
        { message: "Rol no encontrado" },
        { status: 404 }
      );
    }

    /* =========================
       Verificar duplicados (otro rol con mismo nombre)
    =========================*/
    const [duplicate] = await db.query(
      `SELECT id FROM roles WHERE name = ? AND id != ?`,
      [name, id]
    );

    if (duplicate.length > 0) {
      return NextResponse.json(
        { message: "Ya existe otro rol con este nombre" },
        { status: 409 }
      );
    }

    /* =========================
       UPDATE ROL
    =========================*/
    await db.query(
      `
      UPDATE roles
      SET name = ?, description = ?
      WHERE id = ?
      `,
      [name, description || null, id]
    );

    return NextResponse.json(
      { message: "✓ Rol actualizado exitosamente" },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al actualizar rol" },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE: eliminar rol
=========================*/
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    /* =========================
       Verificar que el rol existe
    =========================*/
    const [exists] = await db.query(
      `SELECT id FROM roles WHERE id = ?`,
      [id]
    );

    if (exists.length === 0) {
      return NextResponse.json(
        { message: "Rol no encontrado" },
        { status: 404 }
      );
    }

    /* =========================
       Verificar si hay usuarios con este rol
    =========================*/
    const [usersWithRole] = await db.query(
      `SELECT COUNT(*) as count FROM usuarios WHERE role_id = ?`,
      [id]
    );

    if (usersWithRole[0].count > 0) {
      return NextResponse.json(
        {
          message: `No se puede eliminar. Hay ${usersWithRole[0].count} usuario(s) con este rol`,
        },
        { status: 409 }
      );
    }

    /* =========================
       DELETE ROL
    =========================*/
    await db.query(`DELETE FROM roles WHERE id = ?`, [id]);

    return NextResponse.json(
      { message: "✓ Rol eliminado exitosamente" },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al eliminar rol" },
      { status: 500 }
    );
  }
}