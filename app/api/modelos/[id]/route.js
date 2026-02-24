"use server";

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================
// GET ONE (con marca + clase)
// ============================
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const [rows] = await db.query(
      `
      SELECT 
        m.*,
        ma.name AS marca_name,
        c.nombre AS clase_nombre
      FROM modelos m
      INNER JOIN marcas ma ON ma.id = m.marca_id
      LEFT JOIN clases c ON c.id = m.clase_id
      WHERE m.id = ?
    `,
      [id]
    );

    if (!rows.length) {
      return NextResponse.json({ message: "No encontrado" }, { status: 404 });
    }

    const row = rows[0];
    const out = {
      ...row,
      anios:
        row.anios == null
          ? null
          : typeof row.anios === "string"
          ? JSON.parse(row.anios)
          : row.anios,
    };

    return NextResponse.json(out);
  } catch (error) {
    console.log(error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

// ============================
// UPDATE
// body: { name, marca_id, clase_id?, anios? }
// ============================
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const { name, marca_id, clase_id, anios } = await req.json();

    if (!name || String(name).trim() === "") {
      return NextResponse.json({ message: "Nombre requerido" }, { status: 400 });
    }
    if (!marca_id) {
      return NextResponse.json({ message: "marca_id requerido" }, { status: 400 });
    }

    let aniosJson = null;
    if (anios !== undefined) {
      // si viene null => guarda null, si viene algo => JSON
      aniosJson = anios === null || anios === "" ? null : JSON.stringify(anios);
    } else {
      // si NO envías anios, no lo tocamos
      const [current] = await db.query(`SELECT anios FROM modelos WHERE id=?`, [id]);
      aniosJson = current?.[0]?.anios ?? null;
      // ojo: current[0].anios podría ser object/string según driver, pero aquí lo guardamos tal cual
      if (aniosJson && typeof aniosJson !== "string") aniosJson = JSON.stringify(aniosJson);
    }

    await db.query(
      `
      UPDATE modelos
      SET name = ?, marca_id = ?, clase_id = ?, anios = ?
      WHERE id = ?
    `,
      [
        String(name).trim(),
        Number(marca_id),
        clase_id ? Number(clase_id) : null,
        aniosJson,
        id,
      ]
    );

    return NextResponse.json({ message: "Actualizado" });
  } catch (error) {
    console.log(error);

    if (error?.code === "ER_DUP_ENTRY") {
      return NextResponse.json(
        { message: "Ya existe un modelo con ese nombre en la marca." },
        { status: 409 }
      );
    }

    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

// ============================
// DELETE
// ============================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    await db.query(
      `
      DELETE FROM modelos
      WHERE id = ?
    `,
      [id]
    );

    return NextResponse.json({ message: "Eliminado" });
  } catch (error) {
    console.log(error);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}