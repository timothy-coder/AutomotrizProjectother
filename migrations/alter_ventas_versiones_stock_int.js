require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });
const mysql = require("mysql2/promise");

/**
 * Migración: cambia ventas_versiones.en_stock de TINYINT(1) booleano a INT
 * para almacenar cantidad real de unidades disponibles.
 *
 * Valores existentes: 0 (bajo pedido) se mantiene, 1 (disponible) se mantiene.
 * A partir de ahora se pueden poner valores reales (ej: 3 unidades).
 */
(async () => {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    // Verificar tipo actual
    const [[col]] = await conn.execute(`
      SELECT DATA_TYPE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'ventas_versiones'
        AND COLUMN_NAME  = 'en_stock'
    `);

    if (!col) {
      console.log("Columna en_stock no encontrada en ventas_versiones. Abortando.");
      return;
    }

    if (col.DATA_TYPE === "int") {
      console.log("en_stock ya es INT, omitiendo.");
      return;
    }

    console.log(`Tipo actual: ${col.COLUMN_TYPE} → cambiando a INT...`);
    await conn.execute(`
      ALTER TABLE ventas_versiones
        MODIFY COLUMN en_stock INT NOT NULL DEFAULT 0
        COMMENT 'Cantidad de unidades disponibles (0 = bajo pedido)'
    `);
    console.log("  OK — en_stock ahora es INT.");

    console.log("Migración completada.");
  } finally {
    await conn.end();
  }
})();
