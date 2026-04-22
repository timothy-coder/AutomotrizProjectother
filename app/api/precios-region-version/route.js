// ============================================
// API DE PRECIOS CON VERSIÓN
// archivo: app/api/precios-region-version/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { authorizeConversation } from "@/lib/conversationsAuth";

export async function GET(req) {
  const auth = authorizeConversation(req, "view");
  if (!auth.ok) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const marca_id = searchParams.get("marca_id");
    const modelo_id = searchParams.get("modelo_id");
    const version_id = searchParams.get("version_id");

    let query = `
      SELECT
        prv.id,
        prv.marca_id,
        prv.modelo_id,
        prv.version_id,
        prv.precio_base,
        prv.en_stock,
        prv.existe,
        prv.tiempo_entrega_dias,
        m.name as marca,
        mo.name as modelo,
        v.nombre as version,
        prv.created_at,
        prv.updated_at
      FROM precios_region_version prv
      INNER JOIN marcas m ON m.id = prv.marca_id
      INNER JOIN modelos mo ON mo.id = prv.modelo_id
      INNER JOIN versiones v ON v.id = prv.version_id
      WHERE 1=1
    `;
    const params = [];

    if (marca_id) {
      query += " AND prv.marca_id = ?";
      params.push(marca_id);
    }

    if (modelo_id) {
      query += " AND prv.modelo_id = ?";
      params.push(modelo_id);
    }

    if (version_id) {
      query += " AND prv.version_id = ?";
      params.push(version_id);
    }

    query += " ORDER BY m.name, mo.name, v.nombre";

    const [rows] = await db.query(query, params);
    return NextResponse.json(rows);
  } catch (e) {
    console.error("[precios-region-version GET] DB error:", e.message);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function PUT(req) {
  const auth = authorizeConversation(req, "edit");
  if (!auth.ok) return auth.response;

  try {
    const {
      marca_id,
      modelo_id,
      version_id,
      precio_base,
      en_stock = true,
      existe = true,
      tiempo_entrega_dias = 0,
    } = await req.json();

    if (!marca_id || !modelo_id || !version_id) {
      return NextResponse.json(
        { message: "Marca, modelo y versión son requeridos" },
        { status: 400 }
      );
    }

    // Verificar que existan
    const [marca] = await db.query(
      "SELECT id FROM marcas WHERE id = ?",
      [marca_id]
    );

    if (marca.length === 0) {
      return NextResponse.json(
        { message: "Marca no encontrada" },
        { status: 404 }
      );
    }

    const [modelo] = await db.query(
      "SELECT id FROM modelos WHERE id = ?",
      [modelo_id]
    );

    if (modelo.length === 0) {
      return NextResponse.json(
        { message: "Modelo no encontrado" },
        { status: 404 }
      );
    }

    const [version] = await db.query(
      "SELECT id FROM versiones WHERE id = ?",
      [version_id]
    );

    if (version.length === 0) {
      return NextResponse.json(
        { message: "Versión no encontrada" },
        { status: 404 }
      );
    }

    // Verificar si ya existe
    const [existing] = await db.query(
      `SELECT id FROM precios_region_version 
       WHERE marca_id = ? AND modelo_id = ? AND version_id = ?`,
      [marca_id, modelo_id, version_id]
    );

    if (existing.length > 0) {
      await db.query(
        `UPDATE precios_region_version
         SET precio_base = ?, en_stock = ?, existe = ?, tiempo_entrega_dias = ?
         WHERE marca_id = ? AND modelo_id = ? AND version_id = ?`,
        [precio_base ?? 0, en_stock ? 1 : 0, existe ? 1 : 0, Number(tiempo_entrega_dias) || 0,
         marca_id, modelo_id, version_id]
      );
      return NextResponse.json({ message: "Precio actualizado", id: existing[0].id });
    } else {
      const [result] = await db.query(
        `INSERT INTO precios_region_version
         (marca_id, modelo_id, version_id, precio_base, en_stock, existe, tiempo_entrega_dias)
         VALUES(?, ?, ?, ?, ?, ?, ?)`,
        [marca_id, modelo_id, version_id, precio_base ?? 0,
         en_stock ? 1 : 0, existe ? 1 : 0, Number(tiempo_entrega_dias) || 0]
      );
      return NextResponse.json(
        { message: "Precio creado", id: result.insertId },
        { status: 201 }
      );
    }
  } catch (e) {
    console.error("[precios-region-version PUT] DB error:", e.message);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}