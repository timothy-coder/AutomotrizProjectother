import { db } from "@/lib/db";

export async function GET() {

  const [rows] = await db.query(`
    SELECT
      c.*,
      cl.nombre AS cliente,
      v.placa,
      u.nombre AS asesor
    FROM citas c
    JOIN clientes cl ON cl.id = c.cliente_id
    LEFT JOIN vehiculos v ON v.id = c.vehiculo_id
    LEFT JOIN usuarios u ON u.id = c.asesor_id
    ORDER BY c.start_at DESC
  `);

  return Response.json(rows);
}
export async function POST(req) {

  const data = await req.json();

  const [result] = await db.query(`
    INSERT INTO citas (
      centro_id,
      taller_id,
      cliente_id,
      vehiculo_id,
      asesor_id,
      origen_id,
      start_at,
      end_at,
      tipo_servicio,
      servicio_valet,
      nota_cliente,
      nota_interna,
      created_by
    )
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
  `, [
    data.centro_id,
    data.taller_id,
    data.cliente_id,
    data.vehiculo_id,
    data.asesor_id,
    data.origen_id,
    data.start_at,
    data.end_at,
    data.tipo_servicio,
    data.servicio_valet ? 1 : 0,
    data.nota_cliente,
    data.nota_interna,
    data.created_by
  ]);

  return Response.json({ id: result.insertId });
}
