import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function GET(req, { params }) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const [rows] = await db.query(
    `SELECT l.*, vm.nombre AS modelo_nombre_actual, vv.nombre_version AS version_nombre_actual
     FROM ventas_leads l
     LEFT JOIN ventas_modelos vm ON vm.id = l.modelo_id
     LEFT JOIN ventas_versiones vv ON vv.id = l.version_id
     WHERE l.id = ? OR l.lead_uuid = ?`,
    [isNaN(Number(id)) ? 0 : Number(id), id]
  );

  if (!rows[0]) {
    return NextResponse.json({ message: "Lead no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ lead: rows[0] });
}

export async function PATCH(req, { params }) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const estadosValidos = ["nuevo", "contactado", "negociando", "cerrado", "perdido"];

  const fields = [];
  const values = [];

  if ("estado" in body) {
    if (!estadosValidos.includes(body.estado)) {
      return NextResponse.json({ message: "Estado inválido" }, { status: 400 });
    }
    fields.push("estado = ?");
    values.push(body.estado);
  }

  if ("notas_agente" in body) {
    fields.push("notas_agente = ?");
    values.push(body.notas_agente);
  }

  if (fields.length === 0) {
    return NextResponse.json({ message: "Sin campos para actualizar" }, { status: 400 });
  }

  values.push(isNaN(Number(id)) ? 0 : Number(id));
  values.push(id);

  await db.query(
    `UPDATE ventas_leads SET ${fields.join(", ")} WHERE id = ? OR lead_uuid = ?`,
    values
  );

  return NextResponse.json({ message: "Lead actualizado" });
}
