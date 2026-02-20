import { db } from "@/lib/db";

// GET - Obtener los registros de submantenimiento
export async function GET() {
  const [rows] = await db.query("SELECT * FROM submantenimiento ORDER BY name");
  return Response.json(rows);
}

// POST - Crear un nuevo registro en submantenimiento
export async function POST(req) {
  const { name, type_id, is_active, description } = await req.json();

  await db.query(
    "INSERT INTO submantenimiento (name, type_id, is_active, description) VALUES (?,?,?,?)",
    [name, type_id, is_active, description]
  );

  return Response.json({ ok: true });
}
