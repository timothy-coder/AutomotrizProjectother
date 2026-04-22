require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });
const mysql = require("mysql2/promise");

/**
 * Move 'existe' column from ventas_versiones to precios_region_version.
 *
 * Rationale: 'existe' is managed per-region (per cell in /carros matrix),
 * not globally per version. The AI agent reads price/stock/existe from
 * precios_region_version. ventas_versiones keeps only catalog details
 * (equipamiento, colores) and will eventually be deprecated or merged.
 *
 * Safe to run multiple times (idempotent checks).
 */
(async () => {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    // 1) Add 'existe' to precios_region_version (if missing)
    const [[prvExiste]] = await conn.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'precios_region_version'
        AND COLUMN_NAME  = 'existe'
    `);

    if (!prvExiste) {
      console.log("Agregando columna 'existe' a precios_region_version...");
      await conn.execute(`
        ALTER TABLE precios_region_version
          ADD COLUMN existe TINYINT(1) NOT NULL DEFAULT 1
          COMMENT '1 = la version existe en esta region (se ofrece); 0 = no se ofrece'
          AFTER en_stock
      `);
      console.log("  OK — columna 'existe' agregada a precios_region_version.");
    } else {
      console.log("precios_region_version.existe ya existe, omitiendo.");
    }

    // 2) Drop 'existe' from ventas_versiones (if present)
    const [[vvExiste]] = await conn.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'ventas_versiones'
        AND COLUMN_NAME  = 'existe'
    `);

    if (vvExiste) {
      console.log("Quitando columna 'existe' de ventas_versiones...");
      await conn.execute(`ALTER TABLE ventas_versiones DROP COLUMN existe`);
      console.log("  OK — columna 'existe' eliminada de ventas_versiones.");
    } else {
      console.log("ventas_versiones.existe no existe, omitiendo.");
    }

    console.log("Migración completada.");
  } finally {
    await conn.end();
  }
})();
