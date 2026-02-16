export async function POST(req, context) {
  const { id } = await context.params;
  const { start_at, end_at, created_by } = await req.json();

  const [result] = await db.query(`
    INSERT INTO citas (
      centro_id, cliente_id, start_at, end_at,
      reprogramada_desde_id, created_by
    )
    SELECT centro_id, cliente_id, ?, ?, id, ?
    FROM citas WHERE id=?
  `, [start_at, end_at, created_by, id]);

  return Response.json({ new_id: result.insertId });
}
