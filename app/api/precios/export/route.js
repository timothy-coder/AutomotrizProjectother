import { db } from "@/lib/db";
import * as XLSX from "xlsx";

export async function GET() {

  const [rows] = await db.query(`
    SELECT
      c.id AS carro_id,
      mo.name AS modelo,
      ma.name AS marca,
      c.year,
      c.version,
      m.name AS mantenimiento,
      s.name AS sub,
      p.precio
    FROM precios p
    JOIN carrosparamantenimiento c ON c.id=p.carrosparamantenimiento_id
    JOIN modelos mo ON mo.id=c.modelo_id
    JOIN marcas ma ON ma.id=mo.marca_id
    JOIN submantenimiento s ON s.id=p.submantenimiento_id
    JOIN mantenimiento m ON m.id=s.type_id
    WHERE m.is_active=1 AND s.is_active=1
    ORDER BY ma.name, mo.name
  `);

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Precios");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new Response(buffer, {
    headers: {
      "Content-Disposition": "attachment; filename=precios.xlsx",
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    }
  });
}
