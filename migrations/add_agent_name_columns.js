const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    console.log("Agregando columnas de nombre a agent_prompt_config...");

    // Agregar columnas de identidad del agente
    // Verificar columnas existentes antes de agregar
    const [cols] = await conn.execute(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'agent_prompt_config'`,
      [process.env.DB_NAME]
    );
    const existingCols = cols.map(c => c.COLUMN_NAME);

    const toAdd = [
      { name: "agent_name",  sql: "agent_name  VARCHAR(100) DEFAULT NULL COMMENT 'Nombre del agente de IA (ej: Carlos, Diego)'" },
      { name: "taller_name", sql: "taller_name VARCHAR(150) DEFAULT NULL COMMENT 'Nombre del taller (ej: Taller Automotriz Central)'" },
      { name: "dealer_name", sql: "dealer_name VARCHAR(150) DEFAULT NULL COMMENT 'Nombre de la concesionaria para el agente de ventas'" },
    ];

    for (const col of toAdd) {
      if (existingCols.includes(col.name)) {
        console.log(`SKIP: columna '${col.name}' ya existe`);
        continue;
      }
      await conn.execute(`ALTER TABLE agent_prompt_config ADD COLUMN ${col.sql}`);
      console.log(`OK: columna '${col.name}' agregada`);
    }

    // Valores por defecto para registros existentes
    await conn.execute(`
      UPDATE agent_prompt_config
      SET agent_name  = 'Carlos',
          taller_name = 'el Taller Automotriz'
      WHERE agent_key = 'taller' AND agent_name IS NULL
    `);

    await conn.execute(`
      UPDATE agent_prompt_config
      SET agent_name  = 'Diego',
          dealer_name = 'nuestra concesionaria'
      WHERE agent_key = 'ventas' AND agent_name IS NULL
    `);

    console.log("Migración completada exitosamente.");
  } finally {
    await conn.end();
  }
})();
