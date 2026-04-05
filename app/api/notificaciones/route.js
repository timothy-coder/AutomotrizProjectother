import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* =========================
   GET: Listar notificaciones del usuario actual
=========================*/
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get("usuario_id");
    const limite = parseInt(searchParams.get("limite") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");

    if (!usuarioId) {
      return NextResponse.json(
        { message: "usuario_id es requerido" },
        { status: 400 }
      );
    }

    // ✅ Obtener notificaciones directas para el usuario
    const [notificaciones] = await db.query(
      `
      SELECT 
        n.id,
        n.titulo,
        n.mensaje,
        n.tipo,
        n.icono,
        n.url,
        n.created_at,
        nu.leida,
        nu.leida_at
      FROM notificaciones n
      INNER JOIN notificacion_usuarios nu ON n.id = nu.notificacion_id
      WHERE nu.usuario_id = ?
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [usuarioId, limite, offset]
    );

    // ✅ Obtener notificaciones por rol del usuario
    const [notificacionesPorRol] = await db.query(
      `
      SELECT DISTINCT
        n.id,
        n.titulo,
        n.mensaje,
        n.tipo,
        n.icono,
        n.url,
        n.created_at,
        0 as leida,
        NULL as leida_at
      FROM notificaciones n
      INNER JOIN notificacion_roles nr ON n.id = nr.notificacion_id
      INNER JOIN usuarios u ON u.role_id = nr.role_id
      WHERE u.id = ?
        AND n.id NOT IN (
          SELECT nu.notificacion_id 
          FROM notificacion_usuarios nu 
          WHERE nu.usuario_id = ?
        )
      ORDER BY n.created_at DESC
      LIMIT ? OFFSET ?
      `,
      [usuarioId, usuarioId, limite, offset]
    );

    // ✅ Combinar y ordenar
    const todas = [...notificaciones, ...notificacionesPorRol].sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );

    // ✅ Contar total de no leídas
    const [countNoLeidas] = await db.query(
      `
      SELECT COUNT(*) as total FROM (
        SELECT n.id FROM notificaciones n
        INNER JOIN notificacion_usuarios nu ON n.id = nu.notificacion_id
        WHERE nu.usuario_id = ? AND nu.leida = 0
        UNION
        SELECT n.id FROM notificaciones n
        INNER JOIN notificacion_roles nr ON n.id = nr.notificacion_id
        INNER JOIN usuarios u ON u.role_id = nr.role_id
        WHERE u.id = ?
      ) as unique_notif
      `,
      [usuarioId, usuarioId]
    );

    return NextResponse.json({
      notificaciones: todas.slice(0, limite),
      total: todas.length,
      noLeidas: countNoLeidas[0]?.total || 0,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al obtener notificaciones" },
      { status: 500 }
    );
  }
}

/* =========================
   POST: Crear nueva notificación
=========================*/
export async function POST(request) {
  let connection;

  try {
    const body = await request.json();

    const titulo = (body.titulo || "").trim();
    const mensaje = (body.mensaje || "").trim();
    const tipo = body.tipo || "info";
    const icono = body.icono || null;
    const url = body.url || null;
    const rolesIds = Array.isArray(body.roles_ids) ? body.roles_ids.map(Number).filter(n => n > 0) : [];
    const usuariosIds = Array.isArray(body.usuarios_ids) ? body.usuarios_ids.map(Number).filter(n => n > 0) : [];

    /* =========================
       VALIDACIONES
    =========================*/
    if (!titulo || !mensaje) {
      return NextResponse.json(
        { message: "Título y mensaje son requeridos" },
        { status: 400 }
      );
    }

    if (titulo.length < 3) {
      return NextResponse.json(
        { message: "El título debe tener mínimo 3 caracteres" },
        { status: 400 }
      );
    }

    if (mensaje.length < 5) {
      return NextResponse.json(
        { message: "El mensaje debe tener mínimo 5 caracteres" },
        { status: 400 }
      );
    }

    if (!["info", "success", "warning", "error"].includes(tipo)) {
      return NextResponse.json(
        { message: "Tipo de notificación inválido" },
        { status: 400 }
      );
    }

    if (rolesIds.length === 0 && usuariosIds.length === 0) {
      return NextResponse.json(
        { message: "Debe especificar al menos un rol o un usuario" },
        { status: 400 }
      );
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    /* =========================
       INSERT NOTIFICACIÓN
    =========================*/
    const [result] = await connection.query(
      `
      INSERT INTO notificaciones(titulo, mensaje, tipo, icono, url)
      VALUES (?, ?, ?, ?, ?)
      `,
      [titulo, mensaje, tipo, icono || null, url || null]
    );

    const notificacionId = result.insertId;

    /* =========================
       INSERT RELACIONES CON ROLES
    =========================*/
    for (const roleId of rolesIds) {
      await connection.query(
        `
        INSERT INTO notificacion_roles(notificacion_id, role_id)
        VALUES (?, ?)
        ON DUPLICATE KEY UPDATE role_id = role_id
        `,
        [notificacionId, roleId]
      );
    }

    /* =========================
       INSERT RELACIONES CON USUARIOS
    =========================*/
    for (const usuarioId of usuariosIds) {
      await connection.query(
        `
        INSERT INTO notificacion_usuarios(notificacion_id, usuario_id, leida)
        VALUES (?, ?, 0)
        ON DUPLICATE KEY UPDATE leida = 0
        `,
        [notificacionId, usuarioId]
      );
    }

    await connection.commit();

    return NextResponse.json(
      {
        message: "✓ Notificación enviada exitosamente",
        id: notificacionId,
        rolesIds: rolesIds,
        usuariosIds: usuariosIds,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    if (connection) {
      await connection.rollback();
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return NextResponse.json(
        { message: "Uno o más roles/usuarios no existen" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Error al crear notificación" },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}