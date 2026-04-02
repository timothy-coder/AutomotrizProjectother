const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    console.log("Creando tabla presales_demo_requests...");

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS presales_demo_requests (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(25) NOT NULL,
        contact_name VARCHAR(150) DEFAULT NULL,
        company_name VARCHAR(200) DEFAULT NULL,
        business_size ENUM('individual','small','medium','large') DEFAULT 'small',
        email VARCHAR(150) DEFAULT NULL,
        preferred_date DATE DEFAULT NULL,
        preferred_time TIME DEFAULT NULL,
        timezone VARCHAR(50) DEFAULT 'America/Lima',
        modules_interested TEXT DEFAULT NULL COMMENT 'JSON array de modulos ej ["ventas","taller"]',
        current_system VARCHAR(200) DEFAULT NULL COMMENT 'Sistema que usa actualmente',
        vehicle_count INT DEFAULT NULL COMMENT 'Cantidad aprox de vehiculos/inventario',
        notes TEXT DEFAULT NULL,
        lead_score INT DEFAULT 0 COMMENT 'Calificacion 0-100',
        status ENUM('pending','confirmed','completed','cancelled','no_show') DEFAULT 'pending',
        assigned_rep_phone VARCHAR(25) DEFAULT NULL,
        source_channel VARCHAR(50) DEFAULT 'whatsapp',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_phone (phone),
        INDEX idx_status (status),
        INDEX idx_preferred_date (preferred_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    console.log("Migración completada exitosamente.");
  } finally {
    await conn.end();
  }
})();
