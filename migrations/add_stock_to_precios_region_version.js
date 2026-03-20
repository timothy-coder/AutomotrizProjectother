const mysql = require("mysql2/promise");

async function columnExists(conn, tableName, columnName, databaseName) {
  const [rows] = await conn.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? AND COLUMN_NAME = ? LIMIT 1`,
    [databaseName, tableName, columnName]
  );
  return rows.length > 0;
}

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
    console.log("Ejecutando migración: add_stock_to_precios_region_version");

    if (!(await columnExists(conn, "precios_region_version", "en_stock", database))) {
      await conn.execute(
        `ALTER TABLE precios_region_version
         ADD COLUMN en_stock TINYINT(1) NOT NULL DEFAULT 1
           COMMENT '1 = en stock, 0 = bajo pedido'`
      );
      console.log("✓ Columna en_stock agregada");
    } else {
      console.log("— en_stock ya existe, omitiendo");
    }

    if (!(await columnExists(conn, "precios_region_version", "tiempo_entrega_dias", database))) {
      await conn.execute(
        `ALTER TABLE precios_region_version
         ADD COLUMN tiempo_entrega_dias INT NOT NULL DEFAULT 0
           COMMENT 'Días hábiles estimados de entrega cuando no hay stock'`
      );
      console.log("✓ Columna tiempo_entrega_dias agregada");
    } else {
      console.log("— tiempo_entrega_dias ya existe, omitiendo");
    }

    console.log("Migración completada.");
  } finally {
    await conn.end();
  }
})();
