import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);

    const centroId = searchParams.get("centro_id");
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const userId = searchParams.get("user_id");

    if (!userId || !centroId || !start || !end) {
      return NextResponse.json([]);
    }

    const [rows] = await db.query(
      `
      SELECT
        c.id,
        c.start_at,
        c.end_at,
        c.estado,
        c.asesor_id,
        CONCAT(cl.nombre,' ',cl.apellido) AS cliente,
        u.fullname AS asesor,
        u.color
      FROM citas c
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      LEFT JOIN usuarios u ON u.id = c.asesor_id
      WHERE c.centro_id = ?
      AND DATE(c.start_at) BETWEEN ? AND ?
      AND (
        c.asesor_id = ?
        OR c.created_by = ?
      )
      ORDER BY c.start_at
      `,
      [centroId, start, end, userId, userId]
    );

    return NextResponse.json(rows);
  } catch (err) {
    console.error(err);
    return NextResponse.json([]);
  }
}
