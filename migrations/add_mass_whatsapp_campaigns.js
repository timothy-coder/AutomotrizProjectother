const mysql = require("mysql2/promise");

async function indexExists(conn, tableName, indexName, databaseName) {
  const [rows] = await conn.execute(
    `
    SELECT 1
    FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
      AND INDEX_NAME = ?
    LIMIT 1
    `,
    [databaseName, tableName, indexName]
  );

  return rows.length > 0;
}

async function addIndexIfMissing(conn, tableName, indexName, indexSql, databaseName) {
  const exists = await indexExists(conn, tableName, indexName, databaseName);
  if (exists) {
    console.log(`${tableName}.${indexName}: ya existe`);
    return;
  }

  await conn.execute(`ALTER TABLE ${tableName} ADD ${indexSql}`);
  console.log(`${tableName}.${indexName}: agregado`);
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
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS whatsapp_mass_campaigns (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaign_uuid CHAR(36) NOT NULL,
        campaign_name VARCHAR(180) NOT NULL,
        campaign_type ENUM('ventas','postventa') NOT NULL,
        channel ENUM('whatsapp') NOT NULL DEFAULT 'whatsapp',
        send_type ENUM('personalizado') NOT NULL DEFAULT 'personalizado',
        status ENUM('draft','scheduled','running','completed','failed','cancelled') NOT NULL DEFAULT 'draft',
        send_now TINYINT(1) NOT NULL DEFAULT 0,
        scheduled_at DATETIME NULL,
        content_json JSON NOT NULL,
        filters_json JSON NULL,
        total_impacted INT NOT NULL DEFAULT 0,
        total_responded INT NOT NULL DEFAULT 0,
        created_by_user_id INT NULL,
        started_at DATETIME NULL,
        finished_at DATETIME NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE KEY uq_whatsapp_mass_campaigns_uuid (campaign_uuid),
        INDEX idx_whatsapp_mass_campaigns_status_scheduled (status, scheduled_at),
        INDEX idx_whatsapp_mass_campaigns_created_by (created_by_user_id)
      )
    `);
    console.log("whatsapp_mass_campaigns: tabla verificada");

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS campaign_recipients (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaign_id INT NOT NULL,
        client_id INT NOT NULL,
        session_id INT NULL,
        phone_normalized VARCHAR(50) NOT NULL,
        recipient_name VARCHAR(180) NULL,
        status ENUM('pending','queued','sent','delivered','read','responded','failed','skipped') NOT NULL DEFAULT 'pending',
        message_log_id INT NULL,
        outbox_id INT NULL,
        sent_at DATETIME NULL,
        delivered_at DATETIME NULL,
        read_at DATETIME NULL,
        responded_at DATETIME NULL,
        first_inbound_message_id INT NULL,
        last_error TEXT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE KEY uq_campaign_recipients_campaign_client (campaign_id, client_id),
        INDEX idx_campaign_recipients_campaign_status (campaign_id, status),
        INDEX idx_campaign_recipients_session (session_id),
        INDEX idx_campaign_recipients_phone (phone_normalized)
      )
    `);
    console.log("campaign_recipients: tabla verificada");

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS client_interest_vehicles (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NOT NULL,
        marca_id INT NULL,
        modelo_id INT NULL,
        anio_interes INT NULL,
        source ENUM('lead','oportunidad','manual') NOT NULL DEFAULT 'manual',
        active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        INDEX idx_interest_client_active (client_id, active),
        INDEX idx_interest_segment (marca_id, modelo_id, anio_interes)
      )
    `);
    console.log("client_interest_vehicles: tabla verificada");

    await addIndexIfMissing(
      conn,
      "conversations_outbox",
      "idx_conversations_outbox_source_channel",
      "INDEX idx_conversations_outbox_source_channel (source_channel)",
      database
    );

    console.log("Migración add_mass_whatsapp_campaigns completada");
  } finally {
    await conn.end();
  }
})();
