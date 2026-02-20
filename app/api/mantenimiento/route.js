import { db } from "@/lib/db";

export async function GET() {
  const [rows] = await db.query("SELECT * FROM mantenimiento ORDER BY name");
  return Response.json(rows);
}

export async function POST(req) {
  const { name,description, is_active } = await req.json();

  await db.query(
    "INSERT INTO mantenimiento (name,description, is_active) VALUES (?,?)",
    [name,description, is_active]
  );

  return Response.json({ ok: true });
}
