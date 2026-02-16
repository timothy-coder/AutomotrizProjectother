import { db } from "@/lib/db";

export async function GET() {
  const [rows] = await db.query("SELECT * FROM submantenimiento ORDER BY name");
  return Response.json(rows);
}

export async function POST(req) {
  const { name, type_id, is_active } = await req.json();

  await db.query(
    "INSERT INTO submantenimiento (name, type_id, is_active) VALUES (?,?,?)",
    [name, type_id, is_active]
  );

  return Response.json({ ok: true });
}
