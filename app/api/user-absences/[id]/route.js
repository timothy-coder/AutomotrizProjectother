import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req, { params }) {
  const { id } = await params;
  const body = await req.json();

  await db.query(`
    UPDATE user_absences
    SET user_id=?,
        start_date=?,
        end_date=?,
        start_time=?,
        end_time=?,
        reason=?,
        notes=?,
        will_be_absent=?
    WHERE id=?
  `, [
    body.user_id,
    body.start_date,
    body.end_date,
    body.start_time,
    body.end_time,
    body.reason,
    body.notes,
    body.will_be_absent ? 1 : 0,
    id
  ]);

  return NextResponse.json({ message:"Actualizado" });
}


export async function DELETE(req, { params }) {
  try {
    await db.query("DELETE FROM user_absences WHERE id=?", [params.id]);
    return NextResponse.json({ message: "Eliminado" });
  } catch (e) {
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
