require("dotenv").config({ path: require("path").resolve(__dirname, "../.env.local") });
const mysql = require("mysql2/promise");

const SPECS = [
  { nombre: "Potencia",              tipo_dato: "texto" },
  { nombre: "Torque",                tipo_dato: "texto" },
  { nombre: "Transmisión",           tipo_dato: "texto" },
  { nombre: "Combustible",           tipo_dato: "texto" },
  { nombre: "Consumo",               tipo_dato: "texto" },
  { nombre: "Capacidad pasajeros",   tipo_dato: "numero" },
  { nombre: "Tracción",              tipo_dato: "texto" },
  { nombre: "Airbags",               tipo_dato: "numero" },
  { nombre: "Seguridad",             tipo_dato: "texto" },
  { nombre: "Tecnología",            tipo_dato: "texto" },
  { nombre: "Dimensiones",           tipo_dato: "texto" },
  { nombre: "Capacidad carga",       tipo_dato: "texto" },
];

(async () => {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST,
    user:     process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
  });

  try {
    // La spec "motor" (id 1) ya existe, no la recreamos
    for (const spec of SPECS) {
      const [[existing]] = await conn.execute(
        "SELECT id FROM especificaciones WHERE nombre = ?",
        [spec.nombre]
      );
      if (existing) {
        console.log(`  "${spec.nombre}" ya existe (id ${existing.id}), omitiendo.`);
      } else {
        const [result] = await conn.execute(
          "INSERT INTO especificaciones (nombre, tipo_dato) VALUES (?, ?)",
          [spec.nombre, spec.tipo_dato]
        );
        console.log(`  "${spec.nombre}" creada (id ${result.insertId})`);
      }
    }

    console.log("\nMigración completada. Specs técnicas listas para asignar valores por modelo.");
  } finally {
    await conn.end();
  }
})();
