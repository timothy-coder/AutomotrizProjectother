import { NextResponse } from "next/server";
import { db } from "@/lib/db";


// =====================================
// GET ONE
// =====================================
export async function GET(req, context) {
  try {
    const { id } = await context.params;

    const [rows] = await db.query(
      `SELECT * FROM recepciones WHERE id = ?`,
      [id]
    );

    if (!rows.length)
      return NextResponse.json({ message: "No existe" }, { status: 404 });

    return NextResponse.json(rows[0]);

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}


// =====================================
// PUT → actualizar recepción
// =====================================
export async function PUT(req, context) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    await db.query(
      `
      UPDATE recepciones SET
        cliente_id=?,
        carro_id=?,
        centro_id=?,
        taller_id=?,
        notas_cliente=?,
        notas_generales=?,
        updated_at = NOW()
      WHERE id=?
      `,
      [
        body.cliente_id,
        body.carro_id,
        body.centro_id || null,
        body.taller_id || null,
        body.notas_cliente || null,
        body.notas_generales || null,
        id,
      ]
    );

    return NextResponse.json({ message: "Recepción actualizada" });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}


// =====================================
// DELETE
// =====================================
export async function DELETE(req, context) {
  try {
    const { id } = await context.params;

    await db.query(`DELETE FROM recepciones WHERE id=?`, [id]);

    return NextResponse.json({ message: "Recepción eliminada" });

  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
