import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function GET(req, { params }) {

  try {

    const { id } = params;

    const [rows] = await db.query(
      "SELECT * FROM usuarios WHERE id=?",
      [id]
    );

    if (!rows.length)
      return NextResponse.json({ message: "No existe" }, { status: 404 });

    return NextResponse.json(rows[0]);

  } catch {
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}


export async function PUT(req, { params }) {
  try {
    // ✅ Next 15: params es Promise
    const { id } = await params;

    const body = await req.json();

    const {
      fullname = "",
      username = "",
      email = "",
      phone = "",
      role = "",
      permissions = {},
      work_schedule = {},
      color = null,
      password = "",
    } = body;

    // ✅ Evitar doble stringify si ya viene string
    const permsStr =
      typeof permissions === "string" ? permissions : JSON.stringify(permissions);

    const scheduleStr =
      typeof work_schedule === "string"
        ? work_schedule
        : JSON.stringify(work_schedule);

    // ✅ Password opcional
    let password_hash = null;
    if (password && String(password).trim().length > 0) {
      password_hash = await bcrypt.hash(password, 10);
    }

    await db.query(
      `
      UPDATE usuarios SET
        fullname=?,
        username=?,
        email=?,
        phone=?,
        role=?,
        permissions=?,
        work_schedule=?,
        color=?,
        password_hash = IFNULL(?, password_hash)
      WHERE id=?
    `,
      [
        fullname,
        username,
        email,
        phone,
        role,
        permsStr,
        scheduleStr,
        color, // puede ser null
        password_hash,
        id,
      ]
    );

    return NextResponse.json({ message: "Actualizado" });
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error al actualizar" },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {

  try {

    const { id } = params;

    await db.query("DELETE FROM usuarios WHERE id=?", [id]);

    return NextResponse.json({ message: "Eliminado" });

  } catch {
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
