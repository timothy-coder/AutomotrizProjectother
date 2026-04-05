import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* =========================
   GET: Obtener una notificación
=========================*/
export async function GET(request, { params }) {
  try {
    const { id } = await params;

    const [rows] = await db.query(
      `
      SELECT 
        n.id,
        n.titulo,
        n.mensaje,
        n.tipo,
        n.icono,
        n.url,
        n.created_at,
        n.updated_at,
        (
          SELECT GROUP_CONCAT(DISTINCT nr.role_id)
          FROM notificacion_roles nr
          WHERE nr.notificacion_id = n.id
        ) as roles_ids,
        (
          SELECT GROUP_CONCAT(DISTINCT nu.usuario_id)
          FROM notificacion_usuarios nu
          WHERE nu.notificacion_id = n.id
        ) as usuarios_ids
      FROM notificaciones n
      WHERE n.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Notificación no encontrada" },
        { status: 404 }
      );
    }

    const notif = rows[0];
    return NextResponse.json({
      ...notif,
      roles_ids: notif.roles_ids ? notif.roles_ids.split(",").map(Number) : [],
      usuarios_ids: notif.usuarios_ids ? notif.usuarios_ids.split(",").map(Number) : [],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al obtener notificación" },
      { status: 500 }
    );
  }
}

/* =========================
   PUT: Actualizar notificación o marcar como leída
=========================*/
export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    // ✅ Si viene usuario_id, marcar como leída
    if (body.usuario_id) {
      const usuarioId = body.usuario_id;

      const [result] = await db.query(
        `
        UPDATE notificacion_usuarios
        SET leida = 1, leida_at = CURRENT_TIMESTAMP
        WHERE notificacion_id = ? AND usuario_id = ?
        `,
        [id, usuarioId]
      );

      if (result.affectedRows === 0) {
        return NextResponse.json(
          { message: "Notificación no encontrada para este usuario" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        message: "✓ Notificación marcada como leída",
      });
    }

    // ✅ Si vienen datos de actualización
    const titulo = body.titulo ? (body.titulo || "").trim() : null;
    const mensaje = body.mensaje ? (body.mensaje || "").trim() : null;
    const tipo = body.tipo || null;
    const icono = body.icono || null;
    const url = body.url || null;

    if (titulo && mensaje) {
      await db.query(
        `
        UPDATE notificaciones
        SET titulo = ?, mensaje = ?, tipo = ?, icono = ?, url = ?
        WHERE id = ?
        `,
        [titulo, mensaje, tipo, icono, url, id]
      );

      return NextResponse.json({
        message: "✓ Notificación actualizada",
      });
    }

    return NextResponse.json(
      { message: "Sin datos para actualizar" },
      { status: 400 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al actualizar notificación" },
      { status: 500 }
    );
  }
}

/* =========================
   DELETE: Eliminar notificación
=========================*/
export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    const [exists] = await db.query(
      `SELECT id FROM notificaciones WHERE id = ?`,
      [id]
    );

    if (exists.length === 0) {
      return NextResponse.json(
        { message: "Notificación no encontrada" },
        { status: 404 }
      );
    }

    // ✅ Eliminar (CASCADE eliminará relaciones)
    await db.query(`DELETE FROM notificaciones WHERE id = ?`, [id]);

    return NextResponse.json({
      message: "✓ Notificación eliminada exitosamente",
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al eliminar notificación" },
      { status: 500 }
    );
  }
}