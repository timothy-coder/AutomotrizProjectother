import { db } from "@/lib/db";
import * as XLSX from "xlsx";

function norm(s) {
  return String(s ?? "").trim().toLowerCase();
}

function isMatrixHeader(headerRow) {
  // template: ["carro_id","modelo","marca","año","version","Mant | Sub", ...]
  const header = headerRow.map(h => String(h ?? ""));
  return (
    header.length > 6 &&
    norm(header[0]) === "carro_id" &&
    header.slice(5).some(h => String(h).includes("|"))
  );
}

function isListHeader(headerRow) {
  // export lista: ["carro_id","modelo","marca","year","version","mantenimiento","sub","precio"]
  const h = headerRow.map(x => norm(x));
  return (
    h.includes("carro_id") &&
    h.includes("mantenimiento") &&
    h.includes("sub") &&
    h.includes("precio")
  );
}

async function buildSubMap() {
  // Mapa por "mantenimiento|sub" => id
  const [rows] = await db.query(`
    SELECT s.id, s.name AS sub_name, m.name AS mant_name
    FROM submantenimiento s
    JOIN mantenimiento m ON m.id = s.type_id
  `);

  const map = new Map();
  for (const r of rows) {
    map.set(`${norm(r.mant_name)}|${norm(r.sub_name)}`, r.id);
  }
  return map;
}

export async function POST(req) {
  const { searchParams } = new URL(req.url);
  const mode = (searchParams.get("mode") || "upsert").toLowerCase(); // upsert | replace

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file) {
    return Response.json({ ok: false, message: "Falta archivo" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const aoa = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

  if (!aoa.length || !aoa[0]?.length) {
    return Response.json({ ok: false, message: "Excel vacío" }, { status: 400 });
  }

  const headerRow = aoa[0];

  const matrix = isMatrixHeader(headerRow);
  const list = isListHeader(headerRow);

  if (!matrix && !list) {
    return Response.json(
      {
        ok: false,
        message:
          "Formato no reconocido. Usa el template (matriz) o el export (lista)."
      },
      { status: 400 }
    );
  }

  // si es replace: borrar todo antes
  if (mode === "replace") {
    await db.query("TRUNCATE TABLE precios");
  }

  const subMap = await buildSubMap();

  let insertedOrUpdated = 0;
  let skipped = 0;

  // =============== IMPORT MATRIZ (template) ===============
  if (matrix) {
    // columnas:
    // 0 carro_id, 1 modelo, 2 marca, 3 año, 4 version, 5.. = "Mant | Sub"
    const colSpecs = [];
    for (let j = 5; j < headerRow.length; j++) {
      const colName = String(headerRow[j] ?? "");
      if (!colName.includes("|")) continue;
      const [mant, sub] = colName.split("|").map(x => x.trim());
      const subId = subMap.get(`${norm(mant)}|${norm(sub)}`);
      if (!subId) continue;
      colSpecs.push({ j, subId });
    }

    for (let i = 1; i < aoa.length; i++) {
      const row = aoa[i];
      const carroId = Number(row?.[0]);
      if (!carroId) continue;

      for (const c of colSpecs) {
        const precio = row?.[c.j];
        if (precio === "" || precio == null) {
          skipped++;
          continue;
        }

        const val = Number(precio);
        if (!Number.isFinite(val)) {
          skipped++;
          continue;
        }

        await db.query(
          `
          INSERT INTO precios (carrosparamantenimiento_id, submantenimiento_id, precio)
          VALUES (?,?,?)
          ON DUPLICATE KEY UPDATE precio=VALUES(precio)
          `,
          [carroId, c.subId, val]
        );

        insertedOrUpdated++;
      }
    }

    return Response.json({
      ok: true,
      format: "matrix",
      mode,
      insertedOrUpdated,
      skipped
    });
  }

  // =============== IMPORT LISTA (export precios) ===============
  // buscamos índices por nombre
  const h = headerRow.map(x => norm(x));
  const idx = {
    carro_id: h.indexOf("carro_id"),
    mantenimiento: h.indexOf("mantenimiento"),
    sub: h.indexOf("sub"),
    precio: h.indexOf("precio")
  };

  for (let i = 1; i < aoa.length; i++) {
    const row = aoa[i];
    const carroId = Number(row?.[idx.carro_id]);
    const mantName = String(row?.[idx.mantenimiento] ?? "");
    const subName = String(row?.[idx.sub] ?? "");
    const precio = row?.[idx.precio];

    if (!carroId || !mantName || !subName) {
      skipped++;
      continue;
    }

    const subId = subMap.get(`${norm(mantName)}|${norm(subName)}`);
    if (!subId) {
      skipped++;
      continue;
    }

    if (precio === "" || precio == null) {
      skipped++;
      continue;
    }

    const val = Number(precio);
    if (!Number.isFinite(val)) {
      skipped++;
      continue;
    }

    await db.query(
      `
      INSERT INTO precios (carrosparamantenimiento_id, submantenimiento_id, precio)
      VALUES (?,?,?)
      ON DUPLICATE KEY UPDATE precio=VALUES(precio)
      `,
      [carroId, subId, val]
    );

    insertedOrUpdated++;
  }

  return Response.json({
    ok: true,
    format: "list",
    mode,
    insertedOrUpdated,
    skipped
  });
}
