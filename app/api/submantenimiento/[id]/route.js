import { db } from "@/lib/db";

export async function PUT(req, context) {
  const { id } = await context.params;
  const { name, type_id, is_active } = await req.json();

  await db.query(
    "UPDATE submantenimiento SET name=?, type_id=?, is_active=? WHERE id=?",
    [name, type_id, is_active, id]
  );

  return Response.json({ ok: true });
}

export async function DELETE(req, context) {
  const { id } = await context.params;

  await db.query("DELETE FROM submantenimiento WHERE id=?", [id]);

  return Response.json({ ok: true });
}
