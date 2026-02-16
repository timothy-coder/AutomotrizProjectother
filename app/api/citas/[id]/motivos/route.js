export async function GET(req, context) {
  const { id } = await context.params;

  const [rows] = await db.query(`
    SELECT cm.*, m.nombre AS motivo, sm.nombre AS submotivo
    FROM cita_motivos cm
    JOIN motivos_citas m ON m.id=cm.motivo_id
    LEFT JOIN submotivos_citas sm ON sm.id=cm.submotivo_id
    WHERE cm.cita_id=?
  `,[id]);

  return Response.json(rows);
}
export async function POST(req, context) {
  const { id } = await context.params;
  const { motivo_id, submotivo_id } = await req.json();

  await db.query(`
    INSERT INTO cita_motivos (cita_id, motivo_id, submotivo_id)
    VALUES (?,?,?)
  `,[id, motivo_id, submotivo_id]);

  return Response.json({ ok:true });
}
