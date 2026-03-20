const mysql = require("mysql2/promise");

async function columnExists(conn, tableName, columnName, databaseName) {
  const [rows] = await conn.execute(
    `
    SELECT 1
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = ?
      AND TABLE_NAME = ?
      AND COLUMN_NAME = ?
    LIMIT 1
    `,
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
    // ─── Catálogo: Modelos ───────────────────────────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ventas_modelos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        nombre VARCHAR(120) NOT NULL,
        tipo ENUM('sedan','suv','hatchback','pickup','van','otro') NOT NULL DEFAULT 'suv',
        motor VARCHAR(120) NULL,
        transmision ENUM('manual','automatica','cvt','otro') NULL,
        consumo VARCHAR(80) NULL,
        capacidad_personas TINYINT UNSIGNED NULL,
        caracteristicas_seguridad JSON NULL,
        caracteristicas_tecnologia JSON NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ventas_modelos_tipo_active (tipo, is_active)
      )
    `);
    console.log("ventas_modelos: tabla verificada");

    // ─── Catálogo: Versiones (equipamiento) ──────────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ventas_versiones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        modelo_id INT NOT NULL,
        nombre_version VARCHAR(100) NOT NULL,
        precio_lista DECIMAL(12,2) NOT NULL DEFAULT 0,
        moneda CHAR(3) NOT NULL DEFAULT 'PEN',
        descripcion_equipamiento TEXT NULL,
        descuento_porcentaje DECIMAL(5,2) NOT NULL DEFAULT 0,
        en_stock TINYINT(1) NOT NULL DEFAULT 1,
        tiempo_entrega_dias INT NOT NULL DEFAULT 0,
        colores_disponibles JSON NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ventas_versiones_modelo (modelo_id, is_active)
      )
    `);
    console.log("ventas_versiones: tabla verificada");

    // ─── Catálogo: Promociones vigentes ──────────────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ventas_promociones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        modelo_id INT NULL COMMENT 'NULL = aplica a todos los modelos',
        descripcion TEXT NOT NULL,
        tipo ENUM('descuento','financiamiento_preferencial','regalo','otro') NOT NULL DEFAULT 'descuento',
        valor VARCHAR(120) NULL COMMENT 'Ej: 5%, S/ 2000, Kit de accesorios',
        fecha_inicio DATE NULL,
        fecha_fin DATE NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_ventas_promociones_modelo_active (modelo_id, is_active),
        INDEX idx_ventas_promociones_fechas (fecha_inicio, fecha_fin)
      )
    `);
    console.log("ventas_promociones: tabla verificada");

    // ─── Configuración general del agente ────────────────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ventas_configuracion (
        id INT AUTO_INCREMENT PRIMARY KEY,
        seccion VARCHAR(60) NOT NULL,
        contenido JSON NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_ventas_configuracion_seccion (seccion)
      )
    `);
    console.log("ventas_configuracion: tabla verificada");

    // Insertar secciones por defecto si no existen
    const secciones = [
      {
        seccion: "financiamiento",
        contenido: JSON.stringify({
          entidades: ["Casa automotriz", "Banco Asociado"],
          tasa_interes_anual_min: 8,
          tasa_interes_anual_max: 15,
          plazo_max_meses: 60,
          cuota_inicial_min_porcentaje: 10,
          acepta_historial_limitado: false,
          notas: "",
        }),
      },
      {
        seccion: "documentacion_natural",
        contenido: JSON.stringify({
          documentos: ["DNI vigente", "Comprobante de ingresos (últimos 3 meses)", "Historial crediticio"],
          notas: "",
        }),
      },
      {
        seccion: "documentacion_juridico",
        contenido: JSON.stringify({
          documentos: ["RUC activo", "Estatuto de empresa", "Poder notarial del representante", "Estados financieros", "Comprobante de ingresos empresariales"],
          notas: "",
        }),
      },
      {
        seccion: "garantias",
        contenido: JSON.stringify({
          garantia_general_anios: 3,
          garantia_motor_anios: 5,
          cobertura: "Defectos de fábrica en motor, transmisión y sistema eléctrico",
          notas: "",
        }),
      },
      {
        seccion: "servicios_adicionales",
        contenido: JSON.stringify({
          items: [
            { nombre: "Mantenimiento preventivo (1 año)", precio: 0, incluido: true },
            { nombre: "Seguro vehicular básico (1 año)", precio: 0, incluido: false },
            { nombre: "Kit de accesorios", precio: 500, incluido: false },
          ],
          notas: "",
        }),
      },
    ];

    for (const { seccion, contenido } of secciones) {
      await conn.execute(
        `INSERT IGNORE INTO ventas_configuracion (seccion, contenido) VALUES (?, ?)`,
        [seccion, contenido]
      );
    }
    console.log("ventas_configuracion: secciones por defecto verificadas");

    // ─── Leads / Cotizaciones generadas por el agente ────────────────────────
    await conn.execute(`
      CREATE TABLE IF NOT EXISTS ventas_leads (
        id INT AUTO_INCREMENT PRIMARY KEY,
        lead_uuid CHAR(36) NOT NULL,
        session_id INT NULL,
        nombre_cliente VARCHAR(180) NULL,
        telefono VARCHAR(30) NOT NULL,
        email VARCHAR(180) NULL,
        modelo_id INT NULL,
        version_id INT NULL,
        modelo_nombre VARCHAR(120) NULL COMMENT 'Snapshot del nombre al momento de cotizar',
        version_nombre VARCHAR(100) NULL COMMENT 'Snapshot de la versión al momento de cotizar',
        precio_final DECIMAL(12,2) NULL,
        moneda CHAR(3) NOT NULL DEFAULT 'PEN',
        forma_pago ENUM('contado','financiamiento') NULL,
        plazo_meses INT NULL,
        cuota_inicial DECIMAL(12,2) NULL,
        tiempo_entrega_dias INT NULL,
        uso_vehiculo TEXT NULL,
        personas_habituales TINYINT UNSIGNED NULL,
        presupuesto_rango VARCHAR(100) NULL,
        equipamiento_requerido TEXT NULL,
        tiene_historial_crediticio TINYINT(1) NULL,
        estado ENUM('nuevo','contactado','negociando','cerrado','perdido') NOT NULL DEFAULT 'nuevo',
        notas_agente TEXT NULL,
        cotizacion_enviada_at DATETIME NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uq_ventas_leads_uuid (lead_uuid),
        INDEX idx_ventas_leads_estado (estado),
        INDEX idx_ventas_leads_telefono (telefono),
        INDEX idx_ventas_leads_session (session_id),
        INDEX idx_ventas_leads_modelo (modelo_id),
        INDEX idx_ventas_leads_created (created_at)
      )
    `);
    console.log("ventas_leads: tabla verificada");

    // ─── Columna source en conversation_sessions ──────────────────────────────
    const hasSource = await columnExists(conn, "conversation_sessions", "source", database);
    if (!hasSource) {
      await conn.execute(`
        ALTER TABLE conversation_sessions
        ADD COLUMN source ENUM('manual','campaign','ventas_ia') NOT NULL DEFAULT 'manual'
          AFTER id
      `);
      console.log("conversation_sessions.source: columna agregada");
    } else {
      console.log("conversation_sessions.source: ya existe");
    }

    console.log("Migración add_ventas_catalogo_and_leads completada");
  } finally {
    await conn.end();
  }
})();
