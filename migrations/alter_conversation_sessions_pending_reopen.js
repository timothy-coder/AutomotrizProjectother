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
    // pending_reopen: 1 = el cliente escribió fuera de horario, notificar al abrir
    const [[col]] = await conn.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'conversation_sessions'
        AND COLUMN_NAME  = 'pending_reopen'
    `);
    if (!col) {
      console.log("Agregando columna pending_reopen...");
      await conn.execute(`
        ALTER TABLE conversation_sessions
          ADD COLUMN pending_reopen TINYINT NOT NULL DEFAULT 0
          COMMENT '1 = cliente escribió fuera de horario, notificar al abrir'
      `);
      console.log("  OK pending_reopen agregada");
    } else {
      console.log("  pending_reopen ya existe, omitiendo.");
    }

    console.log("Migración completada exitosamente.");
  } finally {
    await conn.end();
  }
})();
