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

    const [data] = await db.query(`
      SELECT 
        rd.id,
        rd.reserva_id,
        rd.cotizacion_id,
        rd.oportunidad_id,
        rd.tipo_comprobante,
        rd.vin,
        rd.vin_existe,
        rd.usovehiculo,
        rd.placa,
        rd.numero_motor,
        -- ✅ NUEVOS CAMPOS
        rd.dsctotienda,
        rd.dsctotiendaporcentaje,
        rd.dsctobonoretoma,
        rd.dsctonper,
        rd.cantidad,
        rd.precio_unitario,
        rd.flete,
        rd.cuota_inicial,
        rd.tarjetaplaca,
        rd.glp,
        rd.tc_referencial,
        rd.total,
        rd.descripcion,
        rd.created_at,
        rd.updated_at,
        c.id AS cliente_id,
        c.nombre AS cliente_nombre,
        c.apellido AS cliente_apellido,
        c.email AS cliente_email,
        c.celular AS cliente_celular,
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
        d.nombre AS departamento_nombre,
        p.nombre AS provincia_nombre,
        dist.nombre AS distrito_nombre
      FROM reserva_detalles rd
      LEFT JOIN oportunidades o ON o.id = rd.oportunidad_id
      LEFT JOIN clientes c ON c.id = o.cliente_id
      LEFT JOIN departamentos d ON d.id = c.departamento_id
      LEFT JOIN provincias p ON p.id = c.provincia_id
      LEFT JOIN distritos dist ON dist.id = c.distrito_id
      WHERE rd.id = ?
    `, [id]);

    if (data.length === 0) {
      return NextResponse.json(
        { message: "Detalle de reserva no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json(data[0]);
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

    // ✅ Verificar que la oportunidad existe
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
      "vin_existe",
      "usovehiculo",
      "placa",
      "numero_motor",
      // ✅ NUEVOS CAMPOS (sin dsctocredinissan)
      "dsctotienda",
      "dsctotiendaporcentaje",
      "dsctobonoretoma",
      "dsctonper",
      "cantidad",
      "precio_unitario",
      "flete",
      "cuota_inicial",
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
        // ✅ Para booleanos, mantener el valor tal cual
        if (key === "vin_existe") {
          valuesDetalles.push(value === true || value === "true" || value === 1 ? 1 : 0);
        } else {
          valuesDetalles.push(value === "" ? null : value);
        }
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
      id: parseInt(id),
      updatedDetalles: updatesDetalles.length > 0,
      updatedCliente: updatesClientes.length > 0,
      campos_actualizados: {
        detalles: updatesDetalles,
        cliente: updatesClientes,
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

export async function DELETE(request, { params }) {
  try {
    const { id } = await params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    // ✅ Verificar que el detalle existe
    const [detalleCheck] = await db.query(
      "SELECT id FROM reserva_detalles WHERE id = ?",
      [id]
    );

    if (detalleCheck.length === 0) {
      return NextResponse.json(
        { message: "Detalle de reserva no encontrado" },
        { status: 404 }
      );
    }

    // ✅ Eliminar detalle
    const [result] = await db.query(
      "DELETE FROM reserva_detalles WHERE id = ?",
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Error al eliminar el detalle" },
        { status: 500 }
      );
    }

    console.log(`✅ Detalle eliminado: ${id}`);

    return NextResponse.json({
      message: "Detalle de reserva eliminado exitosamente",
      id: parseInt(id),
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}