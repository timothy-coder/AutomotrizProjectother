const mysql = require("mysql2/promise");

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
      CREATE TABLE IF NOT EXISTS campaign_opt_outs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        client_id INT NULL,
        phone_normalized VARCHAR(50) NOT NULL,
        source VARCHAR(40) NOT NULL DEFAULT 'manual',
        reason VARCHAR(120) NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        stopped_at DATETIME NOT NULL,
        revoked_at DATETIME NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        UNIQUE KEY uq_campaign_opt_outs_phone (phone_normalized),
        INDEX idx_campaign_opt_outs_client_active (client_id, is_active),
        INDEX idx_campaign_opt_outs_active (is_active, revoked_at)
      )
    `);
    console.log("campaign_opt_outs: tabla verificada");

    await conn.execute(`
      CREATE TABLE IF NOT EXISTS campaign_recipient_actions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        campaign_id INT NULL,
        campaign_recipient_id INT NULL,
        session_id INT NULL,
        client_id INT NULL,
        phone_normalized VARCHAR(50) NULL,
        action_type ENUM('contact','stop_promotions','unknown') NOT NULL DEFAULT 'unknown',
        action_payload_json JSON NULL,
        external_event_id VARCHAR(160) NULL,
        created_at DATETIME NOT NULL,
        INDEX idx_campaign_actions_campaign (campaign_id, campaign_recipient_id),
        INDEX idx_campaign_actions_session (session_id),
        INDEX idx_campaign_actions_phone (phone_normalized),
        INDEX idx_campaign_actions_type_date (action_type, created_at)
      )
    `);
    console.log("campaign_recipient_actions: tabla verificada");

    console.log("Migración add_mass_campaign_optout_and_actions completada");
  } finally {
    await conn.end();
  }
})();
