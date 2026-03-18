import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function PATCH(req, { params }) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  const body = await req.json().catch(() => ({}));

  const fields = [];
  const values = [];

  const allowed = [
    "nombre_version", "precio_lista", "moneda", "descripcion_equipamiento",
    "descuento_porcentaje", "en_stock", "tiempo_entrega_dias", "is_active",
  ];

  for (const key of allowed) {
    if (key in body) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }

  if ("colores_disponibles" in body) {
    fields.push("colores_disponibles = ?");
    values.push(JSON.stringify(body.colores_disponibles));
  }

  if (fields.length === 0) {
    return NextResponse.json({ message: "Sin campos para actualizar" }, { status: 400 });
  }

  values.push(id);
  await db.query(`UPDATE ventas_versiones SET ${fields.join(", ")} WHERE id = ?`, values);

  return NextResponse.json({ message: "Versión actualizada" });
}

export async function DELETE(req, { params }) {
  const auth = authorizeConversation(req, "delete");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  await db.query("UPDATE ventas_versiones SET is_active = 0 WHERE id = ?", [id]);

  return NextResponse.json({ message: "Versión desactivada" });
}
