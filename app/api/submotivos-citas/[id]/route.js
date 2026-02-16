import { db } from "@/lib/db";

export async function PUT(req, context) {
  const { id } = await context.params;
  const { motivo_id, nombre, is_active } = await req.json();

  if (!motivo_id || !String(nombre || "").trim()) {
    return Response.json(
      { ok: false, message: "motivo_id y nombre son requeridos" },
      { status: 400 }
    );
  }

  await db.query(
    `
    UPDATE submotivos_citas
    SET motivo_id = ?, nombre = ?, is_active = ?
    WHERE id = ?
    `,
    [Number(motivo_id), String(nombre).trim(), is_active ? 1 : 0, Number(id)]
  );

  return Response.json({ ok: true });
}

export async function DELETE(req, context) {
  const { id } = await context.params;

  await db.query(`DELETE FROM submotivos_citas WHERE id = ?`, [Number(id)]);

  return Response.json({ ok: true });
}
