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
    // 1. Agregar cliente_id a ventas_leads
    if (!(await columnExists(conn, "ventas_leads", "cliente_id", database))) {
      await conn.execute(`
        ALTER TABLE ventas_leads
        ADD COLUMN cliente_id INT NULL AFTER session_id,
        ADD INDEX idx_ventas_leads_cliente (cliente_id)
      `);
      console.log("ventas_leads.cliente_id: columna agregada");
    } else {
      console.log("ventas_leads.cliente_id: ya existe");
    }

    // 2. En ventas_versiones, modelo_id ahora referencia modelos.id (sistema)
    //    Solo agregar comentario en columna para documentar el cambio de semántica.
    //    La tabla está vacía así que no hay datos que migrar.
    await conn.execute(`
      ALTER TABLE ventas_versiones
      MODIFY COLUMN modelo_id INT NOT NULL COMMENT 'Referencia a modelos.id del sistema principal'
    `);
    console.log("ventas_versiones.modelo_id: comentario actualizado (ahora referencia modelos.id)");

    console.log("Migración completada.");
  } finally {
    await conn.end();
  }
})();
