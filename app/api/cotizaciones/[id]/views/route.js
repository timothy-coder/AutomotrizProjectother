import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const [rows] = await db.query(
      `SELECT ip_address, user_agent, viewed_at 
       FROM cotizaciones_views 
       WHERE cotizacion_id = ? 
       ORDER BY viewed_at DESC`,
      [id]
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching view metrics:", error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
