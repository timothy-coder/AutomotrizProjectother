// ============================================
// API DE FORMAS DE PAGO - ID
// archivo: app/api/formas-pago/[id]/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = params;

    const [rows] = await db.query(
      `SELECT fp.*,
              COUNT(DISTINCT pfpa.id) as total_precios_asignados
       FROM formas_pago fp
       LEFT JOIN precio_forma_pago_ajuste pfpa ON pfpa.forma_pago_id = fp.id
       WHERE fp.id = ?
       GROUP BY fp.id`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Forma de pago no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const { nombre, descripcion, es_activa } = await req.json();

    if (!nombre || nombre.trim() === "") {
      return NextResponse.json(
        { message: "Nombre requerido" },
        { status: 400 }
      );
    }

    // Verificar duplicados
    const [duplicate] = await db.query(
      "SELECT id FROM formas_pago WHERE nombre = ? AND id != ?",
      [nombre.trim(), id]
    );

    if (duplicate.length > 0) {
      return NextResponse.json(
        { message: "Ya existe otra forma de pago con este nombre" },
        { status: 409 }
      );
    }

    const [result] = await db.query(
      "UPDATE formas_pago SET nombre = ?, descripcion = ?, es_activa = ? WHERE id = ?",
      [nombre.trim(), descripcion || null, es_activa !== undefined ? es_activa : 1, id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Forma de pago no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Forma de pago actualizada" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    // Verificar si está siendo usada
    const [precios] = await db.query(
      "SELECT COUNT(*) as count FROM precio_forma_pago_ajuste WHERE forma_pago_id = ?",
      [id]
    );

    if (precios[0].count > 0) {
      return NextResponse.json(
        {
          message: `No se puede eliminar. Está siendo usada en ${precios[0].count} precio(s)`,
        },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      "DELETE FROM formas_pago WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Forma de pago no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Forma de pago eliminada" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}