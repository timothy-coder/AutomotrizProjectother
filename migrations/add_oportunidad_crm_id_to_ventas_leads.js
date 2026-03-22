const mysql = require("mysql2/promise");

async function columnExists(conn, table, column, database) {
  const [rows] = await conn.execute(
    `SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA=? AND TABLE_NAME=? AND COLUMN_NAME=? LIMIT 1`,
    [database, table, column]
  );
  return rows.length > 0;
}

(async () => {
  const { DB_HOST: host, DB_USER: user, DB_PASS: password, DB_NAME: database } = process.env;
  if (!host || !user || !database) throw new Error("Faltan variables DB_HOST, DB_USER o DB_NAME");

  const conn = await mysql.createConnection({ host, user, password, database });

  try {
    if (!(await columnExists(conn, "ventas_leads", "oportunidad_crm_id", database))) {
      await conn.execute(`
        ALTER TABLE ventas_leads
        ADD COLUMN oportunidad_crm_id INT NULL COMMENT 'ID en tabla oportunidades (LD-X)' AFTER cliente_id,
        ADD INDEX idx_ventas_leads_oportunidad (oportunidad_crm_id)
      `);
      console.log("ventas_leads.oportunidad_crm_id: columna agregada");
    } else {
      console.log("ventas_leads.oportunidad_crm_id: ya existe");
    }
    console.log("Migración completada.");
  } finally {
    await conn.end();
  }
})();
