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
    // 1. Agregar tone_preset si no existe
    const [[toneCol]] = await conn.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_prompt_config' AND COLUMN_NAME = 'tone_preset'
    `);
    if (!toneCol) {
      console.log("Agregando columna tone_preset...");
      await conn.execute(`ALTER TABLE agent_prompt_config ADD COLUMN tone_preset VARCHAR(50) DEFAULT 'neutro'`);
    } else {
      console.log("tone_preset ya existe, omitiendo.");
    }

    // 2. Agregar sinonimos_json si no existe
    const [[sinonimosCol]] = await conn.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'agent_prompt_config' AND COLUMN_NAME = 'sinonimos_json'
    `);
    if (!sinonimosCol) {
      console.log("Agregando columna sinonimos_json...");
      await conn.execute(`ALTER TABLE agent_prompt_config ADD COLUMN sinonimos_json TEXT DEFAULT NULL`);
    } else {
      console.log("sinonimos_json ya existe, omitiendo.");
    }

    // 3. Actualizar nombre del agente a Wankita y concesionaria a WankaMotors
    console.log("Actualizando agent_name y dealer_name para taller y ventas...");
    const [result] = await conn.execute(`
      UPDATE agent_prompt_config
        SET agent_name  = 'Wankita',
            dealer_name = 'WankaMotors'
        WHERE agent_key IN ('taller', 'ventas')
    `);
    console.log(`Filas actualizadas: ${result.affectedRows}`);

    console.log("Migración completada exitosamente.");
  } finally {
    await conn.end();
  }
})();
