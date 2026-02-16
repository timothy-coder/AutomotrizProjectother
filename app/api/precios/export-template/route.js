import { db } from "@/lib/db";
import * as XLSX from "xlsx";

export async function GET() {

  const [carros] = await db.query(`
    SELECT 
      c.id,
      mo.name AS modelo,
      ma.name AS marca,
      c.year,
      c.version
    FROM carrosparamantenimiento c
    JOIN modelos mo ON mo.id = c.modelo_id
    JOIN marcas ma ON ma.id = mo.marca_id
    ORDER BY ma.name, mo.name
  `);

  const [subs] = await db.query(`
    SELECT s.id, s.name, m.name AS mantenimiento
    FROM submantenimiento s
    JOIN mantenimiento m ON m.id=s.type_id
    WHERE m.is_active=1 AND s.is_active=1
  `);

  const header = [
    "carro_id",
    "modelo",
    "marca",
    "año",
    "version",
    ...subs.map(s => `${s.mantenimiento} | ${s.name}`)
  ];

  const data = carros.map(c => [
    c.id,
    c.modelo,
    c.marca,
    c.year,
    c.version,
    ...subs.map(() => "")
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...data]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Formato");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buffer, {
    headers: {
      "Content-Disposition": "attachment; filename=formato_precios.xlsx",
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
  });
}
