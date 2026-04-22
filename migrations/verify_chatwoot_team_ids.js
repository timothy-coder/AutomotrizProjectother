/**
 * verify_chatwoot_team_ids.js
 *
 * Verifica que los chatwoot_team_id en alert_routing y roles_chatwoot_mapping
 * coincidan con los equipos reales de la instancia de Chatwoot.
 * Si hay diferencias, aplica los IDs correctos automáticamente.
 *
 * Uso: node migrations/verify_chatwoot_team_ids.js
 */
require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });
const mysql = require("mysql2/promise");

const CHATWOOT_URL = process.env.CHATWOOT_URL;
const CHATWOOT_ACCOUNT_ID = process.env.CHATWOOT_ACCOUNT_ID;
const CHATWOOT_API_TOKEN = process.env.CHATWOOT_API_TOKEN;

// Mapeo esperado: nombre del equipo en Chatwoot → alert_types que le corresponden
const TEAM_ALERT_MAP = {
  ventas:      ["precio_exacto", "documentos_financiamiento", "test_drive", "pedido_especial", "duplicado_comprobante"],
  postventa:   ["cita_postventa", "garantia_recall", "queja"],
  mostrador:   ["mostrador_repuesto"],
  carroceria:  ["planchado_pintura"],
};

// Mapeo esperado: nombre del rol en CRM → nombre del equipo en Chatwoot
const ROLE_TEAM_MAP = {
  admin:     "ventas",
  operador:  "ventas",
  asesor:    "postventa",
  tecnico:   "postventa",
};

function normalize(str) {
  return String(str || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // quita tildes
    .trim();
}

(async () => {
  // 1. Obtener equipos reales de Chatwoot
  console.log("Consultando equipos en Chatwoot...");
  let chatwootTeams;
  try {
    const res = await fetch(
      `${CHATWOOT_URL}/api/v1/accounts/${CHATWOOT_ACCOUNT_ID}/teams`,
      { headers: { api_access_token: CHATWOOT_API_TOKEN } }
    );
    chatwootTeams = await res.json();
  } catch (err) {
    console.error("Error consultando Chatwoot:", err.message);
    process.exit(1);
  }

  console.log("\nEquipos encontrados en Chatwoot:");
  chatwootTeams.forEach((t) => console.log(`  ID=${t.id}  nombre="${t.name}"`));

  // Construir mapa normalizado: nombre_normalizado → id
  const teamIdByName = {};
  for (const t of chatwootTeams) {
    teamIdByName[normalize(t.name)] = t.id;
  }

  // 2. Conectar a la DB
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    // 3. Actualizar alert_routing
    console.log("\nActualizando alert_routing...");
    for (const [teamName, alertTypes] of Object.entries(TEAM_ALERT_MAP)) {
      const teamId = teamIdByName[normalize(teamName)];
      if (!teamId) {
        console.warn(`  SKIP: equipo "${teamName}" no encontrado en Chatwoot`);
        continue;
      }
      for (const alertType of alertTypes) {
        await conn.execute(
          "UPDATE alert_routing SET chatwoot_team_id = ? WHERE alert_type = ?",
          [teamId, alertType]
        );
        console.log(`  OK  ${alertType.padEnd(32)} → equipo "${teamName}" (ID=${teamId})`);
      }
    }

    // 4. Actualizar roles_chatwoot_mapping
    console.log("\nActualizando roles_chatwoot_mapping...");
    const [roles] = await conn.query("SELECT id, name FROM roles");
    for (const role of roles) {
      const roleNorm = normalize(role.name);
      const targetTeamName = ROLE_TEAM_MAP[roleNorm];
      if (!targetTeamName) {
        console.warn(`  SKIP: rol "${role.name}" no tiene mapeo definido`);
        continue;
      }
      const teamId = teamIdByName[normalize(targetTeamName)];
      if (!teamId) {
        console.warn(`  SKIP: equipo "${targetTeamName}" no encontrado en Chatwoot`);
        continue;
      }
      await conn.execute(
        "UPDATE roles_chatwoot_mapping SET chatwoot_team_id = ? WHERE role_id = ?",
        [teamId, role.id]
      );
      console.log(`  OK  rol "${role.name}" (ID=${role.id}) → equipo "${targetTeamName}" (ID=${teamId})`);
    }

    // 5. Mostrar estado final
    console.log("\n── Estado final ──────────────────────────────────────────");
    const [alertRows] = await conn.query(
      "SELECT alert_type, chatwoot_team_id, label FROM alert_routing ORDER BY chatwoot_team_id, alert_type"
    );
    console.log("alert_routing:");
    alertRows.forEach((r) =>
      console.log(`  team_id=${r.chatwoot_team_id}  ${r.alert_type} [${r.label}]`)
    );

    const [roleRows] = await conn.query(
      "SELECT rcm.role_id, r.name as role_name, rcm.chatwoot_team_id FROM roles_chatwoot_mapping rcm JOIN roles r ON r.id = rcm.role_id ORDER BY rcm.role_id"
    );
    console.log("roles_chatwoot_mapping:");
    roleRows.forEach((r) =>
      console.log(`  role "${r.role_name}" (ID=${r.role_id}) → team_id=${r.chatwoot_team_id}`)
    );

    console.log("\n✅ Verificación y actualización completada.\n");
  } finally {
    await conn.end();
  }
})();
