import { db } from "@/lib/db";

export async function PUT(req, context) {
  const { id } = await context.params;
  const { name,description, is_active } = await req.json();

  await db.query(
    "UPDATE mantenimiento SET name=?,description=?, is_active=? WHERE id=?",
    [name,description, is_active, id]
  );

  return Response.json({ ok: true });
}

export async function DELETE(req, context) {
  const { id } = await context.params;

  // eliminar submantenimientos primero
  await db.query("DELETE FROM submantenimiento WHERE type_id=?", [id]);

  await db.query("DELETE FROM mantenimiento WHERE id=?", [id]);

  return Response.json({ ok: true });
}
