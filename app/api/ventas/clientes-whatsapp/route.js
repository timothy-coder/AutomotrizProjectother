import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * @webhook x-ventas-webhook-secret — consumido por el workflow "Bot Ventas IA" en n8n.
 * Usa un secret propio (VENTAS_WEBHOOK_SECRET) en vez de x-conversations-webhook-secret
 * porque es un dominio de negocio separado (ventas), no mensajes/conversaciones.
 */
function authenticate(req) {
  const secret = req.headers.get("x-ventas-webhook-secret") || "";
  const expected = process.env.VENTAS_WEBHOOK_SECRET || "";
  return expected && secret === expected;
}

// POST: Registrar o actualizar cliente desde el agente WhatsApp
// Llamado en cuanto se obtiene el teléfono + nombre (PASO 1)
// o cuando se consigue el email (PASO 2)
export async function POST(req) {
  if (!authenticate(req)) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const { telefono, nombre_cliente, email } = body;

  if (!telefono?.trim()) {
    return NextResponse.json({ message: "telefono requerido" }, { status: 400 });
  }

  const telefonoClean = telefono.trim();

  // En IG/FB el "phone" del canal es sender_id (15+ digitos), no un celular real.
  // No creamos clientes con identificadores basura: los clientes reales se crean
  // en /api/ventas/leads cuando el agente IA obtiene un celular validado del cliente.
  const CELULAR_RE = /^\+?\d{7,15}$/;
  if (!CELULAR_RE.test(telefonoClean)) {
    return NextResponse.json(
      { skipped: true, reason: "telefono no es un celular valido (se espera 7-15 digitos)" },
      { status: 200 }
    );
  }

  try {
    const [[existente]] = await db.query(
      "SELECT id, nombre, apellido, email FROM clientes WHERE celular = ? LIMIT 1",
      [telefonoClean]
    );

    if (existente) {
      const updates = [];
      const values = [];

      const nombreDb = [existente.nombre, existente.apellido].filter(Boolean).join(" ").trim();
      if (!nombreDb && nombre_cliente?.trim()) {
        const partes = nombre_cliente.trim().split(" ");
        updates.push("nombre = ?", "apellido = ?");
        values.push(partes[0] || null, partes.slice(1).join(" ") || null);
      }
      if (!existente.email && email?.trim()) {
        updates.push("email = ?");
        values.push(email.trim());
      }

      if (updates.length > 0) {
        values.push(existente.id);
        await db.query(`UPDATE clientes SET ${updates.join(", ")} WHERE id = ?`, values);
      }

      return NextResponse.json({ id: existente.id, cliente_nuevo: false, message: "Cliente actualizado" });
    }

    const partes = nombre_cliente?.trim()?.split(" ") || [];
    const nombre = partes[0] || null;
    const apellido = partes.slice(1).join(" ") || null;

    const [ins] = await db.query(
      `INSERT INTO clientes (nombre, apellido, email, celular, created_at)
       VALUES (?, ?, ?, ?, CURDATE())`,
      [nombre, apellido, email?.trim() || null, telefonoClean]
    );

    return NextResponse.json({ id: ins.insertId, cliente_nuevo: true, message: "Cliente registrado" }, { status: 201 });
  } catch (err) {
    console.error("Error en POST /api/ventas/clientes-whatsapp:", err.message);
    return NextResponse.json({ message: "Error interno" }, { status: 500 });
  }
}
