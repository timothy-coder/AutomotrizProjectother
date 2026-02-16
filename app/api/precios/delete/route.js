import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
  const { carrosparamantenimiento_id, submantenimiento_id } = await req.json();

  await db.query(`
    DELETE FROM precios
    WHERE carrosparamantenimiento_id = ?
    AND submantenimiento_id = ?
  `, [carrosparamantenimiento_id, submantenimiento_id]);

  return NextResponse.json({ message: "Eliminado" });
}
