import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  const { centroId } = await params;

  const [rows] = await db.query(
    "SELECT * FROM horacitas_centro WHERE centro_id=? LIMIT 1",
    [centroId]
  );

  if (!rows.length) return NextResponse.json(null);

  const row = rows[0];

  return NextResponse.json({
    ...row,
    week_json: row.week_json ? JSON.parse(row.week_json) : {}
  });
}

export async function PUT(req, { params }) {
  const { centroId } = await params;

  const { slot_minutes, week_json } = await req.json();

  // UPSERT: si existe, update. si no existe, insert.
  const [rows] = await db.query(
    "SELECT id FROM horacitas_centro WHERE centro_id=? LIMIT 1",
    [centroId]
  );

  if (rows.length) {
    await db.query(`
      UPDATE horacitas_centro
      SET slot_minutes=?, week_json=?, updated_at=NOW()
      WHERE centro_id=?
    `, [slot_minutes, JSON.stringify(week_json), centroId]);
  } else {
    await db.query(`
      INSERT INTO horacitas_centro(centro_id, slot_minutes, week_json, created_at, updated_at)
      VALUES(?,?,?,NOW(),NOW())
    `, [centroId, slot_minutes, JSON.stringify(week_json)]);
  }

  return NextResponse.json({ message: "Guardado" });
}
