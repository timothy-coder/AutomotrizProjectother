"use server";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================
// GET → LISTAR MODELOS (con marca + clase + anios)
// /api/modelos?marca_id=1&clase_id=2
// ============================
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const marca_id = searchParams.get("marca_id");
    const clase_id = searchParams.get("clase_id");

    let query = `
      SELECT 
        m.id,
        m.name,
        m.marca_id,
        ma.name AS marca_name,
        m.clase_id,
        c.name AS clase_nombre,
        m.anios,
        m.created_at
      FROM modelos m
      INNER JOIN marcas ma ON ma.id = m.marca_id
      LEFT JOIN clases c ON c.id = m.clase_id
    `;

    const params = [];
    const where = [];

    if (marca_id) {
      where.push("m.marca_id = ?");
      params.push(marca_id);
    }

    if (clase_id) {
      where.push("m.clase_id = ?");
      params.push(clase_id);
    }

    if (where.length) {
      query += ` WHERE ${where.join(" AND ")}`;
    }

    query += ` ORDER BY ma.name ASC, m.name ASC`;

    const [rows] = await db.query(query, params);

    // MySQL puede devolver JSON como string -> lo normalizamos
    const out = rows.map((r) => ({
      ...r,
      anios:
        r.anios == null
          ? null
          : typeof r.anios === "string"
          ? JSON.parse(r.anios)
          : r.anios,
    }));

    return NextResponse.json(out);
  } catch (error) {
    console.log(error);
    return NextResponse.json(
      { message: "Error al obtener modelos" },
      { status: 500 }
    );
  }
}

// ============================
// POST → CREAR MODELO
// body: { name, marca_id, clase_id?, anios? }
// anios: puede ser array [2020,2021] o number 2020 o null
// ============================
export async function POST(req) {
  try {
    const { name, marca_id, clase_id, anios } = await req.json();

    if (!name || String(name).trim() === "") {
      return NextResponse.json({ message: "Nombre requerido" }, { status: 400 });
    }
    if (!marca_id) {
      return NextResponse.json({ message: "marca_id requerido" }, { status: 400 });
    }

    // Normalizar anios a JSON (preferible array)
    let aniosJson = null;
    if (anios !== undefined && anios !== null && anios !== "") {
      // acepta number, array, object
      aniosJson = JSON.stringify(anios);
    }

    const [result] = await db.query(
      `
        INSERT INTO modelos (name, marca_id, clase_id, anios)
        VALUES (?, ?, ?, ?)
      `,
      [
        String(name).trim(),
        Number(marca_id),
        clase_id ? Number(clase_id) : null,
        aniosJson,
      ]
    );

    return NextResponse.json({ id: result.insertId }, { status: 201 });
  } catch (error) {
    console.log(error);

    // Duplicado por uq_modelo_por_marca (marca_id + name)
    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { message: "Ya existe un modelo con ese nombre en la marca." },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { message: "Error al crear modelo" },
      { status: 500 }
    );
  }
}