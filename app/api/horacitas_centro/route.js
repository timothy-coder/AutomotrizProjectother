import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {

  const [rows] = await db.query(`
    SELECT hc.*, c.nombre centro
    FROM horacitas_centro hc
    JOIN centros c ON c.id = hc.centro_id
  `);

  return NextResponse.json(rows);
}

export async function POST(req) {

  const { centro_id, slot_minutes, week_json } = await req.json();

  await db.query(`
    INSERT INTO horacitas_centro
    (centro_id, slot_minutes, week_json)
    VALUES(?,?,?)
  `, [
    centro_id,
    slot_minutes,
    JSON.stringify(week_json)
  ]);

  return NextResponse.json({ message: "Horario creado" });
}
