import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

/**
 * POST /api/ventas/leads/[id]/promover
 *
 * Crea un registro LD- en la tabla oportunidades a partir de un ventas_lead.
 * Si el lead ya fue promovido (oportunidad_crm_id != null), devuelve el ID existente.
 */
export async function POST(req, { params }) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const numId = isNaN(Number(id)) ? 0 : Number(id);

  // Obtener el lead
  const [[lead]] = await db.query(
    `SELECT id, nombre_cliente, telefono, email, modelo_id, version_id,
            modelo_nombre, version_nombre, forma_pago, notas_agente,
            cliente_id, oportunidad_crm_id
     FROM ventas_leads WHERE id = ? OR lead_uuid = ?`,
    [numId, id]
  );

  if (!lead) {
    return NextResponse.json({ message: "Lead no encontrado" }, { status: 404 });
  }

  // Si ya fue promovido, retornar el existente
  if (lead.oportunidad_crm_id) {
    const [[op]] = await db.query(
      `SELECT id, oportunidad_id FROM oportunidades WHERE id = ? LIMIT 1`,
      [lead.oportunidad_crm_id]
    );
    return NextResponse.json({
      already_promoted: true,
      oportunidad_id: op?.oportunidad_id || null,
      oportunidad_db_id: lead.oportunidad_crm_id,
    });
  }

  // Asegurar que hay cliente_id
  let clienteId = lead.cliente_id;
  if (!clienteId && lead.telefono) {
    const [[c]] = await db.query(
      `SELECT id FROM clientes WHERE celular = ? LIMIT 1`,
      [lead.telefono]
    );
    clienteId = c?.id || null;
  }

  if (!clienteId) {
    return NextResponse.json(
      { message: "No se encontró cliente asociado al lead. Regístralo primero en el sistema." },
      { status: 422 }
    );
  }

  if (!lead.modelo_id) {
    return NextResponse.json(
      { message: "El lead no tiene modelo especificado." },
      { status: 422 }
    );
  }

  // Obtener marca del modelo
  const [[modeloRow]] = await db.query(
    `SELECT marca_id FROM modelos WHERE id = ? LIMIT 1`,
    [Number(lead.modelo_id)]
  );

  if (!modeloRow?.marca_id) {
    return NextResponse.json(
      { message: "No se pudo determinar la marca del modelo cotizado." },
      { status: 422 }
    );
  }

  // Obtener o crear origen "WhatsApp Bot"
  await db.query(
    `INSERT IGNORE INTO origenes_citas (name, is_active) VALUES ('WhatsApp Bot', 1)`
  );
  const [[origenBot]] = await db.query(
    `SELECT id FROM origenes_citas WHERE name = 'WhatsApp Bot' LIMIT 1`
  );

  // Primera etapa de conversión
  const [[primeraEtapa]] = await db.query(
    `SELECT id FROM etapasconversion ORDER BY sort_order ASC, id ASC LIMIT 1`
  );

  if (!origenBot || !primeraEtapa) {
    return NextResponse.json(
      { message: "No se encontraron origenes o etapas de conversión configuradas." },
      { status: 500 }
    );
  }

  // Usuario que promueve el lead (el asesor del CRM)
  const createdBy = auth.user?.id || 1;

  // Generar código LD-
  const [[maxRow]] = await db.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(oportunidad_id, 4) AS UNSIGNED)), 0) AS max_num
     FROM oportunidades
     WHERE oportunidad_padre_id IS NULL AND oportunidad_id REGEXP '^LD-[0-9]+$'`
  );
  const nextNum = Number(maxRow?.max_num || 0) + 1;
  const oportunidadCodigo = `LD-${nextNum}`;

  const detalle = [
    lead.modelo_nombre ? `Modelo: ${lead.modelo_nombre}` : null,
    lead.version_nombre ? `Versión: ${lead.version_nombre}` : null,
    lead.forma_pago ? `Pago: ${lead.forma_pago}` : null,
    lead.notas_agente ? `Notas: ${lead.notas_agente}` : null,
  ]
    .filter(Boolean)
    .join(" | ") || "Lead promovido desde Ventas IA";

  const [ins] = await db.query(
    `INSERT INTO oportunidades
       (oportunidad_id, cliente_id, marca_id, modelo_id,
        origen_id, etapasconversion_id, detalle, created_by,
        fecha_agenda, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), NOW(), NOW())`,
    [
      oportunidadCodigo,
      clienteId,
      modeloRow.marca_id,
      Number(lead.modelo_id),
      origenBot.id,
      primeraEtapa.id,
      detalle,
      createdBy,
    ]
  );

  // Guardar referencia en ventas_leads
  await db.query(
    `UPDATE ventas_leads SET oportunidad_crm_id = ?, cliente_id = ? WHERE id = ?`,
    [ins.insertId, clienteId, lead.id]
  );

  return NextResponse.json({
    ok: true,
    oportunidad_id: oportunidadCodigo,
    oportunidad_db_id: ins.insertId,
  });
}
