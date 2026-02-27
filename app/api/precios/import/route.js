import { db } from "@/lib/db";
import * as XLSX from "xlsx";

function norm(s) {
  return String(s ?? "").trim().toLowerCase();
}

function isMatrixHeader(headerRow) {
  // ejemplo:
  // ["marca_id","modelo_id","marca","modelo","clase","anios","Mant | Sub", ...]
  const header = headerRow.map((h) => norm(h));
  return (
    header.length > 6 &&
    header.includes("marca_id") &&
    header.includes("modelo_id") &&
    header.slice(6).some((h) => String(h).includes("|"))
  );
}

function isListHeader(headerRow) {
  // ejemplo recomendado:
  // ["marca_id","modelo_id","mantenimiento","sub","precio"]
  const h = headerRow.map((x) => norm(x));
  return (
    h.includes("marca_id") &&
    h.includes("modelo_id") &&
    h.includes("mantenimiento") &&
    h.includes("sub") &&
    h.includes("precio")
  );
}

async function buildSubMap() {
  // "mantenimiento|sub" => { subId, mantId }
  const [rows] = await db.query(`
    SELECT 
      s.id   AS sub_id,
      s.name AS sub_name,
      m.id   AS mant_id,
      m.name AS mant_name
    FROM submantenimiento s
    JOIN mantenimiento m ON m.id = s.type_id
  `);

  const map = new Map();
  for (const r of rows) {
    map.set(`${norm(r.mant_name)}|${norm(r.sub_name)}`, {
      subId: Number(r.sub_id),
      mantId: Number(r.mant_id),
    });
  }
  return map;
}

function numOrNull(v) {
  if (v === "" || v == null) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req) {
  try {
    const { searchParams } = new URL(req.url);
    const mode = (searchParams.get("mode") || "upsert").toLowerCase(); // upsert | replace

    const formData = await req.formData();
    const file = formData.get("file");
    if (!file) return Response.json({ ok: false, message: "Falta archivo" }, { status: 400 });

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
            "Formato no reconocido. Usa LISTA: marca_id,modelo_id,mantenimiento,sub,precio o MATRIZ: marca_id,modelo_id,... y columnas Mant|Sub",
        },
        { status: 400 }
      );
    }

    if (mode === "replace") {
      await db.query("TRUNCATE TABLE precios");
    }

    const subMap = await buildSubMap();

    let insertedOrUpdated = 0;
    let skipped = 0;

    // ===================== IMPORT MATRIZ =====================
    if (matrix) {
      const h = headerRow.map((x) => norm(x));
      const idxMarcaId = h.indexOf("marca_id");
      const idxModeloId = h.indexOf("modelo_id");

      // columnas Mant|Sub desde la 6 en adelante (como en tu template)
      const colSpecs = [];
      for (let j = 0; j < headerRow.length; j++) {
        const raw = String(headerRow[j] ?? "");
        if (!raw.includes("|")) continue;

        const [mant, sub] = raw.split("|").map((x) => x.trim());
        const pair = subMap.get(`${norm(mant)}|${norm(sub)}`);
        if (!pair) continue;

        colSpecs.push({ j, mantId: pair.mantId, subId: pair.subId });
      }

      for (let i = 1; i < aoa.length; i++) {
        const row = aoa[i];
        const marcaId = Number(row?.[idxMarcaId]);
        const modeloId = Number(row?.[idxModeloId]);

        if (!marcaId || !modeloId) {
          skipped++;
          continue;
        }

        for (const c of colSpecs) {
          const val = numOrNull(row?.[c.j]);
          if (val == null) {
            skipped++;
            continue;
          }

          await db.query(
            `
            INSERT INTO precios (mantenimiento_id, submantenimiento_id, marca_id, modelo_id, precio)
            VALUES (?,?,?,?,?)
            ON DUPLICATE KEY UPDATE precio = VALUES(precio)
            `,
            [c.mantId, c.subId, marcaId, modeloId, val]
          );

          insertedOrUpdated++;
        }
      }

      return Response.json({
        ok: true,
        format: "matrix",
        mode,
        insertedOrUpdated,
        skipped,
      });
    }

    // ===================== IMPORT LISTA =====================
    const h = headerRow.map((x) => norm(x));
    const idx = {
      marca_id: h.indexOf("marca_id"),
      modelo_id: h.indexOf("modelo_id"),
      mantenimiento: h.indexOf("mantenimiento"),
      sub: h.indexOf("sub"),
      precio: h.indexOf("precio"),
    };

    for (let i = 1; i < aoa.length; i++) {
      const row = aoa[i];

      const marcaId = Number(row?.[idx.marca_id]);
      const modeloId = Number(row?.[idx.modelo_id]);
      const mantName = String(row?.[idx.mantenimiento] ?? "");
      const subName = String(row?.[idx.sub] ?? "");
      const val = numOrNull(row?.[idx.precio]);

      if (!marcaId || !modeloId || !mantName || !subName || val == null) {
        skipped++;
        continue;
      }

      const pair = subMap.get(`${norm(mantName)}|${norm(subName)}`);
      if (!pair) {
        skipped++;
        continue;
      }

      await db.query(
        `
        INSERT INTO precios (mantenimiento_id, submantenimiento_id, marca_id, modelo_id, precio)
        VALUES (?,?,?,?,?)
        ON DUPLICATE KEY UPDATE precio = VALUES(precio)
        `,
        [pair.mantId, pair.subId, marcaId, modeloId, val]
      );

      insertedOrUpdated++;
    }

    return Response.json({
      ok: true,
      format: "list",
      mode,
      insertedOrUpdated,
      skipped,
    });
  } catch (e) {
    console.log(e);
    return Response.json({ ok: false, message: "Error importando" }, { status: 500 });
  }
}