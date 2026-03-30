import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function GET(request) {
  const auth = authorizeConversation(request, "view");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(request.url);

    const centroId = searchParams.get("centro_id");
    const start = searchParams.get("start");
    const end = searchParams.get("end");
    const asesorId = searchParams.get("asesor_id");

    if (!centroId || !start || !end) {
      return NextResponse.json(
        { message: "centro_id, start y end son requeridos" },
        { status: 400 }
      );
    }

    const startDateTime = `${start} 00:00:00`;
    const endDateTime = `${end} 23:59:59`;

    let query;
    const params = [centroId, startDateTime, endDateTime];

    if (asesorId) {
      params.push(asesorId);
      query = `
        SELECT
          c.id,
          c.cliente_id,
          c.centro_id,
          c.taller_id,
          c.vehiculo_id,
          c.start_at,
          c.end_at,
          c.estado,
          c.asesor_id,
          c.nota_cliente,
          c.nota_interna,

          CONCAT(cl.nombre,' ',cl.apellido) AS cliente,
          IFNULL(cl.email,'--') AS correo,
          IFNULL(cl.celular,'--') AS celular,

          IFNULL(v.placas,'SIN PLACA') AS placa,
          IFNULL(v.vin,'--') AS vin,

          IFNULL(ma.name,'--') AS marca,
          IFNULL(mo.name,'--') AS modelo,

          IFNULL(u.fullname,'Sin asesor') AS asesor,
          IFNULL(u.color,'#5e17eb') AS color,

          GROUP_CONCAT(
            DISTINCT CONCAT(
              IFNULL(mc.nombre,'--'),
              IF(cm.submotivo_id IS NOT NULL, CONCAT(' - ', IFNULL(sm.nombre,'--')), '')
            )
            SEPARATOR ' | '
          ) AS motivo

        FROM citas c
        LEFT JOIN clientes cl ON cl.id = c.cliente_id
        LEFT JOIN usuarios u ON u.id = c.asesor_id
        LEFT JOIN vehiculos v ON v.id = c.vehiculo_id
        LEFT JOIN marcas ma ON ma.id = v.marca_id
        LEFT JOIN modelos mo ON mo.id = v.modelo_id
        LEFT JOIN cita_motivos cm ON cm.cita_id = c.id
        LEFT JOIN motivos_citas mc ON mc.id = cm.motivo_id
        LEFT JOIN submotivos_citas sm ON sm.id = cm.submotivo_id

        WHERE c.centro_id = ?
        AND c.start_at BETWEEN ? AND ?
        AND c.asesor_id = ?

        GROUP BY
          c.id,
          c.cliente_id,
          c.centro_id,
          c.taller_id,
          c.vehiculo_id,
          c.start_at,
          c.end_at,
          c.estado,
          c.asesor_id,
          c.nota_cliente,
          c.nota_interna,
          cl.nombre,
          cl.apellido,
          cl.email,
          cl.celular,
          v.placas,
          v.vin,
          ma.name,
          mo.name,
          u.fullname,
          u.color
        ORDER BY c.start_at
      `;
    } else {
      query = `
        SELECT
          c.id,
          c.cliente_id,
          c.centro_id,
          c.taller_id,
          c.vehiculo_id,
          c.start_at,
          c.end_at,
          c.estado,
          c.asesor_id,
          c.nota_cliente,
          c.nota_interna,

          CONCAT(cl.nombre,' ',cl.apellido) AS cliente,
          IFNULL(cl.email,'--') AS correo,
          IFNULL(cl.celular,'--') AS celular,

          IFNULL(v.placas,'SIN PLACA') AS placa,
          IFNULL(v.vin,'--') AS vin,

          IFNULL(ma.name,'--') AS marca,
          IFNULL(mo.name,'--') AS modelo,

          IFNULL(u.fullname,'Sin asesor') AS asesor,
          IFNULL(u.color,'#5e17eb') AS color,

          GROUP_CONCAT(
            DISTINCT CONCAT(
              IFNULL(mc.nombre,'--'),
              IF(cm.submotivo_id IS NOT NULL, CONCAT(' - ', IFNULL(sm.nombre,'--')), '')
            )
            SEPARATOR ' | '
          ) AS motivo

        FROM citas c
        LEFT JOIN clientes cl ON cl.id = c.cliente_id
        LEFT JOIN usuarios u ON u.id = c.asesor_id
        LEFT JOIN vehiculos v ON v.id = c.vehiculo_id
        LEFT JOIN marcas ma ON ma.id = v.marca_id
        LEFT JOIN modelos mo ON mo.id = v.modelo_id
        LEFT JOIN cita_motivos cm ON cm.cita_id = c.id
        LEFT JOIN motivos_citas mc ON mc.id = cm.motivo_id
        LEFT JOIN submotivos_citas sm ON sm.id = cm.submotivo_id

        WHERE c.centro_id = ?
        AND c.start_at BETWEEN ? AND ?

        GROUP BY
          c.id,
          c.cliente_id,
          c.centro_id,
          c.taller_id,
          c.vehiculo_id,
          c.start_at,
          c.end_at,
          c.estado,
          c.asesor_id,
          c.nota_cliente,
          c.nota_interna,
          cl.nombre,
          cl.apellido,
          cl.email,
          cl.celular,
          v.placas,
          v.vin,
          ma.name,
          mo.name,
          u.fullname,
          u.color
        ORDER BY c.start_at
      `;
    }

    const [rows] = await db.query(query, params);

    return NextResponse.json(rows || []);
  } catch (error) {
    console.error("❌ ERROR API CITAS:", error);
    return NextResponse.json({ message: "Error obteniendo citas" }, { status: 500 });
  }
}

export async function POST(req) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  try {
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
      created_by,
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
    if (!created_by) missing.push("created_by");
    if (!tipo_servicio) missing.push("tipo_servicio");

    if (missing.length > 0) {
      return NextResponse.json(
        { message: `Datos incompletos: ${missing.join(", ")}` },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      `
      INSERT INTO citas (
        centro_id,
        taller_id,
        cliente_id,
        vehiculo_id,
        asesor_id,
        origen_id,
        start_at,
        end_at,
        created_by,
        tipo_servicio,
        servicio_valet,
        fecha_promesa,
        hora_promesa,
        nota_cliente,
        nota_interna
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
        created_by,
        tipo_servicio,
        servicio_valet ? 1 : 0,
        fecha_promesa || null,
        hora_promesa || null,
        nota_cliente?.trim() || null,
        nota_interna?.trim() || null,
      ]
    );

    return NextResponse.json({
      message: "Cita creada correctamente",
      id: result.insertId,
    });
  } catch (error) {
    console.error("ERROR API /api/citas:", error);
    return NextResponse.json({ message: "Error creando cita" }, { status: 500 });
  }
}