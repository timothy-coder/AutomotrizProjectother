import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/vehiculos/10
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const [rows] = await db.query(
      `
      SELECT v.*,
        m.name AS marca_nombre,
        mo.name AS modelo_nombre
      FROM vehiculos v
      LEFT JOIN marcas m ON m.id = v.marca_id
      LEFT JOIN modelos mo ON mo.id = v.modelo_id
      WHERE v.id=?
      `,
      [id]
    );

    const item = rows?.[0];
    if (!item) return NextResponse.json({ message: "No existe" }, { status: 404 });

    return NextResponse.json(item);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

// PUT /api/vehiculos/10
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const placas = (body.placas || "").trim();
    const vin = (body.vin || "").trim();
    const marca_id = body.marca_id == null || body.marca_id === "" ? null : Number(body.marca_id);
    const modelo_id = body.modelo_id == null || body.modelo_id === "" ? null : Number(body.modelo_id);
    const anio = body.anio == null || body.anio === "" ? null : Number(body.anio);
    const color = (body.color || "").trim();
    const kilometraje = body.kilometraje == null || body.kilometraje === "" ? null : Number(body.kilometraje);

    if (!placas && !vin) {
      return NextResponse.json({ message: "Ingrese placas o VIN" }, { status: 400 });
    }

    const [result] = await db.query(
      `
      UPDATE vehiculos SET
        placas=?,
        vin=?,
        marca_id=?,
        modelo_id=?,
        anio=?,
        color=?,
        kilometraje=?
      WHERE id=?
      `,
      [
        placas || null,
        vin || null,
        Number.isFinite(marca_id) ? marca_id : null,
        Number.isFinite(modelo_id) ? modelo_id : null,
        Number.isFinite(anio) ? anio : null,
        color || null,
        Number.isFinite(kilometraje) ? kilometraje : null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: "No existe" }, { status: 404 });
    }

    return NextResponse.json({ message: "Vehículo actualizado" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

// DELETE /api/vehiculos/10
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    const [result] = await db.query(`DELETE FROM vehiculos WHERE id=?`, [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: "No existe" }, { status: 404 });
    }

    return NextResponse.json({ message: "Vehículo eliminado" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
