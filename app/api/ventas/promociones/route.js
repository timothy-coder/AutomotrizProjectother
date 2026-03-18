import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const soloActivas = searchParams.get("activas") !== "0";
  const modeloId = searchParams.get("modelo_id");

  const conditions = [];
  const params = [];

  if (soloActivas) conditions.push("p.is_active = 1");
  if (modeloId) {
    conditions.push("(p.modelo_id = ? OR p.modelo_id IS NULL)");
    params.push(Number(modeloId));
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await db.query(
    `SELECT p.id, p.modelo_id, m.nombre AS modelo_nombre,
            p.descripcion, p.tipo, p.valor,
            p.fecha_inicio, p.fecha_fin, p.is_active,
            p.created_at, p.updated_at
     FROM ventas_promociones p
     LEFT JOIN ventas_modelos m ON m.id = p.modelo_id
     ${where}
     ORDER BY p.fecha_fin ASC, p.id DESC`,
    params
  );

  return NextResponse.json({ promociones: rows });
}

export async function POST(req) {
  const auth = authorizeConversation(req, "create");
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const {
    modelo_id,
    descripcion,
    tipo = "descuento",
    valor,
    fecha_inicio,
    fecha_fin,
    is_active = true,
  } = body;

  if (!descripcion?.trim()) {
    return NextResponse.json({ message: "La descripción es requerida" }, { status: 400 });
  }

  const tiposValidos = ["descuento", "financiamiento_preferencial", "regalo", "otro"];
  if (!tiposValidos.includes(tipo)) {
    return NextResponse.json({ message: "Tipo de promoción inválido" }, { status: 400 });
  }

  const [result] = await db.query(
    `INSERT INTO ventas_promociones
       (modelo_id, descripcion, tipo, valor, fecha_inicio, fecha_fin, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      modelo_id ? Number(modelo_id) : null,
      descripcion.trim(),
      tipo,
      valor?.trim() || null,
      fecha_inicio || null,
      fecha_fin || null,
      is_active ? 1 : 0,
    ]
  );

  return NextResponse.json({ id: result.insertId, message: "Promoción creada" }, { status: 201 });
}

export async function PATCH(req) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { id, ...updates } = body;

  if (!id) {
    return NextResponse.json({ message: "id es requerido" }, { status: 400 });
  }

  const fields = [];
  const values = [];

  const allowed = ["descripcion", "tipo", "valor", "fecha_inicio", "fecha_fin", "is_active", "modelo_id"];
  for (const key of allowed) {
    if (key in updates) {
      fields.push(`${key} = ?`);
      values.push(updates[key]);
    }
  }

  if (fields.length === 0) {
    return NextResponse.json({ message: "Sin campos para actualizar" }, { status: 400 });
  }

  values.push(id);
  await db.query(`UPDATE ventas_promociones SET ${fields.join(", ")} WHERE id = ?`, values);

  return NextResponse.json({ message: "Promoción actualizada" });
}
