import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ================= GET =================
export async function GET(req, context) {
  try {
    const { id } = await context.params;
    const vehicleId = Number(id);

    const [rows] = await db.query(
      `SELECT v.*,
              m.name AS marca_nombre,
              mo.name AS modelo_nombre
       FROM vehiculos v
       LEFT JOIN marcas m ON m.id = v.marca_id
       LEFT JOIN modelos mo ON mo.id = v.modelo_id
       WHERE v.id=?`,
      [vehicleId]
    );

    if (!rows.length) {
      return NextResponse.json({ message: "No existe" }, { status: 404 });
    }

    return NextResponse.json(rows[0]);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

// ================= PUT =================
export async function PUT(req, context) {
  try {
    const { id } = await context.params;
    const vehicleId = Number(id);

    const body = await req.json();

    const placas = body.placas?.trim() || null;
    const vin = body.vin?.trim() || null;
    const marca_id = body.marca_id || null;
    const modelo_id = body.modelo_id || null;
    const anio = body.anio || null;
    const color = body.color?.trim() || null;
    const kilometraje = body.kilometraje || null;

    const [result] = await db.query(
      `UPDATE vehiculos SET
        placas=?,
        vin=?,
        marca_id=?,
        modelo_id=?,
        anio=?,
        color=?,
        kilometraje=?
       WHERE id=?`,
      [
        placas,
        vin,
        marca_id,
        modelo_id,
        anio,
        color,
        kilometraje,
        vehicleId,
      ]
    );

    if (!result.affectedRows) {
      return NextResponse.json({ message: "No existe" }, { status: 404 });
    }

    return NextResponse.json({ message: "Vehículo actualizado" });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

// ================= DELETE =================
export async function DELETE(req, context) {
  try {
    const { id } = await context.params;
    const vehicleId = Number(id);

    if (!vehicleId) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

    const [result] = await db.query(
      "DELETE FROM vehiculos WHERE id=?",
      [vehicleId]
    );

    if (!result.affectedRows) {
      return NextResponse.json({ message: "No existe" }, { status: 404 });
    }

    return NextResponse.json({ message: "Vehículo eliminado" });
  } catch (e) {
    console.error("DELETE ERROR:", e);

    if (e.code === "ER_ROW_IS_REFERENCED_2") {
      return NextResponse.json(
        { message: "No se puede eliminar: tiene citas asociadas" },
        { status: 409 }
      );
    }

    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
