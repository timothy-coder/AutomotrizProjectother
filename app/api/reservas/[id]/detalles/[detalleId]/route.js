// api/reserva-detalles/[id]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const {
      // Datos de reserva_detalles
      tipo_comprobante,
      vin,
      usovehiculo,
      numero_motor,
      dsctotienda,
      dsctotiendaporcentaje,
      dsctobonoretoma,
      dsctonper,
      glp,
      tarjetaplaca,
      flete,
      cantidad,
      precio_unitario,
      total,
      tc_referencial,
      // Datos de clientes
      email,
      celular,
      fecha_nacimiento,
      ocupacion,
      domicilio,
      departamento_id,
      provincia_id,
      distrito_id,
      nombreconyugue,
      dniconyugue,
      // Datos de cotizacionesagenda
      color_externo,
      color_interno,
      // Campos opcionales
      descripcion,
      observaciones,
    } = await req.json();

    // ✅ Validar ID
    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    // ✅ Verificar que el detalle de reserva existe
    const [detalleCheck] = await db.query(
      "SELECT id, oportunidad_id, cotizacion_id FROM reserva_detalles WHERE id = ?",
      [id]
    );

    if (detalleCheck.length === 0) {
      return NextResponse.json(
        { message: "Detalle de reserva no encontrado" },
        { status: 404 }
      );
    }

    const { oportunidad_id, cotizacion_id } = detalleCheck[0];

    // ✅ Obtener cliente_id de la oportunidad
    const [oportunidadCheck] = await db.query(
      "SELECT cliente_id FROM oportunidades WHERE id = ?",
      [oportunidad_id]
    );

    if (oportunidadCheck.length === 0) {
      return NextResponse.json(
        { message: "Oportunidad no encontrada" },
        { status: 404 }
      );
    }

    const clienteId = oportunidadCheck[0].cliente_id;

    // ✅ USAR descripcion O observaciones (lo que venga del frontend)
    const finalDescripcion = descripcion || observaciones || null;

    // ✅ Actualizar reserva_detalles CON NUEVOS CAMPOS
    const [updateDetalles] = await db.query(
      `UPDATE reserva_detalles 
       SET tipo_comprobante = ?,
           vin = ?,
           usovehiculo = ?,
           numero_motor = ?,
           dsctotienda = ?,
           dsctotiendaporcentaje = ?,
           dsctobonoretoma = ?,
           dsctonper = ?,
           glp = ?,
           tarjetaplaca = ?,
           flete = ?,
           cantidad = ?,
           precio_unitario = ?,
           total = ?,
           tc_referencial = ?,
           descripcion = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [
        tipo_comprobante || null,
        vin || null,
        usovehiculo || null,
        numero_motor || null,
        dsctotienda || 0,
        dsctotiendaporcentaje || null,
        dsctobonoretoma || 0,
        dsctonper || 0,
        glp || 0,
        tarjetaplaca || 0,
        flete || 0,
        cantidad || 1,
        precio_unitario || 0,
        total || null,
        tc_referencial || null,
        finalDescripcion,
        id,
      ]
    );

    // ✅ Actualizar clientes (datos personales) CON email Y celular
    const [updateClientes] = await db.query(
      `UPDATE clientes 
       SET email = ?,
           celular = ?,
           fecha_nacimiento = ?,
           ocupacion = ?,
           domicilio = ?,
           departamento_id = ?,
           provincia_id = ?,
           distrito_id = ?,
           nombreconyugue = ?,
           dniconyugue = ?
       WHERE id = ?`,
      [
        email || null,
        celular || null,
        fecha_nacimiento || null,
        ocupacion || null,
        domicilio || null,
        departamento_id || null,
        provincia_id || null,
        distrito_id || null,
        nombreconyugue || null,
        dniconyugue || null,
        clienteId,
      ]
    );

    // ✅ Actualizar cotizacionesagenda (datos del vehículo)
    const [updateCotizacion] = await db.query(
      `UPDATE cotizacionesagenda 
       SET color_externo = ?,
           color_interno = ?
       WHERE id = ?`,
      [
        color_externo || null,
        color_interno || null,
        cotizacion_id,
      ]
    );

    // ✅ Verificar si al menos una actualización fue exitosa
    if (
      updateDetalles.affectedRows === 0 &&
      updateClientes.affectedRows === 0 &&
      updateCotizacion.affectedRows === 0
    ) {
      return NextResponse.json(
        { message: "No se realizaron cambios" },
        { status: 400 }
      );
    }

    console.log("✅ Actualización exitosa");
    console.log("Detalles actualizados:", updateDetalles.affectedRows);
    console.log("Cliente actualizado:", updateClientes.affectedRows);
    console.log("Cotización actualizada:", updateCotizacion.affectedRows);

    return NextResponse.json({
      message: "Detalle actualizado exitosamente",
      id: parseInt(id),
      updates: {
        detalles: updateDetalles.affectedRows > 0,
        cliente: updateClientes.affectedRows > 0,
        cotizacion: updateCotizacion.affectedRows > 0,
      },
    });
  } catch (e) {
    console.error("Error en PUT /api/reserva-detalles/[id]:", e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    // ✅ Validar ID
    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    // ✅ Verificar que el detalle existe
    const [detalleCheck] = await db.query(
      "SELECT id, reserva_id FROM reserva_detalles WHERE id = ?",
      [id]
    );

    if (detalleCheck.length === 0) {
      return NextResponse.json(
        { message: "Detalle de reserva no encontrado" },
        { status: 404 }
      );
    }

    const reservaId = detalleCheck[0].reserva_id;

    // ✅ Eliminar reserva_detalles
    const [result] = await db.query(
      `DELETE FROM reserva_detalles WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Error al eliminar el detalle" },
        { status: 500 }
      );
    }

    console.log("✅ Detalle eliminado:", id);

    return NextResponse.json({
      message: "Detalle eliminado exitosamente",
      id: parseInt(id),
      reserva_id: reservaId,
    });
  } catch (e) {
    console.error("Error en DELETE /api/reserva-detalles/[id]:", e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}