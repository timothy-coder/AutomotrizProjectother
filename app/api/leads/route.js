import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const cliente_id = searchParams.get("cliente_id");
    const origen_id = searchParams.get("origen_id");
    const etapasconversion_id = searchParams.get("etapasconversion_id");
    const asignado_a = searchParams.get("asignado_a");
    const created_by = searchParams.get("created_by");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;

    let sql = `SELECT o.*, 
               c.nombre as cliente_nombre,
               origen.name as origen_nombre,
               so.name as suborigen_nombre,
               e.nombre as etapa_nombre,
               c.email as cliente_email,
               c.celular as cliente_telefono,
               c.identificacion_fiscal as cliente_dni,
               u1.fullname as creado_por_nombre,
               u2.fullname as asignado_a_nombre
               FROM oportunidades_oportunidades o
               LEFT JOIN clientes c ON o.cliente_id = c.id
               LEFT JOIN origenes_citas origen ON o.origen_id = origen.id
               LEFT JOIN suborigenes_citas so ON o.suborigen_id = so.id
               LEFT JOIN etapasconversion e ON o.etapasconversion_id = e.id
               LEFT JOIN usuarios u1 ON o.created_by = u1.id
               LEFT JOIN usuarios u2 ON o.asignado_a = u2.id
               WHERE o.oportunidad_id LIKE 'LD-%'`;

    const params = [];

    if (cliente_id) {
      sql += " AND o.cliente_id = ?";
      params.push(cliente_id);
    }

    if (origen_id) {
      sql += " AND o.origen_id = ?";
      params.push(origen_id);
    }

    if (etapasconversion_id) {
      sql += " AND o.etapasconversion_id = ?";
      params.push(etapasconversion_id);
    }

    if (asignado_a) {
      sql += " AND o.asignado_a = ?";
      params.push(asignado_a);
    }

    if (created_by) {
      sql += " AND o.created_by = ?";
      params.push(created_by);
    }

    if (search) {
      sql += " AND (o.detalle LIKE ? OR o.oportunidad_id LIKE ?)";
      params.push(`%${search}%`, `%${search}%`);
    }

    // Contar total
    const countParams = [...params];
    let countSql = `SELECT COUNT(*) as total FROM oportunidades_oportunidades o
               LEFT JOIN clientes c ON o.cliente_id = c.id
               LEFT JOIN origenes_citas origen ON o.origen_id = origen.id
               LEFT JOIN suborigenes_citas so ON o.suborigen_id = so.id
               LEFT JOIN etapasconversion e ON o.etapasconversion_id = e.id
               LEFT JOIN usuarios u1 ON o.created_by = u1.id
               LEFT JOIN usuarios u2 ON o.asignado_a = u2.id
               WHERE o.oportunidad_id LIKE 'LD-%'`;

    if (cliente_id) {
      countSql += " AND o.cliente_id = ?";
    }

    if (origen_id) {
      countSql += " AND o.origen_id = ?";
    }

    if (etapasconversion_id) {
      countSql += " AND o.etapasconversion_id = ?";
    }

    if (asignado_a) {
      countSql += " AND o.asignado_a = ?";
    }

    if (created_by) {
      countSql += " AND o.created_by = ?";
    }

    if (search) {
      countSql += " AND (o.detalle LIKE ? OR o.oportunidad_id LIKE ?)";
    }

    const [countResult] = await db.query(countSql, countParams);
    const total = countResult[0].total;

    sql += " ORDER BY o.created_at DESC LIMIT ? OFFSET ?";
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
      cliente_id,
      origen_id,
      suborigen_id,
      detalle,
      etapasconversion_id,
      asignado_a,
      created_by,
    } = await req.json();

    if (!cliente_id || !origen_id || !etapasconversion_id || !created_by) {
      return NextResponse.json(
        {
          message:
            "Campos requeridos: cliente_id, origen_id, etapasconversion_id, created_by",
        },
        { status: 400 }
      );
    }

    // ✅ GENERAR oportunidad_id automático - FILTRAR SOLO LD-
    const year = new Date().getFullYear();
    
    // Buscar el último registro con prefijo LD-{year}-
    const [lastLead] = await db.query(
      `SELECT oportunidad_id FROM oportunidades_oportunidades 
       WHERE oportunidad_id LIKE ? 
       ORDER BY id DESC LIMIT 1`,
      [`LD-${year}-%`]
    );

    let nextNumber = 1;
    
    if (lastLead.length > 0 && lastLead[0].oportunidad_id) {
      const parts = lastLead[0].oportunidad_id.split("-");
      const currentNumber = parseInt(parts[2]);
      nextNumber = currentNumber + 1;
      
      console.log(`📊 Último LD encontrado: ${lastLead[0].oportunidad_id}`);
      console.log(`📊 Próximo número: ${nextNumber}`);
    } else {
      console.log(`📊 Primer LD del año ${year}`);
    }

    const oportunidad_id = `LD-${year}-${String(nextNumber).padStart(3, "0")}`;
    
    console.log(`✅ Creando lead con ID: ${oportunidad_id}`);

    const [result] = await db.query(
      `INSERT INTO oportunidades_oportunidades 
       (cliente_id, origen_id, suborigen_id, detalle, etapasconversion_id, created_by, asignado_a, oportunidad_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cliente_id,
        origen_id,
        suborigen_id,
        detalle,
        etapasconversion_id,
        created_by,
        asignado_a,
        oportunidad_id,
      ]
    );

    return NextResponse.json(
      {
        message: "Lead creado",
        id: result.insertId,
        oportunidad_id,
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