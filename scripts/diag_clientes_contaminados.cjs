require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });
const mysql = require("mysql2/promise");

/**
 * Diagnostico: clientes con celular contaminado por IG/FB sender_id.
 *
 * El bot de Ventas IA guarda lead.telefono = phone, pero en Instagram/Facebook
 * ese phone es el sender_id del canal (usualmente 15+ digitos), no un celular
 * real. Ese valor termina en clientes.celular y rompe la busqueda por telefono.
 *
 * Este script NO modifica nada. Solo reporta el tamano del dano.
 */
(async () => {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    const REGEX = "^[0-9]{15,}$";

    const [[r1]] = await conn.execute(
      `SELECT COUNT(*) AS n FROM clientes WHERE celular REGEXP ?`,
      [REGEX]
    );
    console.log("\n1) Clientes con celular sospechoso (>=15 digitos):", r1.n);

    const [[r2]] = await conn.execute(
      `SELECT COUNT(*) AS n FROM ventas_leads l
       JOIN clientes c ON c.id = l.cliente_id
       WHERE c.celular REGEXP ?`,
      [REGEX]
    );
    console.log("2) Leads de ventas apuntando a esos clientes:", r2.n);

    const [[r3]] = await conn.execute(
      `SELECT COUNT(*) AS n FROM oportunidades_oportunidades o
       JOIN clientes c ON c.id = o.cliente_id
       WHERE c.celular REGEXP ?`,
      [REGEX]
    );
    console.log("3) Oportunidades CRM apuntando a esos clientes:", r3.n);

    const [rows] = await conn.execute(
      `SELECT id, nombre, apellido, celular, email, created_at
       FROM clientes
       WHERE celular REGEXP ?
       ORDER BY created_at DESC
       LIMIT 10`,
      [REGEX]
    );

    console.log("\n4) Muestra (max 10 registros):");
    if (rows.length === 0) {
      console.log("   (ninguno — la DB esta limpia)");
    } else {
      console.table(rows.map((r) => ({
        id: r.id,
        nombre: r.nombre || "(null)",
        apellido: r.apellido || "(null)",
        celular: r.celular,
        email: r.email || "(null)",
        created_at: r.created_at,
      })));
    }

    // Tambien: leads sin nombre (el otro bug)
    const [[r5]] = await conn.execute(
      `SELECT COUNT(*) AS n FROM ventas_leads WHERE nombre_cliente IS NULL OR TRIM(nombre_cliente) = ''`
    );
    console.log("\n5) Leads guardados SIN nombre_cliente:", r5.n);

    console.log("\nListo. Pegame esta salida y armamos el fix.");
  } finally {
    await conn.end();
  }
})();
