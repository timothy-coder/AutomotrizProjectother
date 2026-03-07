import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const onlyActive = searchParams.get("active") === "1";

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
    ORDER BY m.name ASC, s.name ASC
  `);

  const grupos = {};

  rows.forEach((r) => {
    if (onlyActive && r.mant_active !== 1) return;

    if (!grupos[r.type_id]) {
      grupos[r.type_id] = {
        type_id: r.type_id,
        type_name: r.type_name,
        items: [],
      };
    }

    if (r.id && (!onlyActive || r.is_active === 1)) {
      grupos[r.type_id].items.push({
        id: r.id,
        name: r.name,
      });
    }
  });

  const resultado = Object.values(grupos)
    .map((grupo) => ({
      ...grupo,
      items: grupo.items.sort((a, b) =>
        a.name.localeCompare(b.name, "es", {
          numeric: true,
          sensitivity: "base",
        })
      ),
    }))
    .sort((a, b) =>
      a.type_name.localeCompare(b.type_name, "es", {
        numeric: true,
        sensitivity: "base",
      })
    );

  return Response.json(resultado);
}