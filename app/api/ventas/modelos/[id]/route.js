import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function GET(req, { params }) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const [rows] = await db.query(
    `SELECT id, nombre, tipo, motor, transmision, consumo, capacidad_personas,
            caracteristicas_seguridad, caracteristicas_tecnologia, is_active,
            created_at, updated_at
     FROM ventas_modelos WHERE id = ?`,
    [id]
  );

  if (!rows[0]) {
    return NextResponse.json({ message: "Modelo no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ modelo: rows[0] });
}

export async function PATCH(req, { params }) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const fields = [];
  const values = [];

  const allowed = [
    "nombre", "tipo", "motor", "transmision", "consumo",
    "capacidad_personas", "is_active",
  ];

  for (const key of allowed) {
    if (key in body) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }

  if ("caracteristicas_seguridad" in body) {
    fields.push("caracteristicas_seguridad = ?");
    values.push(JSON.stringify(body.caracteristicas_seguridad));
  }
  if ("caracteristicas_tecnologia" in body) {
    fields.push("caracteristicas_tecnologia = ?");
    values.push(JSON.stringify(body.caracteristicas_tecnologia));
  }

  if (fields.length === 0) {
    return NextResponse.json({ message: "Sin campos para actualizar" }, { status: 400 });
  }

  values.push(id);
  await db.query(`UPDATE ventas_modelos SET ${fields.join(", ")} WHERE id = ?`, values);

  return NextResponse.json({ message: "Modelo actualizado" });
}

export async function DELETE(req, { params }) {
  const auth = authorizeConversation(req, "delete");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await db.query("UPDATE ventas_modelos SET is_active = 0 WHERE id = ?", [id]);

  return NextResponse.json({ message: "Modelo desactivado" });
}
