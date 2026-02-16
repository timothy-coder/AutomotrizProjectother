export async function DELETE(req, context) {
  const { id } = await context.params;
  await db.query("DELETE FROM cita_archivos WHERE id=?", [id]);
  return Response.json({ ok:true });
}
