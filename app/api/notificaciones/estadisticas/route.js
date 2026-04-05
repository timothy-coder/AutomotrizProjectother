import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* =========================
   GET: Estadísticas de notificaciones
=========================*/
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get("usuario_id");

    if (!usuarioId) {
      return NextResponse.json(
        { message: "usuario_id es requerido" },
        { status: 400 }
      );
    }

    // ✅ Total de notificaciones del usuario
    const [total] = await db.query(
      `
      SELECT COUNT(DISTINCT n.id) as total
      FROM notificaciones n
      LEFT JOIN notificacion_usuarios nu ON n.id = nu.notificacion_id AND nu.usuario_id = ?
      LEFT JOIN notificacion_roles nr ON n.id = nr.notificacion_id
      LEFT JOIN usuarios u ON u.role_id = nr.role_id AND u.id = ?
      WHERE nu.usuario_id = ? OR u.id = ?
      `,
      [usuarioId, usuarioId, usuarioId, usuarioId]
    );

    // ✅ Total sin leer
    const [noLeidas] = await db.query(
      `
      SELECT COUNT(DISTINCT n.id) as total
      FROM notificaciones n
      LEFT JOIN notificacion_usuarios nu ON n.id = nu.notificacion_id AND nu.usuario_id = ?
      LEFT JOIN notificacion_roles nr ON n.id = nr.notificacion_id
      LEFT JOIN usuarios u ON u.role_id = nr.role_id AND u.id = ?
      WHERE (nu.usuario_id = ? OR u.id = ?) AND (nu.leida = 0 OR nu.leida IS NULL)
      `,
      [usuarioId, usuarioId, usuarioId, usuarioId]
    );

    // ✅ Por tipo
    const [porTipo] = await db.query(
      `
      SELECT 
        n.tipo,
        COUNT(DISTINCT n.id) as cantidad
      FROM notificaciones n
      LEFT JOIN notificacion_usuarios nu ON n.id = nu.notificacion_id AND nu.usuario_id = ?
      LEFT JOIN notificacion_roles nr ON n.id = nr.notificacion_id
      LEFT JOIN usuarios u ON u.role_id = nr.role_id AND u.id = ?
      WHERE nu.usuario_id = ? OR u.id = ?
      GROUP BY n.tipo
      `,
      [usuarioId, usuarioId, usuarioId, usuarioId]
    );

    // ✅ Últimas 7 días
    const [ultimos7Dias] = await db.query(
      `
      SELECT 
        DATE(n.created_at) as fecha,
        COUNT(DISTINCT n.id) as cantidad
      FROM notificaciones n
      LEFT JOIN notificacion_usuarios nu ON n.id = nu.notificacion_id AND nu.usuario_id = ?
      LEFT JOIN notificacion_roles nr ON n.id = nr.notificacion_id
      LEFT JOIN usuarios u ON u.role_id = nr.role_id AND u.id = ?
      WHERE (nu.usuario_id = ? OR u.id = ?) AND n.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY DATE(n.created_at)
      ORDER BY fecha DESC
      `,
      [usuarioId, usuarioId, usuarioId, usuarioId]
    );

    return NextResponse.json({
      total: total[0]?.total || 0,
      noLeidas: noLeidas[0]?.total || 0,
      porTipo: porTipo.reduce((acc, row) => {
        acc[row.tipo] = row.cantidad;
        return acc;
      }, {}),
      ultimos7Dias: ultimos7Dias,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}