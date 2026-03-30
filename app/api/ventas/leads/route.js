import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

function authenticateRequest(req) {
  // Acepta tanto JWT de usuario del CRM como secret del webhook de n8n
  const webhookSecret = req.headers.get("x-ventas-webhook-secret") || "";
  const expectedSecret = process.env.VENTAS_WEBHOOK_SECRET || "";

  if (expectedSecret && webhookSecret === expectedSecret) {
    return { ok: true, source: "webhook" };
  }

  // Intentar autenticación JWT del CRM
  const auth = authorizeConversation(req, "edit");
  if (auth.ok) return { ok: true, source: "crm", user: auth.user };

  return { ok: false };
}

// ─── GET: Listar leads (para el CRM) ─────────────────────────────────────────
export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  const { searchParams } = new URL(req.url);
  const estado = searchParams.get("estado");
  const modeloId = searchParams.get("modelo_id");
  const desde = searchParams.get("desde");
  const hasta = searchParams.get("hasta");
  const page = Math.max(1, Number(searchParams.get("page") || 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") || 50)));
  const offset = (page - 1) * limit;

  const estadosValidos = ["nuevo", "contactado", "negociando", "cerrado", "perdido"];
  const estadoFiltro = estado && estadosValidos.includes(estado) ? estado : null;
  const modeloFiltro = modeloId ? Number(modeloId) : null;
  const desdeFiltro = desde || null;
  const hastaFiltro = hasta ? hasta + " 23:59:59" : null;

  try {
    const filterParams = [estadoFiltro, estadoFiltro, modeloFiltro, modeloFiltro, desdeFiltro, desdeFiltro, hastaFiltro, hastaFiltro];

    const [countRows] = await db.query(
      `SELECT COUNT(*) AS total FROM ventas_leads l
       WHERE (? IS NULL OR l.estado = ?)
         AND (? IS NULL OR l.modelo_id = ?)
         AND (? IS NULL OR l.created_at >= ?)
         AND (? IS NULL OR l.created_at <= ?)`,
      filterParams
    );
    const total = countRows[0]?.total ?? 0;

    const [leads] = await db.query(
      `SELECT l.id, l.lead_uuid, l.nombre_cliente, l.telefono, l.email,
              l.modelo_id, l.version_id, l.modelo_nombre, l.version_nombre,
              l.precio_final, l.moneda, l.forma_pago, l.plazo_meses,
              l.cuota_inicial, l.tiempo_entrega_dias,
              l.uso_vehiculo, l.personas_habituales, l.presupuesto_rango,
              l.equipamiento_requerido, l.tiene_historial_crediticio,
              l.estado, l.notas_agente, l.cotizacion_enviada_at,
              l.oportunidad_crm_id, l.created_at, l.updated_at
       FROM ventas_leads l
       WHERE (? IS NULL OR l.estado = ?)
         AND (? IS NULL OR l.modelo_id = ?)
         AND (? IS NULL OR l.created_at >= ?)
         AND (? IS NULL OR l.created_at <= ?)
       ORDER BY l.created_at DESC
       LIMIT ? OFFSET ?`,
      [...filterParams, limit, offset]
    );

    return NextResponse.json({
      leads,
      pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    console.error("ERROR GET /api/ventas/leads:", error);
    return NextResponse.json({ message: "Error obteniendo leads" }, { status: 500 });
  }
}

// ─── POST: Guardar cotización desde n8n AI ────────────────────────────────────
export async function POST(req) {
  const auth = authenticateRequest(req);
  if (!auth.ok) {
    return NextResponse.json({ message: "No autorizado" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));

  const {
    session_id,
    nombre_cliente,
    telefono,
    email,
    modelo_id,
    version_id,
    modelo_nombre,
    version_nombre,
    precio_final,
    moneda = "PEN",
    forma_pago,
    plazo_meses,
    cuota_inicial,
    tiempo_entrega_dias,
    uso_vehiculo,
    personas_habituales,
    presupuesto_rango,
    equipamiento_requerido,
    tiene_historial_crediticio,
    notas_agente,
  } = body;

  if (!telefono?.trim()) {
    return NextResponse.json({ message: "El teléfono es requerido" }, { status: 400 });
  }

  const formasPagoValidas = ["contado", "financiamiento"];
  if (forma_pago && !formasPagoValidas.includes(forma_pago)) {
    return NextResponse.json({ message: "forma_pago inválida" }, { status: 400 });
  }

  const leadUuid = randomUUID();
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  const telefonoClean = telefono.trim();

  // ── Buscar/crear cliente por teléfono ─────────────────────────────────────
  let clienteId = null;
  let clienteExistente = null;
  let nombreFinal = nombre_cliente?.trim() || null;

  try {
    const [[found]] = await db.query(
      "SELECT id, nombre, apellido, email FROM clientes WHERE celular = ? LIMIT 1",
      [telefonoClean]
    );
    clienteExistente = found || null;

    if (clienteExistente) {
      clienteId = clienteExistente.id;
      const nombreDb = [clienteExistente.nombre, clienteExistente.apellido]
        .filter(Boolean).join(" ").trim();
      if (nombreDb) nombreFinal = nombreDb;
      if (!clienteExistente.email && email?.trim()) {
        await db.query("UPDATE clientes SET email = ? WHERE id = ?", [email.trim(), clienteId]);
      }
    } else if (nombreFinal) {
      const partes = nombreFinal.split(" ");
      const nombre = partes[0] || null;
      const apellido = partes.slice(1).join(" ") || null;
      const [ins] = await db.query(
        `INSERT INTO clientes (nombre, apellido, email, celular, created_at)
         VALUES (?, ?, ?, ?, CURDATE())`,
        [nombre, apellido, email?.trim() || null, telefonoClean]
      );
      clienteId = ins.insertId;
    }
  } catch (error) {
    console.error("[ventas/leads] Error buscando/creando cliente:", error);
    return NextResponse.json({ message: "Error procesando datos del cliente" }, { status: 500 });
  }

  // ── Transacción: lead + oportunidad son atómicos ─────────────────────────
  let conn = null;
  let insertId = null;
  let oportunidadId = null;

  try {
    conn = await db.getConnection();
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO ventas_leads
         (lead_uuid, session_id, cliente_id, nombre_cliente, telefono, email,
          modelo_id, version_id, modelo_nombre, version_nombre,
          precio_final, moneda, forma_pago, plazo_meses, cuota_inicial,
          tiempo_entrega_dias, uso_vehiculo, personas_habituales,
          presupuesto_rango, equipamiento_requerido, tiene_historial_crediticio,
          notas_agente, cotizacion_enviada_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        leadUuid,
        session_id ? Number(session_id) : null,
        clienteId,
        nombreFinal,
        telefonoClean,
        email?.trim() || null,
        modelo_id ? Number(modelo_id) : null,
        version_id ? Number(version_id) : null,
        modelo_nombre?.trim() || null,
        version_nombre?.trim() || null,
        precio_final != null ? Number(precio_final) : null,
        moneda.toUpperCase().slice(0, 3),
        forma_pago || null,
        plazo_meses ? Number(plazo_meses) : null,
        cuota_inicial != null ? Number(cuota_inicial) : null,
        tiempo_entrega_dias != null ? Number(tiempo_entrega_dias) : null,
        uso_vehiculo?.trim() || null,
        personas_habituales ? Number(personas_habituales) : null,
        presupuesto_rango?.trim() || null,
        equipamiento_requerido?.trim() || null,
        tiene_historial_crediticio != null ? (tiene_historial_crediticio ? 1 : 0) : null,
        notas_agente?.trim() || null,
        now,
      ]
    );
    insertId = result.insertId;

    // ── Crear registro LD- en oportunidades automáticamente ────────────────
    if (clienteId && modelo_id) {
      const [[botUser]] = await conn.query(
        `SELECT id FROM usuarios WHERE username = 'whatsapp-bot' LIMIT 1`
      );
      const botUserId = botUser?.id || 1;

      await conn.query(
        `INSERT IGNORE INTO origenes_citas (name, is_active) VALUES ('WhatsApp Bot', 1)`
      );
      const [[origenBot]] = await conn.query(
        `SELECT id FROM origenes_citas WHERE name = 'WhatsApp Bot' LIMIT 1`
      );

      const [[modeloRow]] = await conn.query(
        `SELECT marca_id FROM modelos WHERE id = ? LIMIT 1`,
        [Number(modelo_id)]
      );
      const [[primeraEtapa]] = await conn.query(
        `SELECT id FROM etapasconversion ORDER BY sort_order ASC, id ASC LIMIT 1`
      );

      if (origenBot && primeraEtapa) {
        const [[maxRow]] = await conn.query(
          `SELECT COALESCE(MAX(CAST(SUBSTRING(oportunidad_id, 4) AS UNSIGNED)), 0) AS max_num
           FROM oportunidades
           WHERE oportunidad_padre_id IS NULL AND oportunidad_id REGEXP '^LD-[0-9]+$'`
        );
        const nextNum = Number(maxRow?.max_num || 0) + 1;
        const oportunidadCodigo = `LD-${nextNum}`;

        const detalleCrm = [
          modelo_nombre ? `Modelo: ${modelo_nombre}` : null,
          version_nombre ? `Versión: ${version_nombre}` : null,
          forma_pago ? `Pago: ${forma_pago}` : null,
          notas_agente ? `Notas: ${notas_agente}` : null,
        ]
          .filter(Boolean)
          .join(" | ") || "Lead capturado por agente WhatsApp";

        await conn.query(
          `INSERT INTO oportunidades
             (oportunidad_id, cliente_id, marca_id, modelo_id,
              origen_id, etapasconversion_id, detalle, created_by,
              created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())`,
          [
            oportunidadCodigo,
            clienteId,
            modeloRow?.marca_id || null,
            Number(modelo_id),
            origenBot.id,
            primeraEtapa.id,
            detalleCrm,
            botUserId,
          ]
        );
        oportunidadId = oportunidadCodigo;
      } else {
        console.error("[ventas/leads] No se encontró origen o etapa:", { origenBot, primeraEtapa });
      }
    }

    await conn.commit();
  } catch (e) {
    if (conn) await conn.rollback();
    console.error("[ventas/leads] Error en transacción, rollback ejecutado:", e.message);
    return NextResponse.json({ message: "Error al guardar el lead" }, { status: 500 });
  } finally {
    if (conn) conn.release();
  }

  return NextResponse.json(
    {
      id: insertId,
      lead_uuid: leadUuid,
      cliente_id: clienteId,
      cliente_nuevo: !clienteExistente && clienteId !== null,
      oportunidad_crm: oportunidadId,
      message: "Lead guardado",
    },
    { status: 201 }
  );
}
