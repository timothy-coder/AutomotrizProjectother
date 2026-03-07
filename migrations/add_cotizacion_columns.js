const mysql = require('mysql2/promise');

(async () => {
  const conn = await mysql.createConnection({
    host: '193.203.175.251',
    user: 'u330129056_root',
    password: 'C!nBNAqJR0c',
    database: 'u330129056_picaje'
  });

  // Add centro/taller/mostrador + descuento to cotizaciones
  await conn.execute(`
    ALTER TABLE cotizaciones
      ADD COLUMN centro_id INT NULL AFTER usuario_id,
      ADD COLUMN taller_id INT NULL AFTER centro_id,
      ADD COLUMN mostrador_id INT NULL AFTER taller_id,
      ADD COLUMN descuento_porcentaje DECIMAL(5,2) DEFAULT 0 AFTER subtotal_extras,
      ADD COLUMN descuento_monto DECIMAL(10,2) DEFAULT 0 AFTER descuento_porcentaje
  `);
  console.log('cotizaciones: columnas agregadas');

  // Add descuento to cotizacion_productos
  await conn.execute(`
    ALTER TABLE cotizacion_productos
      ADD COLUMN descuento_porcentaje DECIMAL(5,2) DEFAULT 0 AFTER subtotal
  `);
  console.log('cotizacion_productos: descuento agregado');

  await conn.end();
  console.log('Migracion completada');
})().catch(e => { console.error(e); process.exit(1); });
