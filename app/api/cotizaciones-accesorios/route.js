// app/api/cotizaciones-accesorios/route.js

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function POST(req) {
  try {
    const {
      cotizacion_id,
      accesorio_id,
      cantidad,
      descuento_porcentaje,
      descuento_monto,
      notas,
      // ✅ Nuevos campos recibidos del frontend
      subtotal, // Este será el total_con_igv
      total_sin_igv,
      igv,
      total_con_igv,
      precio_unitario,
    } = await req.json();

    // ✅ Validar campos requeridos
    if (!cotizacion_id || !accesorio_id || !cantidad) {
      return NextResponse.json(
        { message: "Campos requeridos: cotizacion_id, accesorio_id, cantidad" },
        { status: 400 }
      );
    }

    // ✅ Validar cantidad sea positiva
    if (cantidad <= 0) {
      return NextResponse.json(
        { message: "La cantidad debe ser mayor a 0" },
        { status: 400 }
      );
    }

    // ✅ Obtener accesorio para validar y copiar moneda
    const [accesorio] = await db.query(
      `SELECT moneda_id FROM accesorios_disponibles WHERE id = ?`,
      [accesorio_id]
    );

    if (!accesorio || accesorio.length === 0) {
      return NextResponse.json(
        { message: "Accesorio no encontrado" },
        { status: 404 }
      );
    }

    const moneda_id = accesorio[0].moneda_id;

    // ✅ Si vienen valores del frontend, usarlos
    // Si no, calcular basándose en precio_unitario
    let final_precio_unitario;
    let final_subtotal; // Será el total_con_igv
    let final_descuento_porcentaje;
    let final_descuento_monto;
    let final_total; // Total después de descontar

    if (
      precio_unitario !== undefined &&
      total_con_igv !== undefined
    ) {
      // ✅ Usar valores calculados del frontend
      final_precio_unitario = parseFloat(precio_unitario);
      final_subtotal = parseFloat(total_con_igv); // ✅ El campo "subtotal" guarda total_con_igv
      final_descuento_porcentaje =
        descuento_porcentaje && parseFloat(descuento_porcentaje) > 0
          ? parseFloat(descuento_porcentaje)
          : null;
      final_descuento_monto =
        descuento_monto && parseFloat(descuento_monto) > 0
          ? parseFloat(descuento_monto)
          : null;
      
      // ✅ Calcular el total restando descuentos
      const total_descuentos = (final_descuento_monto || 0);
      final_total = final_subtotal - total_descuentos;
    } else {
      // ✅ Calcular en el servidor (fallback)
      const [acc_data] = await db.query(
        `SELECT precio FROM accesorios_disponibles WHERE id = ?`,
        [accesorio_id]
      );

      final_precio_unitario = parseFloat(acc_data[0].precio);
      const subtotal_sin_igv = cantidad * final_precio_unitario;

      let desc_monto = 0;
      let desc_porcentaje = null;

      if (descuento_porcentaje && parseFloat(descuento_porcentaje) > 0) {
        desc_porcentaje = parseFloat(descuento_porcentaje);
        desc_monto = subtotal_sin_igv * (desc_porcentaje / 100);
      } else if (descuento_monto && parseFloat(descuento_monto) > 0) {
        desc_monto = parseFloat(descuento_monto);
      }

      final_descuento_porcentaje = desc_porcentaje;
      final_descuento_monto = desc_monto > 0 ? desc_monto : null;
      
      const total_sin_igv_calc = subtotal_sin_igv - desc_monto;
      const igv_calc = total_sin_igv_calc * 0.18;
      final_subtotal = total_sin_igv_calc + igv_calc; // ✅ total_con_igv
      final_total = final_subtotal - (desc_monto || 0);
    }

    // ✅ Validar que el descuento no sea mayor que el subtotal
    if ((final_descuento_monto || 0) > final_subtotal) {
      return NextResponse.json(
        { message: "El descuento no puede ser mayor que el subtotal" },
        { status: 400 }
      );
    }

    // ✅ Insertar con valores congelados
    const [result] = await db.query(
      `INSERT INTO cotizaciones_accesorios 
       (cotizacion_id, accesorio_id, cantidad, precio_unitario, moneda_id, subtotal, descuento_porcentaje, descuento_monto, total, notas)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cotizacion_id,
        accesorio_id,
        cantidad,
        final_precio_unitario,
        moneda_id,
        final_subtotal, // ✅ total_con_igv
        final_descuento_porcentaje,
        final_descuento_monto,
        final_total, // ✅ total_con_igv - descuento
        notas || null,
      ]
    );

    return NextResponse.json(
      {
        message: "Accesorio agregado a cotización",
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

// ✅ GET todos los accesorios de una cotización
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const cotizacion_id = searchParams.get("cotizacion_id");

    if (!cotizacion_id) {
      return NextResponse.json(
        { message: "cotizacion_id es requerido" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      `SELECT 
        ca.id,
        ca.cotizacion_id,
        ca.accesorio_id,
        ca.cantidad,
        ca.precio_unitario,
        ca.moneda_id,
        ca.subtotal,
        ca.descuento_porcentaje,
        ca.descuento_monto,
        ca.total,
        ca.notas,
        ca.created_at,
        ca.updated_at,
        aa.detalle,
        aa.numero_parte,
        m.codigo as moneda_codigo,
        m.nombre as moneda_nombre,
        m.simbolo as moneda_simbolo
       FROM cotizaciones_accesorios ca
       INNER JOIN accesorios_disponibles aa ON ca.accesorio_id = aa.id
       INNER JOIN monedas m ON ca.moneda_id = m.id
       WHERE ca.cotizacion_id = ?
       ORDER BY ca.created_at DESC`,
      [cotizacion_id]
    );

    // ✅ Formatear números
    const rowsFormateados = rows.map(row => ({
      ...row,
      cantidad: parseInt(row.cantidad),
      precio_unitario: parseFloat(row.precio_unitario),
      subtotal: parseFloat(row.subtotal), // ✅ total_con_igv
      descuento_porcentaje: row.descuento_porcentaje ? parseFloat(row.descuento_porcentaje) : null,
      descuento_monto: row.descuento_monto ? parseFloat(row.descuento_monto) : 0,
      total: parseFloat(row.total), // ✅ total_con_igv - descuento
    }));

    return NextResponse.json(rowsFormateados);
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

// ✅ PUT para actualizar un accesorio en cotización
export async function PUT(req) {
  try {
    const {
      id,
      cantidad,
      descuento_porcentaje,
      descuento_monto,
      notas,
    } = await req.json();

    if (!id) {
      return NextResponse.json(
        { message: "ID es requerido" },
        { status: 400 }
      );
    }

    if (cantidad && cantidad <= 0) {
      return NextResponse.json(
        { message: "La cantidad debe ser mayor a 0" },
        { status: 400 }
      );
    }

    // ✅ Obtener registro actual
    const [current] = await db.query(
      `SELECT precio_unitario, cantidad as cantidad_actual, subtotal FROM cotizaciones_accesorios WHERE id = ?`,
      [id]
    );

    if (!current || current.length === 0) {
      return NextResponse.json(
        { message: "Registro no encontrado" },
        { status: 404 }
      );
    }

    const precio_unitario = parseFloat(current[0].precio_unitario);
    const nueva_cantidad = cantidad || current[0].cantidad_actual;
    
    // ✅ El subtotal actual ya es total_con_igv, recalculamos proporcionalmente
    const subtotal_anterior = parseFloat(current[0].subtotal);
    const cantidad_anterior = current[0].cantidad_actual;
    
    // Proporción: si cambió la cantidad, ajustamos
    const precio_con_igv_unitario = subtotal_anterior / cantidad_anterior;
    const nuevo_subtotal = nueva_cantidad * precio_con_igv_unitario; // ✅ total_con_igv

    // ✅ Calcular descuento
    let desc_monto = 0;
    let desc_porcentaje = null;

    if (descuento_porcentaje !== undefined && descuento_porcentaje > 0) {
      desc_porcentaje = parseFloat(descuento_porcentaje);
      desc_monto = nuevo_subtotal * (desc_porcentaje / 100);
    } else if (descuento_monto !== undefined && descuento_monto > 0) {
      desc_monto = parseFloat(descuento_monto);
    }

    const total = nuevo_subtotal - desc_monto; // ✅ total_con_igv - descuento

    // ✅ Validar que el descuento no sea mayor que el subtotal
    if (desc_monto > nuevo_subtotal) {
      return NextResponse.json(
        { message: "El descuento no puede ser mayor que el subtotal" },
        { status: 400 }
      );
    }

    // ✅ Actualizar registro
    const [result] = await db.query(
      `UPDATE cotizaciones_accesorios
       SET cantidad = ?,
           subtotal = ?,
           descuento_porcentaje = ?,
           descuento_monto = ?,
           total = ?,
           notas = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [
        nueva_cantidad,
        nuevo_subtotal, // ✅ total_con_igv
        desc_porcentaje || null,
        desc_monto > 0 ? desc_monto : null,
        total, // ✅ total_con_igv - descuento
        notas !== undefined ? notas : null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Error al actualizar" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: "Accesorio actualizado",
      id,
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}

// ✅ DELETE para eliminar un accesorio de una cotización
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { message: "ID es requerido" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      `DELETE FROM cotizaciones_accesorios WHERE id = ?`,
      [id]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Registro no encontrado" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: "Accesorio eliminado",
      id,
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error: " + e.message },
      { status: 500 }
    );
  }
}