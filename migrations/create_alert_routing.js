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
    // 1. Crear tabla alert_routing si no existe
    console.log("Creando tabla alert_routing...");
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS alert_routing (
        id                INT AUTO_INCREMENT PRIMARY KEY,
        alert_type        VARCHAR(50)  NOT NULL UNIQUE,
        chatwoot_team_id  INT          DEFAULT NULL,
        chatwoot_agent_id INT          DEFAULT NULL,
        label             VARCHAR(100) DEFAULT NULL,
        descripcion       VARCHAR(200) DEFAULT NULL,
        created_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
        updated_at        TIMESTAMP    DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);
    console.log("Tabla alert_routing lista.");

    // 2. Insertar tipos de alerta (sin sobrescribir si ya existen)
    const alertas = [
      ["planchado_pintura",          null, null, "carroceria",       "Planchado y pintura / Carrocería"],
      ["garantia_recall",            null, null, "garantia",         "Garantía / Recalls"],
      ["mostrador_repuesto",         null, null, "repuesto",         "Mostrador / Repuestos"],
      ["precio_exacto",              null, null, "precio-negociado", "Cliente insiste en precio exacto"],
      ["documentos_financiamiento",  null, null, "financiamiento",   "Cliente envía documentos de financiamiento"],
      ["test_drive",                 null, null, "test-drive",       "Visita / Test drive"],
      ["pedido_especial",            null, null, "pedido-especial",  "Pedido especial (sin stock)"],
      ["queja",                      null, null, "queja",            "Queja o reclamo del cliente"],
      ["duplicado_comprobante",      null, null, "comprobante",      "Solicitud de duplicado de comprobante"],
      ["cita_postventa",             null, null, "cita",             "Cita de postventa agendada"],
    ];

    let insertados = 0;
    for (const [alert_type, team_id, agent_id, label, descripcion] of alertas) {
      const [res] = await conn.execute(
        `INSERT IGNORE INTO alert_routing (alert_type, chatwoot_team_id, chatwoot_agent_id, label, descripcion)
         VALUES (?, ?, ?, ?, ?)`,
        [alert_type, team_id, agent_id, label, descripcion]
      );
      if (res.affectedRows > 0) insertados++;
    }
    console.log(`Tipos de alerta insertados: ${insertados} (ya existentes: ${alertas.length - insertados})`);

    console.log("Migración completada exitosamente.");
  } finally {
    await conn.end();
  }
})();
