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
    // 1. followup_count
    const [[fc]] = await conn.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversation_sessions' AND COLUMN_NAME = 'followup_count'
    `);
    if (!fc) {
      console.log("Agregando columna followup_count...");
      await conn.execute(`ALTER TABLE conversation_sessions ADD COLUMN followup_count INT DEFAULT 0`);
    } else {
      console.log("followup_count ya existe, omitiendo.");
    }

    // 2. followup_next_at
    const [[fna]] = await conn.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversation_sessions' AND COLUMN_NAME = 'followup_next_at'
    `);
    if (!fna) {
      console.log("Agregando columna followup_next_at...");
      await conn.execute(`ALTER TABLE conversation_sessions ADD COLUMN followup_next_at DATETIME DEFAULT NULL`);
    } else {
      console.log("followup_next_at ya existe, omitiendo.");
    }

    // 3. closure_reason
    const [[cr]] = await conn.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'conversation_sessions' AND COLUMN_NAME = 'closure_reason'
    `);
    if (!cr) {
      console.log("Agregando columna closure_reason...");
      await conn.execute(`ALTER TABLE conversation_sessions ADD COLUMN closure_reason VARCHAR(50) DEFAULT NULL`);
    } else {
      console.log("closure_reason ya existe, omitiendo.");
    }

    console.log("Migración completada exitosamente.");
  } finally {
    await conn.end();
  }
})();
