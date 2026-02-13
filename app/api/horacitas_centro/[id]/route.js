import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req, { params }) {

  const { id } = await params;
  const { slot_minutes, week_json } = await req.json();

  await db.query(`
    UPDATE horacitas_centro
    SET slot_minutes=?,
        week_json=?,
        updated_at = NOW()
    WHERE id=?
  `, [
    slot_minutes,
    JSON.stringify(week_json),
    id
  ]);

  return NextResponse.json({ message: "Horario actualizado" });
}

export async function DELETE(req, { params }) {

  const { id } = await params;

  await db.query(`DELETE FROM horacitas_centro WHERE id=?`, [id]);

  return NextResponse.json({ message: "Horario eliminado" });
}
