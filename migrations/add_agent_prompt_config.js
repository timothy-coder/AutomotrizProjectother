const mysql = require("mysql2/promise");

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
    console.log("Creando tabla agent_prompt_config...");

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS agent_prompt_config (
        id INT AUTO_INCREMENT PRIMARY KEY,
        agent_key VARCHAR(50) NOT NULL UNIQUE,
        display_name VARCHAR(100) NOT NULL,
        consideraciones TEXT DEFAULT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        updated_by VARCHAR(100) DEFAULT NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log("Insertando agentes por defecto...");

    await conn.execute(`
      INSERT IGNORE INTO agent_prompt_config (agent_key, display_name)
      VALUES
        ('taller', 'Bot Taller Multi-Canal (WhatsApp/FB/IG)'),
        ('ventas', 'Ventas IA - WhatsApp Agent')
    `);

    console.log("Migracion completada exitosamente.");
  } finally {
    await conn.end();
  }
})();
