import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

/**
 * GET /api/ventas/modelos
 *
 * Devuelve los modelos del sistema principal (marcas+modelos) para usarlos
 * en los selectores de versiones del catálogo de ventas.
 * Los modelos son de solo lectura aquí; se gestionan en Administración > Marcas.
 */
export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  const [rows] = await db.query(
    `SELECT m.id, m.name AS nombre, ma.name AS marca_nombre,
            CONCAT(ma.name, ' ', m.name) AS nombre_completo,
            m.anios, c.name AS clase_nombre
     FROM modelos m
     JOIN marcas ma ON ma.id = m.marca_id
     LEFT JOIN clases c ON c.id = m.clase_id
     ORDER BY ma.name ASC, m.name ASC`
  );

  return NextResponse.json({ modelos: rows });
}
