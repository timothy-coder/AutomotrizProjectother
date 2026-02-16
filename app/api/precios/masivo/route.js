import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
  try {
    const { submantenimiento_id, precio } = await req.json();

    const [autos] = await db.query(`
      SELECT id FROM carrosparamantenimiento
    `);

    for (const auto of autos) {
      await db.query(`
        INSERT INTO precios
        (carrosparamantenimiento_id, submantenimiento_id, precio)
        VALUES (?,?,?)
        ON DUPLICATE KEY UPDATE
        precio = VALUES(precio)
      `, [auto.id, submantenimiento_id, precio]);
    }

    return NextResponse.json({ message: "Columna actualizada" });

  } catch (error) {
    console.log(error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
