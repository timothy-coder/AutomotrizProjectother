import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const [detalles] = await db.query(
      `SELECT rd.*, c.marca, c.modelo, c.anio, c.color_externo, c.color_interno, c.sku
       FROM reserva_detalles rd
       LEFT JOIN cotizacionesagenda c ON rd.cotizacion_id = c.id
       WHERE rd.reserva_id = ?
       ORDER BY rd.created_at ASC`,
      [id]
    );

    return NextResponse.json(detalles);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error: " + e.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const {
      cotizacion_id,
      oportunidad_id,
      nombreconyugue,
      dniconyugue,
      vin,
      usovehiculo,
      placa,
      dsctocredinissan,
      dsctotienda,
      dsctobonoretoma,
      dsctonper,
      glp,
      tarjetaplaca,
      flete,
      cantidad,
      precio_unitario,
      descripcion,
    } = await req.json();

    if (!cotizacion_id || !precio_unitario || !vin || !usovehiculo || !placa) {
      return NextResponse.json(
        { message: "Datos incompletos" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      `INSERT INTO reserva_detalles (
        reserva_id,
        cotizacion_id,
        oportunidad_id,
        nombreconyugue,
        dniconyugue,
        vin,
        usovehiculo,
        placa,
        dsctocredinissan,
        dsctotienda,
        dsctobonoretoma,
        dsctonper,
        glp,
        tarjetaplaca,
        flete,
        cantidad,
        precio_unitario,
        descripcion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        cotizacion_id,
        oportunidad_id,
        nombreconyugue || null,
        dniconyugue || null,
        vin,
        usovehiculo,
        placa,
        dsctocredinissan || 0,
        dsctotienda || 0,
        dsctobonoretoma || 0,
        dsctonper || 0,
        glp || 0,
        tarjetaplaca || 0,
        flete || 0,
        cantidad || 1,
        precio_unitario,
        descripcion || null,
      ]
    );

    return NextResponse.json({
      message: "Detalle agregado",
      id: result.insertId
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error: " + e.message }, { status: 500 });
  }
}