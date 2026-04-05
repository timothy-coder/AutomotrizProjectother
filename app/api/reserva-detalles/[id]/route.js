import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    const [data] = await db.query(`
      SELECT 
        rd.id,
        rd.tipo_comprobante,
        rd.fecha_nacimiento,
        rd.ocupacion,
        rd.domicilio,
        rd.departamento_id,
        rd.provincia_id,
        rd.distrito_id,
        rd.nombreconyugue,
        rd.dniconyugue,
        rd.vin,
        rd.usovehiculo,
        rd.placa,
        rd.numero_motor,
        rd.dsctocredinissan,
        rd.dsctotienda,
        rd.dsctobonoretoma,
        rd.dsctonper,
        rd.cantidad,
        rd.precio_unitario,
        rd.flete,
        rd.tarjetaplaca,
        rd.glp,
        rd.tc_referencial,
        rd.total
      FROM reserva_detalles rd
      WHERE rd.id = ?
    `, [id]);

    if (data.length === 0) {
      return NextResponse.json(
        { message: "Detalle de reserva no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(data[0]);
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    // ✅ Verificar que el detalle de reserva existe
    const [detalleCheck] = await db.query(
      "SELECT id FROM reserva_detalles WHERE id = ?",
      [id]
    );

    if (detalleCheck.length === 0) {
      return NextResponse.json(
        { message: "Detalle de reserva no encontrado" },
        { status: 404 }
      );
    }

    // ✅ Campos permitidos para actualizar
    const allowedFields = [
      "tipo_comprobante",
      "fecha_nacimiento",
      "ocupacion",
      "domicilio",
      "departamento_id",
      "provincia_id",
      "distrito_id",
      "nombreconyugue",
      "dniconyugue",
      "vin",
      "usovehiculo",
      "placa",
      "numero_motor",
      "dsctocredinissan",
      "dsctotienda",
      "dsctobonoretoma",
      "dsctonper",
      "cantidad",
      "precio_unitario",
      "flete",
      "tarjetaplaca",
      "glp",
      "tc_referencial",
      "total",
    ];

    const updates = [];
    const values = [];

    // ✅ Construir UPDATE dinámicamente
    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        updates.push(`${key} = ?`);
        values.push(value === "" ? null : value);
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { message: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    values.push(id);

    const query = `
      UPDATE reserva_detalles 
      SET ${updates.join(", ")}, updated_at = NOW()
      WHERE id = ?
    `;

    const [result] = await db.query(query, values);

    return NextResponse.json({
      message: "Detalle de reserva actualizado exitosamente",
      affectedRows: result.affectedRows,
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}