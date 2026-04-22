require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });
const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASS, database: process.env.DB_NAME,
  });
  try {
    const [cols] = await conn.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'usuarios' AND COLUMN_NAME = 'chatwoot_agent_id'"
    );
    if (cols.length > 0) {
      console.log("Columna chatwoot_agent_id ya existe, nada que hacer.");
      return;
    }
    await conn.execute(
      "ALTER TABLE usuarios ADD COLUMN chatwoot_agent_id INT DEFAULT NULL COMMENT 'ID del agente en Chatwoot vinculado a este usuario'"
    );
    console.log("✅ Columna chatwoot_agent_id agregada a usuarios.");
  } finally {
    await conn.end();
  }
})();
