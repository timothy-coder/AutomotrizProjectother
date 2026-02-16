export async function PATCH(req, context) {
  const { id } = await context.params;
  const { estado } = await req.json();

  await db.query(
    `UPDATE citas SET estado=? WHERE id=?`,
    [estado, id]
  );

  return Response.json({ ok: true });
}
