require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });
const mysql = require("mysql2/promise");

/**
 * Revert en_stock to boolean (TINYINT(1)) and add 'existe' column.
 *
 * Semantics:
 *   - en_stock = 1: disponible en stock
 *   - en_stock = 0: disponible bajo pedido (se puede mandar a traer)
 *   - existe  = 1: la versión existe en el catálogo y puede mostrarse al agente IA
 *   - existe  = 0: no existe (no se puede ofrecer, ni siquiera bajo pedido)
 */
(async () => {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    const [[stockCol]] = await conn.execute(`
      SELECT DATA_TYPE, COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'ventas_versiones'
        AND COLUMN_NAME  = 'en_stock'
    `);

    if (!stockCol) {
      console.log("Columna en_stock no encontrada. Abortando.");
      return;
    }

    if (stockCol.COLUMN_TYPE !== "tinyint(1)") {
      console.log(`Revirtiendo en_stock: ${stockCol.COLUMN_TYPE} → TINYINT(1)...`);
      // Clamp a 0/1 antes de cambiar el tipo (valores >1 pasan a 1)
      await conn.execute(`UPDATE ventas_versiones SET en_stock = 1 WHERE en_stock > 1`);
      await conn.execute(`
        ALTER TABLE ventas_versiones
          MODIFY COLUMN en_stock TINYINT(1) NOT NULL DEFAULT 0
          COMMENT '1 = disponible en stock, 0 = disponible bajo pedido'
      `);
      console.log("  OK — en_stock es TINYINT(1).");
    } else {
      console.log("en_stock ya es TINYINT(1), omitiendo.");
    }

    const [[existeCol]] = await conn.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'ventas_versiones'
        AND COLUMN_NAME  = 'existe'
    `);

    if (!existeCol) {
      console.log("Agregando columna 'existe'...");
      await conn.execute(`
        ALTER TABLE ventas_versiones
          ADD COLUMN existe TINYINT(1) NOT NULL DEFAULT 1
          COMMENT '1 = la versión existe y se ofrece al cliente (incluso bajo pedido); 0 = no se ofrece'
          AFTER en_stock
      `);
      console.log("  OK — columna 'existe' creada.");
    } else {
      console.log("Columna 'existe' ya existe, omitiendo.");
    }

    console.log("Migración completada.");
  } finally {
    await conn.end();
  }
})();
