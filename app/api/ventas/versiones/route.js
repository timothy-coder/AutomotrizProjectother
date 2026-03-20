import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const modeloId = searchParams.get("modelo_id");
  const soloActivos = searchParams.get("activos") !== "0";

  const conditions = [];
  const params = [];

  if (modeloId) {
    conditions.push("v.modelo_id = ?");
    params.push(Number(modeloId));
  }
  if (soloActivos) {
    conditions.push("v.is_active = 1");
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const [rows] = await db.query(
    `SELECT v.id, v.modelo_id,
            CONCAT(ma.name, ' ', m.name) AS modelo_nombre,
            v.nombre_version, v.precio_lista, v.moneda,
            v.descripcion_equipamiento, v.descuento_porcentaje,
            v.en_stock, v.tiempo_entrega_dias, v.colores_disponibles,
            v.is_active, v.created_at, v.updated_at
     FROM ventas_versiones v
     LEFT JOIN modelos m ON m.id = v.modelo_id
     LEFT JOIN marcas ma ON ma.id = m.marca_id
     ${where}
     ORDER BY ma.name ASC, m.name ASC, v.nombre_version ASC`,
    params
  );

  return NextResponse.json({ versiones: rows });
}

export async function POST(req) {
  const auth = authorizeConversation(req, "create");
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const {
    modelo_id,
    nombre_version,
    precio_lista = 0,
    moneda = "PEN",
    descripcion_equipamiento,
    descuento_porcentaje = 0,
    en_stock = true,
    tiempo_entrega_dias = 0,
    colores_disponibles = [],
  } = body;

  if (!modelo_id || !nombre_version?.trim()) {
    return NextResponse.json(
      { message: "modelo_id y nombre_version son requeridos" },
      { status: 400 }
    );
  }

  const [result] = await db.query(
    `INSERT INTO ventas_versiones
       (modelo_id, nombre_version, precio_lista, moneda, descripcion_equipamiento,
        descuento_porcentaje, en_stock, tiempo_entrega_dias, colores_disponibles)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      Number(modelo_id),
      nombre_version.trim(),
      Number(precio_lista),
      moneda.toUpperCase().slice(0, 3),
      descripcion_equipamiento?.trim() || null,
      Number(descuento_porcentaje),
      en_stock ? 1 : 0,
      Number(tiempo_entrega_dias),
      JSON.stringify(Array.isArray(colores_disponibles) ? colores_disponibles : []),
    ]
  );

  return NextResponse.json({ id: result.insertId, message: "Versión creada" }, { status: 201 });
}
