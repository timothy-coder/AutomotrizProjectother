require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });
const mysql = require("mysql2/promise");

(async () => {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST, user: process.env.DB_USER,
    password: process.env.DB_PASS, database: process.env.DB_NAME,
  });

  try {
    // ── Alertas ────────────────────────────────────────────────
    const alerts = [
      { alert_type: "precio_exacto",            chatwoot_team_id: 1, label: "precio-exacto" },
      { alert_type: "documentos_financiamiento", chatwoot_team_id: 1, label: "financiamiento" },
      { alert_type: "test_drive",               chatwoot_team_id: 1, label: "test-drive" },
      { alert_type: "pedido_especial",           chatwoot_team_id: 1, label: "pedido-especial" },
      { alert_type: "duplicado_comprobante",     chatwoot_team_id: 1, label: "duplicado-comprobante" },
      { alert_type: "queja",                    chatwoot_team_id: 2, label: "queja" },
      { alert_type: "garantia_recall",          chatwoot_team_id: 2, label: "garantia-recall" },
      { alert_type: "cita_postventa",           chatwoot_team_id: 2, label: "cita-postventa" },
      { alert_type: "mostrador_repuesto",       chatwoot_team_id: 3, label: "mostrador" },
      { alert_type: "planchado_pintura",        chatwoot_team_id: 4, label: "planchado-pintura" },
    ];

    console.log("Configurando alert_routing...");
    for (const a of alerts) {
      await conn.execute(
        `INSERT INTO alert_routing (alert_type, chatwoot_team_id, label)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE chatwoot_team_id = VALUES(chatwoot_team_id), label = VALUES(label)`,
        [a.alert_type, a.chatwoot_team_id, a.label]
      );
      console.log(`  OK ${a.alert_type} -> equipo ${a.chatwoot_team_id} [${a.label}]`);
    }

    // ── Roles <-> Chatwoot ─────────────────────────────────────
    const roles = [
      { role_id: 1, chatwoot_team_id: 1 }, // Admin -> ventas
      { role_id: 2, chatwoot_team_id: 1 }, // Operador -> ventas
      { role_id: 3, chatwoot_team_id: 2 }, // ASESOR -> postventa
      { role_id: 4, chatwoot_team_id: 2 }, // TECNICO -> postventa
    ];

    console.log("\nConfigurando roles_chatwoot_mapping...");
    for (const r of roles) {
      await conn.execute(
        `INSERT INTO roles_chatwoot_mapping (role_id, chatwoot_team_id)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE chatwoot_team_id = VALUES(chatwoot_team_id)`,
        [r.role_id, r.chatwoot_team_id]
      );
      console.log(`  OK role_id ${r.role_id} -> equipo ${r.chatwoot_team_id}`);
    }

    console.log("\nConfiguracion completada exitosamente.");
  } finally {
    await conn.end();
  }
})();
