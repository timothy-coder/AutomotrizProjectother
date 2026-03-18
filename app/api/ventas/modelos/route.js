import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const soloActivos = searchParams.get("activos") !== "0";

  const where = soloActivos ? "WHERE is_active = 1" : "";

  const [rows] = await db.query(
    `SELECT id, nombre, tipo, motor, transmision, consumo, capacidad_personas,
            caracteristicas_seguridad, caracteristicas_tecnologia, is_active,
            created_at, updated_at
     FROM ventas_modelos
     ${where}
     ORDER BY nombre ASC`
  );

  return NextResponse.json({ modelos: rows });
}

export async function POST(req) {
  const auth = authorizeConversation(req, "create");
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const {
    nombre,
    tipo = "suv",
    motor,
    transmision,
    consumo,
    capacidad_personas,
    caracteristicas_seguridad = [],
    caracteristicas_tecnologia = [],
  } = body;

  if (!nombre?.trim()) {
    return NextResponse.json({ message: "El nombre es requerido" }, { status: 400 });
  }

  const tiposValidos = ["sedan", "suv", "hatchback", "pickup", "van", "otro"];
  if (!tiposValidos.includes(tipo)) {
    return NextResponse.json({ message: "Tipo de vehículo inválido" }, { status: 400 });
  }

  const [result] = await db.query(
    `INSERT INTO ventas_modelos
       (nombre, tipo, motor, transmision, consumo, capacidad_personas,
        caracteristicas_seguridad, caracteristicas_tecnologia)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      nombre.trim(),
      tipo,
      motor?.trim() || null,
      transmision || null,
      consumo?.trim() || null,
      capacidad_personas ? Number(capacidad_personas) : null,
      JSON.stringify(Array.isArray(caracteristicas_seguridad) ? caracteristicas_seguridad : []),
      JSON.stringify(Array.isArray(caracteristicas_tecnologia) ? caracteristicas_tecnologia : []),
    ]
  );

  return NextResponse.json({ id: result.insertId, message: "Modelo creado" }, { status: 201 });
}
