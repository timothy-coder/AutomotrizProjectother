require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });
const mysql = require("mysql2/promise");

/**
 * Link ventas_versiones to versiones (the base catalog table) via FK.
 *
 * Background: ventas_versiones (catalog details: equipamiento, colores)
 * currently has no structural link to 'versiones'. It only stores a free
 * text 'nombre_version'. precios_region_version points to versiones.id,
 * so joining price data with catalog details required fragile string
 * matching.
 *
 * This migration:
 *   1) Adds version_id (nullable FK-ish, no hard FK to avoid lock issues)
 *   2) Backfills by matching nombre_version -> versiones.nombre
 *   3) Reports orphan rows (no matching version) so they can be fixed by hand
 *
 * Idempotent and safe to re-run.
 */
(async () => {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    const [[col]] = await conn.execute(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME   = 'ventas_versiones'
        AND COLUMN_NAME  = 'version_id'
    `);

    if (!col) {
      console.log("Agregando columna version_id a ventas_versiones...");
      await conn.execute(`
        ALTER TABLE ventas_versiones
          ADD COLUMN version_id INT NULL
          COMMENT 'FK a versiones.id — unifica detalle de catalogo con precios por region'
          AFTER modelo_id,
          ADD INDEX idx_ventas_versiones_version (version_id)
      `);
      console.log("  OK — columna version_id agregada.");
    } else {
      console.log("ventas_versiones.version_id ya existe, omitiendo ALTER.");
    }

    console.log("Backfill por match de nombre (nombre_version -> versiones.nombre)...");
    const [result] = await conn.execute(`
      UPDATE ventas_versiones vv
        JOIN versiones v ON v.nombre = vv.nombre_version
        SET vv.version_id = v.id
      WHERE vv.version_id IS NULL
    `);
    console.log(`  OK — ${result.affectedRows} fila(s) enlazadas.`);

    const [orphans] = await conn.execute(`
      SELECT vv.id, vv.modelo_id, vv.nombre_version
      FROM ventas_versiones vv
      WHERE vv.version_id IS NULL
        AND vv.is_active = 1
    `);

    if (orphans.length > 0) {
      console.warn(`ATENCION: ${orphans.length} fila(s) activa(s) sin match en versiones:`);
      for (const r of orphans) {
        console.warn(`  - ventas_versiones.id=${r.id} modelo_id=${r.modelo_id} nombre="${r.nombre_version}"`);
      }
      console.warn("Estas filas NO aparecerán en /api/ventas/catalogo hasta que se arreglen.");
    } else {
      console.log("Sin huerfanos. Todo enlazado.");
    }

    console.log("Migracion completada.");
  } finally {
    await conn.end();
  }
})();
