import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    const centroId = searchParams.get("centro_id");
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const asesorId = searchParams.get("asesor_id");

    if (!centroId || !start || !end) {
      return NextResponse.json([]);
    }

    // 🔥 rango completo del día
    const startDateTime = `${start} 00:00:00`;
    const endDateTime   = `${end} 23:59:59`;

    let query = `
      SELECT
        c.id,
        c.start_at,
        c.end_at,
        c.estado,
        c.asesor_id,

        CONCAT(cl.nombre,' ',cl.apellido) AS cliente,
        IFNULL(v.placas,'SIN PLACA') AS placa,
        IFNULL(u.fullname,'Sin asesor') AS asesor,
        IFNULL(u.color,'#5e17eb') AS color

      FROM citas c
      LEFT JOIN clientes cl ON cl.id = c.cliente_id
      LEFT JOIN usuarios u ON u.id = c.asesor_id
      LEFT JOIN vehiculos v ON v.id = c.vehiculo_id

      WHERE c.centro_id = ?
      AND c.start_at BETWEEN ? AND ?
    `;

    const params = [centroId, startDateTime, endDateTime];

    if (asesorId) {
      query += " AND c.asesor_id = ?";
      params.push(asesorId);
    }

    query += " ORDER BY c.start_at";

    const [rows] = await db.query(query, params);

    return NextResponse.json(rows || []);

  } catch (error) {
    console.error("❌ ERROR API CITAS:", error);
    return NextResponse.json([]);
  }
}
