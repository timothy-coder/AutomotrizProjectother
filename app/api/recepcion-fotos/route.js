import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const recepcion_id = searchParams.get("recepcion_id");

  const [rows] = await db.query(
    "SELECT * FROM recepcion_audios WHERE recepcion_id=?",
    [recepcion_id]
  );

  return NextResponse.json(rows);
}

export async function POST(req) {
  const { recepcion_id, url } = await req.json();

  const [r] = await db.query(`
    INSERT INTO recepcion_audios (recepcion_id, url)
    VALUES (?,?)
  `,[recepcion_id, url]);

  return NextResponse.json({ id: r.insertId });
}

export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  await db.query("DELETE FROM recepcion_audios WHERE id=?", [id]);

  return NextResponse.json({ message: "Audio eliminado" });
}

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const recepcion_id = searchParams.get("recepcion_id");

  const [rows] = await db.query(
    "SELECT * FROM recepcion_fotos WHERE recepcion_id=?",
    [recepcion_id]
  );

  return NextResponse.json(rows);
}
export async function POST(req) {
  const { recepcion_id, url } = await req.json();

  const [r] = await db.query(`
    INSERT INTO recepcion_fotos (recepcion_id, url)
    VALUES (?,?)
  `,[recepcion_id, url]);

  return NextResponse.json({ id: r.insertId });
}
export async function DELETE(req) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  await db.query("DELETE FROM recepcion_fotos WHERE id=?", [id]);

  return NextResponse.json({ message: "Foto eliminada" });
}
