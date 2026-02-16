import { db } from "@/lib/db";

export async function GET(req) {

  const { searchParams } = new URL(req.url);
  const onlyActive = searchParams.get("active") === "1";

  // consulta con join
  const [rows] = await db.query(`
    SELECT
      m.id AS type_id,
      m.name AS type_name,
      m.is_active AS mant_active,
      s.id,
      s.name,
      s.is_active
    FROM mantenimiento m
    LEFT JOIN submantenimiento s
      ON s.type_id = m.id
    ORDER BY m.name, s.name
  `);

  // agrupar
  const grupos = {};

  rows.forEach(r => {

    // 🔥 FILTRAR MANTENIMIENTO INACTIVO
    if (onlyActive && r.mant_active !== 1) return;

    if (!grupos[r.type_id]) {
      grupos[r.type_id] = {
        type_id: r.type_id,
        type_name: r.type_name,
        items: []
      };
    }

    // 🔥 FILTRAR SUB INACTIVO
    if (r.id && (!onlyActive || r.is_active === 1)) {
      grupos[r.type_id].items.push({
        id: r.id,
        name: r.name
      });
    }

  });

  return Response.json(Object.values(grupos));
}
