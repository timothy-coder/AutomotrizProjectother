import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {

  const { producto_id } = await params;

  const [rows] = await db.query(`
    SELECT * FROM stock_parcial
    WHERE producto_id=?
  `, [producto_id]);

  return NextResponse.json(rows);
}
