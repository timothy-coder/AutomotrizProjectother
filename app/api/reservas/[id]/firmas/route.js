import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const [firmas] = await db.query(
      `SELECT rf.*, u.fullname as usuario_nombre, u.email as usuario_email,
              cl.nombre as cliente_nombre, cl.email as cliente_email
       FROM reserva_firmas rf
       LEFT JOIN usuarios u ON rf.usuario_id = u.id
       LEFT JOIN clientes cl ON rf.cliente_id = cl.id
       WHERE rf.reserva_id = ?
       ORDER BY rf.tipo_firma, rf.created_at ASC`,
      [id]
    );

    return NextResponse.json(firmas);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error: " + e.message }, { status: 500 });
  }
}

export async function POST(req, { params }) {
  try {
    const { id } = await params;
    const { revisores } = await req.json();

    if (!revisores || revisores.length === 0) {
      return NextResponse.json(
        { message: "Debe seleccionar revisores" },
        { status: 400 }
      );
    }

    // Actualizar estado a enviado_firma
    await db.query(
      `UPDATE reservas SET estado = 'enviado_firma', updated_at = NOW()
       WHERE id = ?`,
      [id]
    );

    // Crear registros de firma para cada revisor
    for (const revisor of revisores) {
      const { usuario_id, cliente_id, tipo_firma } = revisor;

      await db.query(
        `INSERT INTO reserva_firmas (reserva_id, usuario_id, cliente_id, tipo_firma, estado)
         VALUES (?, ?, ?, ?, 'pendiente')
         ON DUPLICATE KEY UPDATE estado = 'pendiente'`,
        [id, usuario_id || null, cliente_id || null, tipo_firma || 'revisor']
      );
    }

    // Registrar en historial
    await db.query(
      `INSERT INTO reserva_historial (reserva_id, usuario_id, estado_anterior, estado_nuevo, descripcion)
       VALUES (?, ?, 'borrador', 'enviado_firma', 'Reserva enviada a firma')`,
      [id, revisores[0]?.usuario_id || 1]
    );

    return NextResponse.json({ message: "Reserva enviada a firma" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error: " + e.message }, { status: 500 });
  }
}