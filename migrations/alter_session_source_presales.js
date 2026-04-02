const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    console.log("Ampliando enum source en conversation_sessions...");

    await conn.execute(`
      ALTER TABLE conversation_sessions
      MODIFY COLUMN source ENUM('manual','campaign','ventas_ia','presales_ia') NOT NULL DEFAULT 'manual'
    `);

    console.log("Migración completada exitosamente.");
  } finally {
    await conn.end();
  }
})();
