import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/cotizaciones?tipo=taller|pyp
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const tipo = searchParams.get("tipo");

    let query = `
      SELECT
        c.*,
        CONCAT(cl.nombre, ' ', IFNULL(cl.apellido,'')) AS cliente_nombre,
        u.fullname AS usuario_nombre,
        ct.nombre AS tarifa_nombre,
        ce.nombre AS centro_nombre,
        t.nombre AS taller_nombre,
        m.nombre AS mostrador_nombre
      FROM cotizaciones c
      LEFT JOIN clientes cl ON c.cliente_id = cl.id
      LEFT JOIN usuarios u ON c.usuario_id = u.id
      LEFT JOIN cotizacion_tarifas ct ON c.tarifa_id = ct.id
      LEFT JOIN centros ce ON c.centro_id = ce.id
      LEFT JOIN talleres t ON c.taller_id = t.id
      LEFT JOIN mostradores m ON c.mostrador_id = m.id
    `;
    const params = [];

    if (tipo) {
      query += " WHERE c.tipo = ?";
      params.push(tipo);
    }

    query += " ORDER BY c.created_at DESC";

    const [rows] = await db.query(query, params);
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Error fetching cotizaciones:", error);
    return NextResponse.json([], { status: 200 });
  }
}

// POST /api/cotizaciones
export async function POST(req) {
  const conn = await db.getConnection();
  try {
    const body = await req.json();
    const {
      tipo, cliente_id, usuario_id, descripcion,
      centro_id, taller_id, mostrador_id,
      horas_trabajo, tarifa_id, tarifa_hora,
      descuento_porcentaje, descuento_monto,
      productos, extras
    } = body;

    if (!tipo || !usuario_id) {
      return NextResponse.json({ message: "Faltan campos requeridos (tipo, usuario)" }, { status: 400 });
    }

    await conn.beginTransaction();

    // Calculate subtotals
    const subtotal_productos = (productos || []).reduce((sum, p) => {
      const base = Number(p.subtotal || 0);
      const desc = Number(p.descuento_porcentaje || 0);
      return sum + (base - base * desc / 100);
    }, 0);
    const subtotal_mano_obra = Number(horas_trabajo || 0) * Number(tarifa_hora || 0);
    const subtotal_extras = (extras || []).reduce((sum, e) => sum + Number(e.monto || 0), 0);
    const bruto = subtotal_productos + subtotal_mano_obra + subtotal_extras;
    const descPct = Number(descuento_porcentaje || 0);
    const descMonto = Number(descuento_monto || 0);
    const monto_total = bruto - (bruto * descPct / 100) - descMonto;

    // Insert main cotización
    const [result] = await conn.query(
      `INSERT INTO cotizaciones
        (tipo, cliente_id, usuario_id, descripcion,
         centro_id, taller_id, mostrador_id,
         subtotal_productos, subtotal_mano_obra, subtotal_extras,
         descuento_porcentaje, descuento_monto,
         monto_total, horas_trabajo, tarifa_id, tarifa_hora, estado)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendiente')`,
      [
        tipo, cliente_id || null, usuario_id, descripcion || null,
        centro_id || null, taller_id || null, mostrador_id || null,
        subtotal_productos, subtotal_mano_obra, subtotal_extras,
        descPct, descMonto,
        monto_total, horas_trabajo || 0, tarifa_id || null, tarifa_hora || 0
      ]
    );

    const cotizacionId = result.insertId;

    // Insert productos
    if (productos && productos.length > 0) {
      const prodValues = productos.map(p => [
        cotizacionId, p.producto_id, p.cantidad, p.precio_unitario, p.subtotal,
        Number(p.descuento_porcentaje || 0)
      ]);
      await conn.query(
        `INSERT INTO cotizacion_productos (cotizacion_id, producto_id, cantidad, precio_unitario, subtotal, descuento_porcentaje)
         VALUES ?`,
        [prodValues]
      );
    }

    // Insert extras
    if (extras && extras.length > 0) {
      const extValues = extras.map(e => [cotizacionId, e.descripcion, e.monto]);
      await conn.query(
        `INSERT INTO cotizacion_extras (cotizacion_id, descripcion, monto) VALUES ?`,
        [extValues]
      );
    }

    await conn.commit();
    return NextResponse.json({ message: "Cotización creada", id: cotizacionId });
  } catch (error) {
    await conn.rollback();
    console.error("Error creating cotización:", error);
    return NextResponse.json({ message: "Error al crear cotización" }, { status: 500 });
  } finally {
    conn.release();
  }
}
