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
    console.log("Creando tabla roles_chatwoot_mapping...");
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS roles_chatwoot_mapping (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        role_id           INT NOT NULL,
        chatwoot_team_id  INT DEFAULT NULL,
        chatwoot_agent_id INT DEFAULT NULL,
        updated_at        TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_role_id (role_id),
        CONSTRAINT fk_rcm_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log("Migración completada exitosamente.");
  } finally {
    await conn.end();
  }
})();
