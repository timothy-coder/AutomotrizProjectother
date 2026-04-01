import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req, { params }) {
  try {
    const { id } = await params;

    // ✅ Buscar por ID numérico o por código de oportunidad (ej: OPO-2026-004)
    let query = `SELECT oo.*,
                        m.name as marca_nombre,
                        mo.name as modelo_nombre,
                        v.nombre as version_nombre,
                        e.nombre as etapa_name,
                        o.name as origen_name,
                        so.name as suborigen_name,
                        CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre,
                        c.email as cliente_email,
                        c.celular as cliente_telefono,
                        c.identificacion_fiscal as cliente_dni,
                        u_created.fullname as created_by_name,
                        u_asignado.fullname as asignado_a_name,
                        ca.id as cotizacion_id,
                        ca.marca_id,
                        ca.modelo_id,
                        ca.version_id,
                        ca.anio,
                        ca.color_externo,
                        ca.color_interno,
                        ca.sku,
                        ca.estado as cotizacion_estado
                 FROM oportunidades_oportunidades oo
                 LEFT JOIN cotizacionesagenda ca ON oo.id = ca.oportunidad_id
                 LEFT JOIN marcas m ON ca.marca_id = m.id
                 LEFT JOIN modelos mo ON ca.modelo_id = mo.id
                 LEFT JOIN versiones v ON ca.version_id = v.id
                 LEFT JOIN etapasconversion e ON oo.etapasconversion_id = e.id
                 LEFT JOIN origenes_citas o ON oo.origen_id = o.id
                 LEFT JOIN suborigenes_citas so ON oo.suborigen_id = so.id
                 LEFT JOIN clientes c ON oo.cliente_id = c.id
                 LEFT JOIN usuarios u_created ON oo.created_by = u_created.id
                 LEFT JOIN usuarios u_asignado ON oo.asignado_a = u_asignado.id
                 WHERE oo.id = ? OR oo.oportunidad_id = ?
                 LIMIT 1`;

    const [oportunidades] = await db.query(query, [id, id]);

    if (oportunidades.length === 0) {
      return NextResponse.json(
        { message: "Oportunidad no encontrada" },
        { status: 404 }
      );
    }

    const oportunidad = oportunidades[0];

    // ✅ Obtener accesorios SOLO si cotización estado es "enviada"
    let accesorios = [];
    if (oportunidad.cotizacion_id && oportunidad.cotizacion_estado === "enviada") {
      const [accesoriosData] = await db.query(
        `SELECT 
          ca.*,
          aa.detalle,
          aa.numero_parte,
          m.codigo as moneda_codigo,
          m.simbolo as moneda_simbolo
         FROM cotizaciones_accesorios ca
         INNER JOIN accesorios_disponibles aa ON ca.accesorio_id = aa.id
         INNER JOIN monedas m ON ca.moneda_id = m.id
         WHERE ca.cotizacion_id = ?
         ORDER BY ca.created_at DESC`,
        [oportunidad.cotizacion_id]
      );
      accesorios = accesoriosData || [];
    }

    // ✅ Obtener precio de versión SOLO si cotización estado es "enviada"
    let precioVersion = null;
    if (
      oportunidad.cotizacion_id &&
      oportunidad.cotizacion_estado === "enviada" &&
      oportunidad.marca_id &&
      oportunidad.modelo_id &&
      oportunidad.version_id
    ) {
      const [preciosData] = await db.query(
        `SELECT * FROM precios_region_version 
         WHERE marca_id = ? AND modelo_id = ? AND version_id = ?
         LIMIT 1`,
        [oportunidad.marca_id, oportunidad.modelo_id, oportunidad.version_id]
      );
      if (preciosData && preciosData.length > 0) {
        precioVersion = preciosData[0];
      }
    }

    // ✅ Obtener especificaciones del modelo SOLO si cotización estado es "enviada"
    let especificaciones = [];
    if (
      oportunidad.cotizacion_id &&
      oportunidad.cotizacion_estado === "enviada" &&
      oportunidad.marca_id &&
      oportunidad.modelo_id
    ) {
      const [especificacionesData] = await db.query(
        `SELECT 
          me.*,
          e.nombre as especificacion_nombre,
          e.tipo_dato
         FROM modelo_especificaciones me
         INNER JOIN especificaciones e ON me.especificacion_id = e.id
         WHERE me.marca_id = ? AND me.modelo_id = ?
         ORDER BY e.nombre ASC`,
        [oportunidad.marca_id, oportunidad.modelo_id]
      );
      especificaciones = especificacionesData || [];
    }

    return NextResponse.json({
      ...oportunidad,
      accesorios,
      precioVersion,
      especificaciones,
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const updates = await req.json();

    // ✅ Campos permitidos para actualizar
    const allowedFields = [
      "etapasconversion_id",
      "asignado_a",
      "observaciones",
      "detalle",
      "nota_pedido",
      "carta_caracteristicas",
    ];

    const setClause = [];
    const values = [];

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        setClause.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (setClause.length === 0) {
      return NextResponse.json(
        { message: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    values.push(id);

    const query = `UPDATE oportunidades_oportunidades 
                   SET ${setClause.join(", ")}, updated_at = NOW()
                   WHERE id = ? OR oportunidad_id = ?`;

    const result = await db.query(query, [...values, id]);

    return NextResponse.json({ 
      message: "Oportunidad actualizada",
      affectedRows: result[0]?.affectedRows || 0
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { message: "ID de reserva es requerido" },
        { status: 400 }
      );
    }

    // ✅ Elimina SOLO la reserva, sin afectar la oportunidad
    const [result] = await db.query(
      "DELETE FROM reservas WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      message: "Reserva eliminada exitosamente",
      deletedRows: result.affectedRows 
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}