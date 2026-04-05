import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* =========================
   GET: Obtener todas las notificaciones de un usuario (directo + rol)
=========================*/
export async function GET(request, { params }) {
  try {
    const { usuarioId } = await params;
    const { searchParams } = new URL(request.url);
    const limite = parseInt(searchParams.get("limite") || "50");
    const offset = parseInt(searchParams.get("offset") || "0");
    const tipoFiltro = searchParams.get("tipo") || null;

    let query = `
      SELECT DISTINCT
        n.id,
        n.titulo,
        n.mensaje,
        n.tipo,
        n.icono,
        n.url,
        n.created_at,
        COALESCE(nu.leida, 0) as leida,
        nu.leida_at,
        CASE 
          WHEN nu.usuario_id IS NOT NULL THEN 'directo'
          ELSE 'por_rol'
        END as origen
      FROM notificaciones n
      LEFT JOIN notificacion_usuarios nu ON n.id = nu.notificacion_id AND nu.usuario_id = ?
      LEFT JOIN notificacion_roles nr ON n.id = nr.notificacion_id
      LEFT JOIN usuarios u ON u.role_id = nr.role_id AND u.id = ?
      WHERE nu.usuario_id = ? OR u.id = ?
    `;

    let params = [usuarioId, usuarioId, usuarioId, usuarioId];

    if (tipoFiltro && ["info", "success", "warning", "error"].includes(tipoFiltro)) {
      query += ` AND n.tipo = ?`;
      params.push(tipoFiltro);
    }

    query += ` ORDER BY n.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limite, offset);

    const [notificaciones] = await db.query(query, params);

    return NextResponse.json({
      notificaciones,
      total: notificaciones.length,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al obtener notificaciones" },
      { status: 500 }
    );
  }
}