import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// Autentica via webhook secret (solo bots/n8n)
function authenticateRequest(req) {
  const webhookSecret = req.headers.get("x-ventas-webhook-secret") || "";
  const expectedSecret = process.env.VENTAS_WEBHOOK_SECRET || "";
  if (expectedSecret && webhookSecret === expectedSecret) {
    return true;
  }
  return false;
}

// ─── POST: Crear lead de post-venta desde bot (taller) ───────────────────────
// Body esperado:
//   telefono*       string  — teléfono del cliente
//   nombre_cliente  string  — nombre completo
//   email           string
//   canal           string  — "whatsapp" | "instagram" | "facebook"
//   session_id      number  — ID de sesión del bot
//   vehiculo_placa  string  — placa del vehículo (busca en DB)
//   vehiculo_id     number  — ID directo si se conoce
//   detalle         string  — resumen de la consulta
//   notas           string  — notas adicionales del bot
export async function POST(req) {
  if (!authenticateRequest(req)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const {
    telefono,
    nombre_cliente,
    email,
    canal = "whatsapp",
    session_id,
    vehiculo_placa,
    vehiculo_id: vehiculoIdDirecto,
    detalle,
    notas,
  } = body;

  if (!telefono?.trim()) {
    return NextResponse.json({ message: "El teléfono es requerido" }, { status: 400 });
  }

  const telefonoClean = telefono.trim();

  // ── Determinar bot user según canal ───────────────────────────────────────
  const botUsername = canal === "instagram" ? "instagram-bot" : "whatsapp-bot";
  const [[botUser]] = await db.query(
    `SELECT id FROM usuarios WHERE username = ? LIMIT 1`,
    [botUsername]
  );
  const botUserId = botUser?.id || 1; // fallback al admin

  // ── Buscar o crear cliente ─────────────────────────────────────────────────
  let clienteId = null;
  const [[clienteExistente]] = await db.query(
    "SELECT id, email FROM clientes WHERE celular = ? LIMIT 1",
    [telefonoClean]
  );

  if (clienteExistente) {
    clienteId = clienteExistente.id;
    if (!clienteExistente.email && email?.trim()) {
      await db.query("UPDATE clientes SET email = ? WHERE id = ?", [
        email.trim(),
        clienteId,
      ]);
    }
  } else if (nombre_cliente?.trim()) {
    const partes = nombre_cliente.trim().split(" ");
    const nombre = partes[0] || null;
    const apellido = partes.slice(1).join(" ") || null;
    const [ins] = await db.query(
      `INSERT INTO clientes (nombre, apellido, email, celular, created_at)
       VALUES (?, ?, ?, ?, CURDATE())`,
      [nombre, apellido, email?.trim() || null, telefonoClean]
    );
    clienteId = ins.insertId;
  }

  if (!clienteId) {
    return NextResponse.json(
      { message: "No se pudo identificar al cliente (nombre requerido para nuevos clientes)" },
      { status: 400 }
    );
  }

  // ── Buscar vehículo ────────────────────────────────────────────────────────
  let vehiculoId = vehiculoIdDirecto ? Number(vehiculoIdDirecto) : null;

  if (!vehiculoId && vehiculo_placa?.trim()) {
    const [[vehiculoRow]] = await db.query(
      `SELECT id FROM vehiculos WHERE placas = ? LIMIT 1`,
      [vehiculo_placa.trim().toUpperCase()]
    );
    vehiculoId = vehiculoRow?.id || null;
  }

  // Si no hay vehículo, buscar el primero del cliente
  if (!vehiculoId) {
    const [[primerVehiculo]] = await db.query(
      `SELECT id FROM vehiculos WHERE cliente_id = ? ORDER BY id ASC LIMIT 1`,
      [clienteId]
    );
    vehiculoId = primerVehiculo?.id || null;
  }

  if (!vehiculoId) {
    return NextResponse.json(
      { message: "No se encontró vehículo para el cliente. Registre el vehículo primero." },
      { status: 400 }
    );
  }

  // ── Obtener o crear origen "WhatsApp Bot" ─────────────────────────────────
  await db.query(
    `INSERT IGNORE INTO origenes_citas (name, is_active) VALUES ('WhatsApp Bot', 1)`
  );
  const [[origenBot]] = await db.query(
    `SELECT id FROM origenes_citas WHERE name = 'WhatsApp Bot' LIMIT 1`
  );

  if (!origenBot) {
    return NextResponse.json({ message: "Error obteniendo origen" }, { status: 500 });
  }

  // ── Generar siguiente código LD- para oportunidadespv ─────────────────────
  const [[maxRow]] = await db.query(
    `SELECT COALESCE(MAX(CAST(SUBSTRING(oportunidad_id, 4) AS UNSIGNED)), 0) AS max_num
     FROM oportunidadespv
     WHERE oportunidad_padre_id IS NULL AND oportunidad_id REGEXP '^LD-[0-9]+$'`
  );
  const nextNum = Number(maxRow?.max_num || 0) + 1;
  const oportunidadCodigo = `LD-${nextNum}`;

  const detalleTexto = [
    detalle?.trim() || "Consulta capturada por agente WhatsApp",
    notas?.trim() ? `Notas: ${notas.trim()}` : null,
    session_id ? `Sesión: ${session_id}` : null,
  ]
    .filter(Boolean)
    .join(" | ");

  const [result] = await db.query(
    `INSERT INTO oportunidadespv
       (oportunidad_id, cliente_id, vehiculo_id, origen_id,
        etapasconversionpv_id, detalle, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, 1, ?, ?, NOW(), NOW())`,
    [oportunidadCodigo, clienteId, vehiculoId, origenBot.id, detalleTexto, botUserId]
  );

  return NextResponse.json(
    {
      id: result.insertId,
      oportunidad_id: oportunidadCodigo,
      cliente_id: clienteId,
      vehiculo_id: vehiculoId,
      cliente_nuevo: !clienteExistente,
      message: "Lead post-venta registrado",
    },
    { status: 201 }
  );
}
