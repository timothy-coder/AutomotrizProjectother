import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function PUT(req, { params }) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id || Number.isNaN(Number(id))) {
    return NextResponse.json({ message: "id invalido" }, { status: 400 });
  }
  const body = await req.json().catch(() => ({}));

  const fields = [];
  const values = [];

  // Static map: each key maps to its own literal SQL fragment (no interpolation)
  const COLUMN_MAP = {
    nombre_version:         "nombre_version = ?",
    precio_lista:           "precio_lista = ?",
    moneda:                 "moneda = ?",
    descripcion_equipamiento: "descripcion_equipamiento = ?",
    descuento_porcentaje:   "descuento_porcentaje = ?",
    en_stock:               "en_stock = ?",
    tiempo_entrega_dias:    "tiempo_entrega_dias = ?",
    is_active:              "is_active = ?",
  };

  const STRING_FIELDS = new Set(["nombre_version", "moneda", "descripcion_equipamiento"]);

  for (const [key, fragment] of Object.entries(COLUMN_MAP)) {
    if (key in body) {
      fields.push(fragment);
      values.push(STRING_FIELDS.has(key) ? (String(body[key]).trim() || null) : body[key]);
    }
  }

  if ("colores_disponibles" in body) {
    fields.push("colores_disponibles = ?");
    values.push(JSON.stringify(body.colores_disponibles));
  }

  if (fields.length === 0) {
    return NextResponse.json({ message: "Sin campos para actualizar" }, { status: 400 });
  }

  try {
    values.push(id);
    await db.query(`UPDATE ventas_versiones SET ${fields.join(", ")} WHERE id = ?`, values);
    return NextResponse.json({ message: "Version actualizada" });
  } catch (err) {
    console.error("[ventas/versiones PUT] DB error:", err.message);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  const { id } = await params;
  if (!id || Number.isNaN(Number(id))) {
    return NextResponse.json({ message: "id invalido" }, { status: 400 });
  }

  try {
    const [[row]] = await db.query("SELECT id FROM ventas_versiones WHERE id = ?", [id]);
    if (!row) {
      return NextResponse.json({ message: "Version no encontrada" }, { status: 404 });
    }
    await db.query("UPDATE ventas_versiones SET is_active = 0 WHERE id = ?", [id]);
    return NextResponse.json({ message: "Version desactivada" });
  } catch (err) {
    console.error("[ventas/versiones DELETE] DB error:", err.message);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
