import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

const SECCIONES_VALIDAS = [
  "financiamiento",
  "documentacion_natural",
  "documentacion_juridico",
  "garantias",
  "servicios_adicionales",
];

export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const seccion = searchParams.get("seccion");

  if (seccion) {
    if (!SECCIONES_VALIDAS.includes(seccion)) {
      return NextResponse.json({ message: "Sección inválida" }, { status: 400 });
    }

    const [rows] = await db.query(
      "SELECT seccion, contenido, updated_at FROM ventas_configuracion WHERE seccion = ?",
      [seccion]
    );

    return NextResponse.json({ configuracion: rows[0] || null });
  }

  const [rows] = await db.query(
    "SELECT seccion, contenido, updated_at FROM ventas_configuracion ORDER BY seccion ASC"
  );

  const configuracion = {};
  for (const row of rows) {
    configuracion[row.seccion] = row.contenido;
  }

  return NextResponse.json({ configuracion });
}

export async function PUT(req) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => ({}));
  const { seccion, contenido } = body;

  if (!seccion || !SECCIONES_VALIDAS.includes(seccion)) {
    return NextResponse.json({ message: "Sección inválida" }, { status: 400 });
  }

  if (!contenido || typeof contenido !== "object") {
    return NextResponse.json({ message: "contenido debe ser un objeto JSON" }, { status: 400 });
  }

  await db.query(
    `INSERT INTO ventas_configuracion (seccion, contenido)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE contenido = VALUES(contenido)`,
    [seccion, JSON.stringify(contenido)]
  );

  return NextResponse.json({ message: "Configuración guardada" });
}
