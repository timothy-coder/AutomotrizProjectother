import { NextResponse } from "next/server";
import { verifyToken } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req) {

  try {

    const token = req.headers.get("authorization")?.split(" ")[1];

    if (!token) {
      return NextResponse.json({ message: "No autorizado" }, { status: 401 });
    }

    const decoded = verifyToken(token);

    const [rows] = await db.query(
      "SELECT id, fullname, username, role, permissions FROM usuarios WHERE id=?",
      [decoded.id]
    );

    return NextResponse.json(rows[0]);

  } catch {
    return NextResponse.json({ message: "Token inválido" }, { status: 401 });
  }
}
