import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function GET(req, context) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;

    const [rows] = await db.query(
      `
      SELECT
        c.id,
        c.centro_id,
        c.taller_id,
        c.cliente_id,
        c.vehiculo_id,
        c.asesor_id,
        c.origen_id,
        c.start_at,
        c.end_at,
        c.estado,
        c.created_by,
        c.tipo_servicio,
        c.servicio_valet,
        c.fecha_promesa,
        c.hora_promesa,
        c.nota_cliente,
        c.nota_interna
      FROM citas c
      WHERE c.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return NextResponse.json(
        { message: "Cita no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("ERROR GET /api/citas/[id]:", error);
    return NextResponse.json({ message: "Error obteniendo cita" }, { status: 500 });
  }
}

export async function PUT(req, context) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  try {
    const { id } = await context.params;
    const body = await req.json();

    const {
      centro_id,
      taller_id,
      cliente_id,
      vehiculo_id,
      asesor_id,
      origen_id,
      start_at,
      end_at,
      tipo_servicio,
      servicio_valet,
      fecha_promesa,
      hora_promesa,
      nota_cliente,
      nota_interna,
    } = body;

    const missing = [];

    if (!centro_id) missing.push("centro_id");
    if (!cliente_id) missing.push("cliente_id");
    if (!start_at) missing.push("start_at");
    if (!end_at) missing.push("end_at");
    if (!tipo_servicio) missing.push("tipo_servicio");

    if (missing.length > 0) {
      return NextResponse.json(
        { message: `Datos incompletos: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      `
      UPDATE citas
      SET
        centro_id = ?,
        taller_id = ?,
        cliente_id = ?,
        vehiculo_id = ?,
        asesor_id = ?,
        origen_id = ?,
        start_at = ?,
        end_at = ?,
        tipo_servicio = ?,
        servicio_valet = ?,
        fecha_promesa = ?,
        hora_promesa = ?,
        nota_cliente = ?,
        nota_interna = ?
      WHERE id = ?
      `,
      [
        centro_id,
        taller_id || null,
        cliente_id,
        vehiculo_id || null,
        asesor_id || null,
        origen_id || null,
        start_at,
        end_at,
        tipo_servicio,
        servicio_valet ? 1 : 0,
        fecha_promesa || null,
        hora_promesa || null,
        nota_cliente?.trim() || null,
        nota_interna?.trim() || null,
        id,
      ]
    );

    if (!result.affectedRows) {
      return NextResponse.json(
        { message: "Cita no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Cita actualizada correctamente",
      id: Number(id),
    });
  } catch (error) {
    console.error("ERROR PUT /api/citas/[id]:", error);
    return NextResponse.json({ message: "Error actualizando cita" }, { status: 500 });
  }
}