// api/reserva-detalles/[id]/route.ts
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

    // ✅ Query completa con todos los datos necesarios
    const [data] = await db.query(`
      SELECT 
        -- Datos de Reserva
        rd.id as detalle_id,
        rd.reserva_id,
        rd.cotizacion_id,
        rd.oportunidad_id,
        rd.tipo_comprobante,
        rd.vin,
        rd.usovehiculo,
        rd.placa,
        rd.numero_motor,
        -- ✅ NUEVOS CAMPOS DE DESCUENTO
        rd.dsctotienda,
        rd.dsctotiendaporcentaje,
        rd.dsctobonoretoma,
        rd.dsctonper,
        rd.cantidad,
        rd.precio_unitario,
        rd.subtotal,
        rd.flete,
        rd.tarjetaplaca,
        rd.glp,
        rd.tc_referencial,
        rd.total,
        rd.descripcion,
        -- Datos Cliente (desde clientes tabla)
        c.id as cliente_id,
        c.nombre as cliente_nombre,
        c.apellido as cliente_apellido,
        c.email,
        c.celular,
        c.identificacion_fiscal,
        c.nombre_comercial,
        c.tipo_identificacion,
        c.fecha_nacimiento,
        c.ocupacion,
        c.domicilio,
        c.departamento_id,
        c.provincia_id,
        c.distrito_id,
        c.nombreconyugue,
        c.dniconyugue,
        d.nombre as departamento_nombre,
        p.nombre as provincia_nombre,
        di.nombre as distrito_nombre,
        -- Datos de Oportunidad y Vehículo
        oo.id as oportunidad_id_check,
        m.id as marca_id,
        m.name as marca_nombre,
        mo.id as modelo_id,
        mo.name as modelo_nombre,
        cl.id as clase_id,
        cl.name as clase_nombre,
        v.id as version_id,
        v.nombre as version_nombre,
        -- Datos Técnicos del Vehículo
        ca.anio,
        ca.color_externo,
        ca.color_interno,
        ca.sku,
        prv.precio_base,
        -- Accesorios
        cac.id as accesorio_cotizacion_id,
        ad.id as accesorio_id,
        ad.precio as accesorio_precio,
        ad.numero_parte,
        ad.detalle as accesorio_detalle,
        mon.id as moneda_id,
        mon.nombre as moneda_nombre,
        mon.simbolo as moneda_simbolo
      FROM reserva_detalles rd
      JOIN reservas r ON r.id = rd.reserva_id
      JOIN oportunidades oo ON oo.id = rd.oportunidad_id
      JOIN clientes c ON oo.cliente_id = c.id
      JOIN cotizacionesagenda ca ON ca.id = rd.cotizacion_id
      JOIN marcas m ON m.id = ca.marca_id
      JOIN modelos mo ON ca.modelo_id = mo.id
      JOIN departamentos d ON d.id = c.departamento_id
      JOIN provincias p ON p.id = c.provincia_id
      JOIN distritos di ON di.id = c.distrito_id
      JOIN clases cl ON cl.id = mo.clase_id
      JOIN versiones v ON v.id = ca.version_id
      LEFT JOIN precios_region_version prv ON prv.marca_id = m.id 
        AND prv.modelo_id = mo.id 
        AND prv.version_id = v.id
      LEFT JOIN cotizaciones_accesorios cac ON cac.cotizacion_id = ca.id
      LEFT JOIN accesorios_disponibles ad ON ad.id = cac.accesorio_id
      LEFT JOIN monedas mon ON ad.moneda_id = mon.id
      WHERE rd.id = ?
    `, [id]);

    if (data.length === 0) {
      return NextResponse.json(
        { message: "Detalle de reserva no encontrado" },
        { status: 404 }
      );
    }

    // ✅ Procesar datos y agrupar accesorios
    const accesorios = [];
    const reservaData = {};

    data.forEach((row, idx) => {
      // Copiar datos principales de la primera fila
      if (idx === 0) {
        Object.keys(row).forEach(key => {
          if (!key.includes('accesorio') && !key.includes('moneda')) {
            reservaData[key] = row[key];
          }
        });
      }

      // Agrupar accesorios (evitar duplicados)
      if (row.accesorio_id && row.numero_parte) {
        const accesorioExistente = accesorios.find(a => a.accesorio_id === row.accesorio_id);
        if (!accesorioExistente) {
          accesorios.push({
            accesorio_id: row.accesorio_id,
            accesorio_cotizacion_id: row.accesorio_cotizacion_id,
            numero_parte: row.numero_parte,
            detalle: row.accesorio_detalle,
            precio: row.accesorio_precio,
            moneda_id: row.moneda_id,
            moneda_nombre: row.moneda_nombre,
            moneda_simbolo: row.moneda_simbolo,
          });
        }
      }
    });

    return NextResponse.json({
      ...reservaData,
      accesorios: accesorios,
    });
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
    const body = await request.json();

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    // ✅ Verificar que el detalle de reserva existe
    const [detalleCheck] = await db.query(
      "SELECT rd.id, rd.oportunidad_id FROM reserva_detalles rd WHERE rd.id = ?",
      [id]
    );

    if (detalleCheck.length === 0) {
      return NextResponse.json(
        { message: "Detalle de reserva no encontrado" },
        { status: 404 }
      );
    }

    const oportunidadId = detalleCheck[0].oportunidad_id;

    // ✅ Verificar que la oportunidad existe y obtener cliente_id
    const [oportunidadCheck] = await db.query(
      "SELECT id, cliente_id FROM oportunidades WHERE id = ?",
      [oportunidadId]
    );

    if (oportunidadCheck.length === 0) {
      return NextResponse.json(
        { message: "Oportunidad no encontrada" },
        { status: 404 }
      );
    }

    const clienteId = oportunidadCheck[0].cliente_id;

    // ✅ Campos permitidos para actualizar en reserva_detalles
    const allowedFieldsDetalles = [
      "tipo_comprobante",
      "vin",
      "usovehiculo",
      "placa",
      "numero_motor",
      // ✅ NUEVOS CAMPOS DE DESCUENTO
      "dsctotienda",
      "dsctotiendaporcentaje",
      "dsctobonoretoma",
      "dsctonper",
      "cantidad",
      "precio_unitario",
      "flete",
      "tarjetaplaca",
      "glp",
      "tc_referencial",
      "total",
      "descripcion",
    ];

    // ✅ Campos permitidos para actualizar en clientes
    const allowedFieldsClientes = [
      "email",
      "celular",
      "fecha_nacimiento",
      "ocupacion",
      "domicilio",
      "departamento_id",
      "provincia_id",
      "distrito_id",
      "nombreconyugue",
      "dniconyugue",
    ];

    const updatesDetalles = [];
    const valuesDetalles = [];
    const updatesClientes = [];
    const valuesClientes = [];

    // ✅ Separar campos por tabla
    for (const [key, value] of Object.entries(body)) {
      if (allowedFieldsDetalles.includes(key)) {
        updatesDetalles.push(`${key} = ?`);
        valuesDetalles.push(value === "" ? null : value);
      } else if (allowedFieldsClientes.includes(key)) {
        updatesClientes.push(`${key} = ?`);
        valuesClientes.push(value === "" ? null : value);
      }
    }

    // ✅ Actualizar reserva_detalles si hay cambios
    if (updatesDetalles.length > 0) {
      valuesDetalles.push(id);

      const queryDetalles = `
        UPDATE reserva_detalles 
        SET ${updatesDetalles.join(", ")}, updated_at = NOW()
        WHERE id = ?
      `;

      const [resultDetalles] = await db.query(queryDetalles, valuesDetalles);

      console.log(`✅ Detalles actualizados: ${resultDetalles.affectedRows} fila(s)`);
    }

    // ✅ Actualizar clientes si hay cambios
    if (updatesClientes.length > 0) {
      valuesClientes.push(clienteId);

      const queryClientes = `
        UPDATE clientes 
        SET ${updatesClientes.join(", ")}
        WHERE id = ?
      `;

      const [resultClientes] = await db.query(queryClientes, valuesClientes);

      console.log(`✅ Cliente actualizado: ${resultClientes.affectedRows} fila(s)`);
    }

    // ✅ Si no hay campos para actualizar
    if (updatesDetalles.length === 0 && updatesClientes.length === 0) {
      return NextResponse.json(
        { message: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: "Detalle de reserva actualizado exitosamente",
      detalle_id: parseInt(id),
      updatedDetalles: updatesDetalles.length > 0,
      updatedCliente: updatesClientes.length > 0,
      detalles: {
        campos_detalles: updatesDetalles,
        campos_cliente: updatesClientes,
      },
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}