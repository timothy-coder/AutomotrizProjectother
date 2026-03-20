import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import crypto from "crypto";

export async function POST(req, { params }) {
  try {
    const { id } = await params;

    const [rows] = await db.query(
      "SELECT public_token FROM cotizaciones WHERE id = ?",
      [id]
    );

    if (!rows.length) {
      return NextResponse.json({ message: "No encontrada" }, { status: 404 });
    }

    let token = rows[0].public_token;

    if (!token) {
      token = crypto.randomUUID();
      await db.query(
        "UPDATE cotizaciones SET public_token = ? WHERE id = ?",
        [token, id]
      );
    }

    return NextResponse.json({ token });
  } catch (error) {
    console.error("Error generating public link:", error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
