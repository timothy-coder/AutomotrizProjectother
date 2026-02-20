import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const recepcion_id = searchParams.get("recepcion_id");

  const [rows] = await db.query(
    "SELECT * FROM recepcion_videos WHERE recepcion_id=?",
    [recepcion_id]
  );

  return NextResponse.json(rows);
}

export async function POST(req) {
  const { recepcion_id, url } = await req.json();

  const [r] = await db.query(`
    INSERT INTO recepcion_videos (recepcion_id, url)
    VALUES (?,?)
  `,[recepcion_id, url]);

  return NextResponse.json({ id: r.insertId });
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  await db.query("DELETE FROM recepcion_videos WHERE id=?", [id]);

  return NextResponse.json({ message: "Video eliminado" });
}
