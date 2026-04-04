import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const oportunidadId = searchParams.get('oportunidad_id');
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    let sql = `
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
      WHERE 1=1
    `;
    const params = [];

    if (oportunidadId) {
      sql += ' AND c.oportunidad_id = ?';
      params.push(oportunidadId);
    }

    // Contar total
    const countSql = `
      SELECT COUNT(*) as total FROM cierres c
      WHERE 1=1 ${oportunidadId ? 'AND c.oportunidad_id = ?' : ''}
    `;
    const countParams = oportunidadId ? [oportunidadId] : [];
    const [countResult] = await db.query(countSql, countParams);
    const total = countResult[0].total;

    sql += ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [rows] = await db.query(sql, params);
    
    return NextResponse.json({
      data: rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });

  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const {
      oportunidad_id,
      detalle,
      cierre_detalle_id,
      created_by,
    } = await req.json();

    if (!oportunidad_id || !detalle || !created_by) {
      return NextResponse.json(
        { message: "Faltan campos requeridos: oportunidad_id, detalle, created_by" },
        { status: 400 }
      );
    }

    // ✅ Validar que la oportunidad existe
    const [oportunidadCheck] = await db.query(
      'SELECT id FROM oportunidades_oportunidades WHERE id = ?',
      [oportunidad_id]
    );

    if (oportunidadCheck.length === 0) {
      return NextResponse.json(
        { message: "La oportunidad no existe" },
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

    // ✅ Validar que el usuario existe
    const [usuarioCheck] = await db.query(
      'SELECT id FROM usuarios WHERE id = ?',
      [created_by]
    );

    if (usuarioCheck.length === 0) {
      return NextResponse.json(
        { message: "El usuario no existe" },
        { status: 404 }
      );
    }

    const [result] = await db.query(`
      INSERT INTO cierres (oportunidad_id, detalle, cierre_detalle_id, created_by)
      VALUES (?, ?, ?, ?)
    `, [oportunidad_id, detalle, cierre_detalle_id || null, created_by]);

    return NextResponse.json(
      {
        message: "Cierre creado",
        id: result.insertId,
      },
      { status: 201 }
    );

  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}