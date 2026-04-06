const mysql = require("mysql2/promise");

/**
 * Amplía external_message_id y idempotency_key en agent_actions_log.
 *
 * Problema: Los IDs de mensajes de Instagram (base64 encoded) tienen ~164 chars.
 * - external_message_id era VARCHAR(150) → ER_DATA_TOO_LONG
 * - idempotency_key era VARCHAR(120) con UNIQUE INDEX → "inbound:" + 164 chars = 172 → también falla
 *
 * Fix: ambas columnas a VARCHAR(255). El UNIQUE INDEX se recrea automáticamente.
 */
(async () => {
  const host = process.env.DB_HOST;
  const user = process.env.DB_USER;
  const password = process.env.DB_PASS;
  const database = process.env.DB_NAME;

  if (!host || !user || !database) {
    throw new Error("Faltan variables DB_HOST, DB_USER o DB_NAME en el entorno");
  }

  const conn = await mysql.createConnection({ host, user, password, database });

  try {
    const [cols] = await conn.execute(
      `SELECT COLUMN_NAME, COLUMN_TYPE
       FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ?
         AND TABLE_NAME = 'agent_actions_log'
         AND COLUMN_NAME IN ('external_message_id', 'idempotency_key')`,
      [database]
    );

    if (!cols.length) {
      console.log("agent_actions_log: columnas no encontradas, saltando");
      return;
    }

    const colMap = Object.fromEntries(cols.map((c) => [c.COLUMN_NAME, c.COLUMN_TYPE.toLowerCase()]));

    // Fix external_message_id
    if (colMap.external_message_id && !colMap.external_message_id.includes("varchar(255)") && !colMap.external_message_id.includes("text")) {
      await conn.execute(`ALTER TABLE agent_actions_log MODIFY COLUMN external_message_id VARCHAR(255) NULL`);
      console.log(`external_message_id: ampliado de ${colMap.external_message_id} a VARCHAR(255)`);
    } else {
      console.log(`external_message_id: ya es ${colMap.external_message_id || "no existe"}, nada que hacer`);
    }

    // Fix idempotency_key — drop UNIQUE INDEX primero, luego ampliar, luego recrear
    if (colMap.idempotency_key && !colMap.idempotency_key.includes("varchar(255)") && !colMap.idempotency_key.includes("text")) {
      // Verificar si el índice existe antes de intentar dropearlo
      const [idxRows] = await conn.execute(
        `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
         WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'agent_actions_log'
           AND INDEX_NAME = 'idx_agent_actions_idempotency_key'
         LIMIT 1`,
        [database]
      );

      if (idxRows.length) {
        await conn.execute(`ALTER TABLE agent_actions_log DROP INDEX idx_agent_actions_idempotency_key`);
        console.log("idx_agent_actions_idempotency_key: índice eliminado");
      }

      await conn.execute(`ALTER TABLE agent_actions_log MODIFY COLUMN idempotency_key VARCHAR(255) NULL`);
      console.log(`idempotency_key: ampliado de ${colMap.idempotency_key} a VARCHAR(255)`);

      // Recrear el índice único con prefix para evitar row size issues en índices largos
      await conn.execute(
        `ALTER TABLE agent_actions_log ADD UNIQUE INDEX idx_agent_actions_idempotency_key (idempotency_key(191))`
      );
      console.log("idx_agent_actions_idempotency_key: índice único recreado con prefix(191)");
    } else {
      console.log(`idempotency_key: ya es ${colMap.idempotency_key || "no existe"}, nada que hacer`);
    }
  } finally {
    await conn.end();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
