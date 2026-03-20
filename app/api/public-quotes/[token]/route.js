import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/public-quotes/:token
export async function GET(req, { params }) {
  try {
    const { token } = await params;

    const [idRows] = await db.query(
      "SELECT id FROM cotizaciones WHERE public_token = ?",
      [token]
    );

    if (!idRows.length) {
      return NextResponse.json({ message: "Cotización no encontrada" }, { status: 404 });
    }

    const { id } = idRows[0];
    
    // Register the view
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "Unknown";
    const userAgent = req.headers.get("user-agent") || "Unknown";
    
    await db.query(
      "INSERT INTO cotizaciones_views (cotizacion_id, ip_address, user_agent) VALUES (?, ?, ?)",
      [id, ip, userAgent.substring(0, 255)]
    );

    // Fetch details using the exact same queries as /api/cotizaciones/[id]
    let rows;
    try {
      [rows] = await db.query(
        `SELECT c.*,
                CONCAT(cl.nombre, ' ', IFNULL(cl.apellido,'')) AS cliente_nombre,
                cl.email AS cliente_email,
                cl.celular AS cliente_celular,
                u.fullname AS usuario_nombre,
                ct.nombre AS tarifa_nombre,
                ce.nombre AS centro_nombre,
                t.nombre AS taller_nombre,
                mo.nombre AS mostrador_nombre,
                mon.codigo AS moneda_codigo,
                mon.simbolo AS moneda_simbolo,
                im.nombre AS impuesto_nombre,
                im.porcentaje AS impuesto_porcentaje_config
         FROM cotizaciones c
         LEFT JOIN clientes cl ON c.cliente_id = cl.id
         LEFT JOIN usuarios u ON c.usuario_id = u.id
         LEFT JOIN cotizacion_tarifas ct ON c.tarifa_id = ct.id
         LEFT JOIN centros ce ON c.centro_id = ce.id
         LEFT JOIN talleres t ON c.taller_id = t.id
         LEFT JOIN mostradores mo ON c.mostrador_id = mo.id
         LEFT JOIN monedas mon ON c.moneda_id = mon.id
         LEFT JOIN impuestos im ON c.impuesto_id = im.id
         WHERE c.id = ?`,
        [id]
      );
    } catch (e) {
      if (e?.code !== "ER_BAD_FIELD_ERROR") throw e;
      [rows] = await db.query(
        `SELECT c.*,
                CONCAT(cl.nombre, ' ', IFNULL(cl.apellido,'')) AS cliente_nombre,
                cl.email AS cliente_email,
                cl.celular AS cliente_celular,
                u.fullname AS usuario_nombre,
                ct.nombre AS tarifa_nombre,
                ce.nombre AS centro_nombre,
                t.nombre AS taller_nombre,
                mo.nombre AS mostrador_nombre
         FROM cotizaciones c
         LEFT JOIN clientes cl ON c.cliente_id = cl.id
         LEFT JOIN usuarios u ON c.usuario_id = u.id
         LEFT JOIN cotizacion_tarifas ct ON c.tarifa_id = ct.id
         LEFT JOIN centros ce ON c.centro_id = ce.id
         LEFT JOIN talleres t ON c.taller_id = t.id
         LEFT JOIN mostradores mo ON c.mostrador_id = mo.id
         WHERE c.id = ?`,
        [id]
      );
    }

    if (!rows.length) {
      return NextResponse.json({ message: "No encontrada" }, { status: 404 });
    }

    const cotizacion = rows[0];

    // Load products
    const [productos] = await db.query(
      `SELECT cp.*, p.numero_parte, p.descripcion AS producto_nombre
       FROM cotizacion_productos cp
       LEFT JOIN productos p ON cp.producto_id = p.id
       WHERE cp.cotizacion_id = ?`,
      [id]
    );

    // Load extras
    const [extras] = await db.query(
      "SELECT * FROM cotizacion_extras WHERE cotizacion_id = ?",
      [id]
    );

    return NextResponse.json({ ...cotizacion, productos, extras });
  } catch (error) {
    console.error("Error fetching public quote:", error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
