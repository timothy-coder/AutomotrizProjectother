import { db } from "@/lib/db";

export async function GET(req) {
  const { searchParams } = new URL(req.url);

  const active = searchParams.get("active"); // "1" | null
  const motivo_id = searchParams.get("motivo_id"); // "12" | null

  const where = [];
  const params = [];

  if (active === "1") {
    where.push("sm.is_active = 1");
  }
  if (motivo_id) {
    where.push("sm.motivo_id = ?");
    params.push(Number(motivo_id));
  }

  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

  // Si quieres traer nombre del motivo, agrega JOIN aquí
  const [rows] = await db.query(
    `
    SELECT sm.id, sm.motivo_id, sm.nombre, sm.is_active, sm.created_at
    FROM submotivos_citas sm
    ${whereSql}
    ORDER BY sm.motivo_id, sm.nombre
    `,
    params
  );

  return Response.json(rows);
}

export async function POST(req) {
  const { motivo_id, nombre, is_active } = await req.json();

  if (!motivo_id || !String(nombre || "").trim()) {
    return Response.json(
      { ok: false, message: "motivo_id y nombre son requeridos" },
      { status: 400 }
    );
  }

  await db.query(
    `
    INSERT INTO submotivos_citas (motivo_id, nombre, is_active)
    VALUES (?,?,?)
    `,
    [Number(motivo_id), String(nombre).trim(), is_active ? 1 : 0]
  );

  return Response.json({ ok: true });
}
