import { db } from "@/lib/db";
export async function GET(req, context) {
  const { id } = await context.params;

  const [[cita]] = await db.query(
    `SELECT * FROM citas WHERE id=?`, [id]
  );

  return Response.json(cita);
}

export async function PUT(req, context) {
  const { id } = await context.params;
  const data = await req.json();

  await db.query(`
    UPDATE citas SET
      centro_id=?,
      taller_id=?,
      cliente_id=?,
      vehiculo_id=?,
      asesor_id=?,
      origen_id=?,
      start_at=?,
      end_at=?,
      tipo_servicio=?,
      servicio_valet=?,
      nota_cliente=?,
      nota_interna=?
    WHERE id=?
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
    id
  ]);

  return Response.json({ ok: true });
}
export async function DELETE(req, context) {
  const { id } = await context.params;
  await db.query("DELETE FROM citas WHERE id=?", [id]);
  return Response.json({ ok: true });
}
