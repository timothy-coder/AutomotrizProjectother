import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
  try {
    const {
      cotizacion_id,
      accesorio_id,
      cantidad,
    } = await req.json();

    if (!cotizacion_id || !accesorio_id || !cantidad) {
      return NextResponse.json(
        { message: "Campos requeridos: cotizacion_id, accesorio_id, cantidad" },
        { status: 400 }
      );
    }

    // ✅ Obtener accesorio para copiar precio y moneda
    const [accesorio] = await db.query(
      `SELECT precio, moneda_id FROM accesorios_disponibles WHERE id = ?`,
      [accesorio_id]
    );

    if (!accesorio || accesorio.length === 0) {
      return NextResponse.json(
        { message: "Accesorio no encontrado" },
        { status: 404 }
      );
    }

    const precio_unitario = accesorio[0].precio;
    const moneda_id = accesorio[0].moneda_id;
    const subtotal = cantidad * precio_unitario;

    // ✅ Insertar con valores congelados
    const [result] = await db.query(
      `INSERT INTO cotizaciones_accesorios 
       (cotizacion_id, accesorio_id, cantidad, precio_unitario, moneda_id, subtotal, total)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        cotizacion_id,
        accesorio_id,
        cantidad,
        precio_unitario,
        moneda_id,
        subtotal,
        subtotal,  // total inicial = subtotal (sin descuento)
      ]
    );

    return NextResponse.json(
      {
        message: "Accesorio agregado a cotización",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

// ✅ GET todos los accesorios de una cotización
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const cotizacion_id = searchParams.get("cotizacion_id");

    if (!cotizacion_id) {
      return NextResponse.json(
        { message: "cotizacion_id es requerido" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      `SELECT 
        ca.*,
        aa.detalle,
        aa.numero_parte,
        m.codigo as moneda_codigo,
        m.simbolo as moneda_simbolo
       FROM cotizaciones_accesorios ca
       INNER JOIN accesorios_disponibles aa ON ca.accesorio_id = aa.id
       INNER JOIN monedas m ON ca.moneda_id = m.id
       WHERE ca.cotizacion_id = ?
       ORDER BY ca.created_at DESC`,
      [cotizacion_id]
    );

    return NextResponse.json(rows);
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}