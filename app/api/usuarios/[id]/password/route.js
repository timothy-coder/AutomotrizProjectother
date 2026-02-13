import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

export async function PATCH(req, { params }) {

  try {

    const { id } = params;
    const { password } = await req.json();

    if (!password)
      return NextResponse.json({ message: "Password requerido" }, { status: 400 });

    const hash = await bcrypt.hash(password, 10);

    await db.query(
      "UPDATE usuarios SET password_hash=? WHERE id=?",
      [hash, id]
    );

    return NextResponse.json({ message: "Password actualizado" });

  } catch {
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
