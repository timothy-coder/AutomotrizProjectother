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
        r.id,
        r.oportunidad_id,
        r.created_by,
        r.created_at,
        r.updated_at,
        u.fullname as created_by_name,
        oo.oportunidad_id as oportunidad_codigo,
        oo.cliente_id,
        concat(c.nombre, ' ', c.apellido) as cliente_nombre,
        c.email as cliente_email,
        c.celular as cliente_telefono,
        c.identificacion_fiscal as cliente_dni,
        e.nombre as etapa_nombre
      FROM reservas r
      LEFT JOIN usuarios u ON r.created_by = u.id
      LEFT JOIN oportunidades_oportunidades oo ON r.oportunidad_id = oo.id
      LEFT JOIN clientes c ON oo.cliente_id = c.id
      LEFT JOIN etapasconversion e ON oo.etapasconversion_id = e.id
      WHERE r.id = ?
    `, [id]);

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    const reserva = rows[0];
    const oportunidadId = reserva.oportunidad_id;

    // ✅ Obtener cotizaciones relacionadas (pueden ser "enviada" o "reservada")
    const [cotizaciones] = await db.query(`
      SELECT 
        ca.id,
        ca.marca_id,
        ca.modelo_id,
        ca.version_id,
        ca.anio,
        ca.sku,
        ca.color_externo,
        ca.color_interno,
        ca.estado,
        m.name as marca_nombre,
        mo.name as modelo_nombre,
        v.nombre as version_nombre
      FROM cotizacionesagenda ca
      LEFT JOIN marcas m ON ca.marca_id = m.id
      LEFT JOIN modelos mo ON ca.modelo_id = mo.id
      LEFT JOIN versiones v ON ca.version_id = v.id
      WHERE ca.oportunidad_id = ? AND ca.estado IN ('enviada', 'reservada')
      ORDER BY ca.created_at DESC
    `, [oportunidadId]);

    return NextResponse.json({
      ...reserva,
      cotizaciones: cotizaciones || [],
    });
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

    // ✅ Verificar que la reserva existe
    const [reservaCheck] = await db.query(
      "SELECT id FROM reservas WHERE id = ?",
      [id]
    );

    if (reservaCheck.length === 0) {
      return NextResponse.json(
        { message: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    const [result] = await db.query(
      "DELETE FROM reservas WHERE id = ?",
      [id]
    );

    return NextResponse.json({
      message: "Reserva eliminada exitosamente",
      deletedRows: result.affectedRows,
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}