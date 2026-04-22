require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });
const mysql = require("mysql2/promise");

/**
 * Migración: agregar conversation_id a conversation_sessions
 *
 * Problema que resuelve:
 *   El mismo teléfono puede tener conversaciones simultáneas en distintos
 *   canales (WA + IG). Con la clave única solo en `phone`, ambas sesiones
 *   comparten estado → el agente "se confunde" (lee/escribe contexto cruzado).
 *
 * Cambios:
 *   1. Agrega columna `conversation_id BIGINT NOT NULL DEFAULT 0`
 *      (0 = legacy / WhatsApp sin ID explícito)
 *   2. Reemplaza el UNIQUE KEY `uq_phone` por `uq_phone_conv (phone, conversation_id)`
 *
 * Impacto en código:
 *   - route-dispatch.js: todas las helpers aceptan conversationId (default 0)
 *   - n8n MySQL Rate Limit Check: añadir AND conversation_id = {{$json.conversation_id || 0}}
 *   - n8n MySQL Save Session: incluir conversation_id en INSERT/UPDATE
 */

(async () => {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    // ── 1. Agregar columna conversation_id ────────────────────────────────────
    const [[convIdCol]] = await conn.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'conversation_sessions'
        AND COLUMN_NAME  = 'conversation_id'
    `);

    if (!convIdCol) {
      console.log("Agregando columna conversation_id...");
      await conn.execute(`
        ALTER TABLE conversation_sessions
          ADD COLUMN conversation_id BIGINT NOT NULL DEFAULT 0
          COMMENT 'Chatwoot conversation_id; 0 = legacy o canal sin ID'
      `);
      console.log("  OK conversation_id agregada");
    } else {
      console.log("  conversation_id ya existe, omitiendo.");
    }

    // ── 2. Reemplazar UNIQUE KEY uq_phone por uq_phone_conv ───────────────────
    const [[oldKey]] = await conn.execute(`
      SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'conversation_sessions'
        AND INDEX_NAME   = 'uq_phone'
        AND NON_UNIQUE   = 0
    `);

    const [[newKey]] = await conn.execute(`
      SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'conversation_sessions'
        AND INDEX_NAME   = 'uq_phone_conv'
        AND NON_UNIQUE   = 0
    `);

    if (!newKey) {
      if (oldKey) {
        console.log("Eliminando índice único uq_phone...");
        await conn.execute(`ALTER TABLE conversation_sessions DROP INDEX uq_phone`);
      }
      console.log("Creando índice único uq_phone_conv (phone, conversation_id)...");
      await conn.execute(`
        ALTER TABLE conversation_sessions
          ADD UNIQUE KEY uq_phone_conv (phone, conversation_id)
      `);
      console.log("  OK uq_phone_conv creado");
    } else {
      console.log("  uq_phone_conv ya existe, omitiendo.");
    }

    // ── 3. Índice de deduplicación en agent_actions_log ───────────────────────
    // Si la tabla existe, agrega UNIQUE INDEX en external_message_id para
    // deduplicación atómica (INSERT IGNORE no procesa el mismo mensaje dos veces).
    const [[actionsTable]] = await conn.execute(`
      SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_actions_log'
    `);

    if (actionsTable) {
      const [[dedupIdx]] = await conn.execute(`
        SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME   = 'agent_actions_log'
          AND INDEX_NAME   = 'uq_ext_msg_id'
          AND NON_UNIQUE   = 0
      `);
      if (!dedupIdx) {
        console.log("Creando índice único uq_ext_msg_id en agent_actions_log...");
        await conn.execute(`
          ALTER TABLE agent_actions_log
            ADD UNIQUE KEY uq_ext_msg_id (external_message_id)
        `);
        console.log("  OK uq_ext_msg_id creado");
      } else {
        console.log("  uq_ext_msg_id ya existe, omitiendo.");
      }
    } else {
      console.log("  agent_actions_log no existe, omitiendo índice de dedup.");
    }

    console.log("\nMigración completada exitosamente.");
  } finally {
    await conn.end();
  }
})();
