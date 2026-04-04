import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(`
      SELECT 
        c.id,
        c.oportunidad_id,
        c.detalle,
        c.cierre_detalle_id,
        c.created_by,
        c.created_at,
        c.updated_at,
        cd.detalle as cierre_detalle_nombre,
        u.fullname as created_by_name,
        o.oportunidad_id as oportunidad_codigo
      FROM cierres c
      LEFT JOIN cierres_detalle cd ON c.cierre_detalle_id = cd.id
      LEFT JOIN usuarios u ON c.created_by = u.id
      LEFT JOIN oportunidades_oportunidades o ON c.oportunidad_id = o.id
      WHERE c.id = ?
    `, [id]);

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Cierre no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(rows[0]);

  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = await params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    const { detalle, cierre_detalle_id } = await request.json();

    if (!detalle || !detalle.trim()) {
      return NextResponse.json(
        { message: "El detalle es requerido" },
        { status: 400 }
      );
    }

    // ✅ Verificar que el cierre existe
    const [cierreCheck] = await db.query(
      'SELECT id FROM cierres WHERE id = ?',
      [id]
    );

    if (cierreCheck.length === 0) {
      return NextResponse.json(
        { message: "Cierre no encontrado" },
        { status: 404 }
      );
    }

    // ✅ Validar que el cierre_detalle existe (si se proporciona)
    if (cierre_detalle_id) {
      const [detalleCheck] = await db.query(
        'SELECT id FROM cierres_detalle WHERE id = ?',
        [cierre_detalle_id]
      );

      if (detalleCheck.length === 0) {
        return NextResponse.json(
          { message: "El detalle de cierre no existe" },
          { status: 404 }
        );
      }
    }

    await db.query(`
      UPDATE cierres 
      SET detalle = ?, cierre_detalle_id = ?
      WHERE id = ?
    `, [detalle.trim(), cierre_detalle_id || null, id]);

    return NextResponse.json(
      {
        message: "Cierre actualizado",
        id,
      }
    );

  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    // ✅ Verificar que el cierre existe antes de eliminar
    const [cierreCheck] = await db.query(
      'SELECT id FROM cierres WHERE id = ?',
      [id]
    );

    if (cierreCheck.length === 0) {
      return NextResponse.json(
        { message: "Cierre no encontrado" },
        { status: 404 }
      );
    }

    await db.query('DELETE FROM cierres WHERE id = ?', [id]);

    return NextResponse.json(
      {
        message: "Cierre eliminado",
        id,
      }
    );

  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}