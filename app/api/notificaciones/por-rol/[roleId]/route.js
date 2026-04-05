import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* =========================
   GET: Obtener notificaciones por rol
=========================*/
export async function GET(request, { params }) {
  try {
    const { roleId } = await params;

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
        COUNT(DISTINCT nu.usuario_id) as usuarios_recibieron
      FROM notificaciones n
      INNER JOIN notificacion_roles nr ON n.id = nr.notificacion_id
      LEFT JOIN notificacion_usuarios nu ON n.id = nu.notificacion_id
      WHERE nr.role_id = ?
      GROUP BY n.id
      ORDER BY n.created_at DESC
      `,
      [roleId]
    );

    return NextResponse.json(notificaciones);
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al obtener notificaciones" },
      { status: 500 }
    );
  }
}