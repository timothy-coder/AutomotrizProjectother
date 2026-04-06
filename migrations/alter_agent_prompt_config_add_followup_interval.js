require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });
const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    const [[col]] = await conn.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'agent_prompt_config'
        AND COLUMN_NAME  = 'followup_interval_days'
    `);

    if (!col) {
      console.log("Agregando columna followup_interval_days...");
      await conn.execute(`
        ALTER TABLE agent_prompt_config
          ADD COLUMN followup_interval_days TINYINT UNSIGNED NOT NULL DEFAULT 3
          COMMENT 'Intervalo en días entre intentos del ciclo follow-up 3-3-3'
      `);
      console.log("Columna agregada.");
    } else {
      console.log("followup_interval_days ya existe, omitiendo.");
    }

    console.log("Migración completada exitosamente.");
  } finally {
    await conn.end();
  }
})();
