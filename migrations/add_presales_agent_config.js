const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    console.log("Insertando config del agente presales...");

    await conn.execute(`
      INSERT IGNORE INTO agent_prompt_config
        (agent_key, display_name, agent_name, dealer_name, consideraciones)
      VALUES
        ('presales', 'PreVenta IA - Asistente CRM Demo', 'Sofia', 'App20 Automotriz', NULL)
    `);

    console.log("Migración completada exitosamente.");
  } finally {
    await conn.end();
  }
})();
