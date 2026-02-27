import { db } from "@/lib/db";

export async function PUT(req, context) {
  const { id } = await context.params;
  const { name, description, is_active, mantenimiento_id } = await req.json();

  if (!id) {
    return new Response("ID requerido", { status: 400 });
  }

  // Actualizar el mantenimiento
  await db.query(
    "UPDATE mantenimiento SET name = ?, description = ?, is_active = ?, mantenimiento_id = ? WHERE id = ?",
    [name, description, is_active ? 1 : 0, mantenimiento_id, id]
  );

  return new Response(JSON.stringify({ ok: true }));
}

export async function DELETE(req, context) {
  const { id } = await context.params;

  // eliminar submantenimientos primero

  await db.query("DELETE FROM mantenimiento WHERE id=?", [id]);

  return Response.json({ ok: true });
}
