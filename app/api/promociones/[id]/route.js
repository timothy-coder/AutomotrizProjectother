// ============================================
// API DE PROMOCIONES - ID
// archivo: app/api/promociones/[id]/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener una promoción por ID
// ============================================
export async function GET(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de promoción inválido" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      `SELECT 
        p.*,
        tp.nombre as tipo_promocion_nombre
      FROM promociones p
      LEFT JOIN tipos_promociones tp ON tp.id = p.tipos_promociones_id
      WHERE p.id = ?`,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Promoción no encontrada" },
        { status: 404 }
      );
    }

    const promo = rows[0];
    const hoy = new Date().toISOString().split("T")[0];

    return NextResponse.json({
      ...promo,
      disponibles: promo.limite_unidades
        ? promo.limite_unidades - promo.unidades_usadas
        : null,
      porcentajeUso:
        promo.limite_unidades && promo.limite_unidades > 0
          ? Math.round((promo.unidades_usadas / promo.limite_unidades) * 100)
          : null,
      estado: getEstadoPromocion(promo, hoy),
    });
  } catch (error) {
    console.error("GET /api/promociones/[id] error:", error);
    return NextResponse.json(
      { message: "Error al obtener promoción", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// PUT: Actualizar promoción
// ============================================
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const {
      nombre,
      descripcion,
      tipos_promociones_id,
      descuento_porcentaje,
      descuento_monto,
      condiciones,
      vigente_desde,
      vigente_hasta,
      limite_unidades,
      es_activo,
    } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de promoción inválido" },
        { status: 400 }
      );
    }

    // Validaciones
    if (!nombre || nombre.trim() === "") {
      return NextResponse.json(
        { message: "El nombre de la promoción es obligatorio" },
        { status: 400 }
      );
    }

    if (!tipos_promociones_id || isNaN(tipos_promociones_id)) {
      return NextResponse.json(
        { message: "El tipo de promoción es obligatorio" },
        { status: 400 }
      );
    }

    if (!vigente_desde || !vigente_hasta) {
      return NextResponse.json(
        { message: "Las fechas de vigencia son obligatorias" },
        { status: 400 }
      );
    }

    if (vigente_desde > vigente_hasta) {
      return NextResponse.json(
        { message: "La fecha de inicio no puede ser posterior a la fecha de fin" },
        { status: 400 }
      );
    }

    if (
      (!descuento_porcentaje || descuento_porcentaje === "") &&
      (!descuento_monto || descuento_monto === "")
    ) {
      return NextResponse.json(
        { message: "Debe especificar un descuento (porcentaje o monto)" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id FROM promociones WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Promoción no encontrada" },
        { status: 404 }
      );
    }

    // Verificar que el tipo de promoción existe
    const [tipoPromo] = await db.query(
      "SELECT id FROM tipos_promociones WHERE id = ?",
      [tipos_promociones_id]
    );

    if (tipoPromo.length === 0) {
      return NextResponse.json(
        { message: "El tipo de promoción especificado no existe" },
        { status: 404 }
      );
    }

    // Verificar que no exista otro con el mismo nombre
    const [duplicate] = await db.query(
      "SELECT id FROM promociones WHERE nombre = ? AND id != ?",
      [nombre.trim(), id]
    );

    if (duplicate.length > 0) {
      return NextResponse.json(
        { message: "Ya existe otra promoción con este nombre" },
        { status: 409 }
      );
    }

    await db.query(
      `UPDATE promociones 
      SET nombre = ?, descripcion = ?, tipos_promociones_id = ?, 
          descuento_porcentaje = ?, descuento_monto = ?, condiciones = ?,
          vigente_desde = ?, vigente_hasta = ?, limite_unidades = ?,
          es_activo = ? 
      WHERE id = ?`,
      [
        nombre.trim(),
        descripcion || null,
        tipos_promociones_id,
        descuento_porcentaje || null,
        descuento_monto || null,
        condiciones || null,
        vigente_desde,
        vigente_hasta,
        limite_unidades || null,
        es_activo !== undefined ? es_activo : true,
        id,
      ]
    );

    return NextResponse.json({
      message: "Promoción actualizada exitosamente",
      id,
    });
  } catch (error) {
    console.error("PUT /api/promociones/[id] error:", error);
    return NextResponse.json(
      { message: "Error al actualizar promoción", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar promoción
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de promoción inválido" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT id, nombre FROM promociones WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Promoción no encontrada" },
        { status: 404 }
      );
    }

    // Verificar si está siendo usada en otras tablas
    const [marcasCount] = await db.query(
      "SELECT COUNT(*) as count FROM promociones_marcas WHERE promocion_id = ?",
      [id]
    );

    const [modelosCount] = await db.query(
      "SELECT COUNT(*) as count FROM promociones_modelos WHERE promocion_id = ?",
      [id]
    );

    const [versionesCount] = await db.query(
      "SELECT COUNT(*) as count FROM promociones_versiones WHERE promocion_id = ?",
      [id]
    );

    const [departamentosCount] = await db.query(
      "SELECT COUNT(*) as count FROM promociones_departamentos WHERE promocion_id = ?",
      [id]
    );

    const [provinciasCount] = await db.query(
      "SELECT COUNT(*) as count FROM promociones_provincias WHERE promocion_id = ?",
      [id]
    );

    const [distritosCount] = await db.query(
      "SELECT COUNT(*) as count FROM promociones_distritos WHERE promocion_id = ?",
      [id]
    );

    const totalRelaciones =
      (marcasCount[0]?.count || 0) +
      (modelosCount[0]?.count || 0) +
      (versionesCount[0]?.count || 0) +
      (departamentosCount[0]?.count || 0) +
      (provinciasCount[0]?.count || 0) +
      (distritosCount[0]?.count || 0);

    if (totalRelaciones > 0) {
      return NextResponse.json(
        {
          message: "No se puede eliminar. Esta promoción está siendo usado en relaciones",
        },
        { status: 409 }
      );
    }

    await db.query("DELETE FROM promociones WHERE id = ?", [id]);

    return NextResponse.json({
      message: "Promoción eliminada exitosamente",
      id,
      nombre: existing[0].nombre,
    });
  } catch (error) {
    console.error("DELETE /api/promociones/[id] error:", error);
    return NextResponse.json(
      { message: "Error al eliminar promoción", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// Función auxiliar para obtener estado
// ============================================
function getEstadoPromocion(promo, hoy) {
  if (!promo.es_activo) return "inactiva";
  if (promo.vigente_desde > hoy) return "proxima";
  if (promo.vigente_hasta < hoy) return "vencida";
  return "activa";
}

// ============================================
// PUT: Incrementar unidades usadas
// archivo: app/api/promociones/[id]/incrementar-uso/route.js
// ============================================

export async function PUT_INCREMENTAR(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();
    const { cantidad = 1 } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de promoción inválido" },
        { status: 400 }
      );
    }

    // Verificar que existe
    const [existing] = await db.query(
      "SELECT unidades_usadas, limite_unidades FROM promociones WHERE id = ?",
      [id]
    );

    if (existing.length === 0) {
      return NextResponse.json(
        { message: "Promoción no encontrada" },
        { status: 404 }
      );
    }

    const promocion = existing[0];
    const nuevasUnidades = promocion.unidades_usadas + cantidad;

    if (
      promocion.limite_unidades &&
      nuevasUnidades > promocion.limite_unidades
    ) {
      return NextResponse.json(
        { message: "Se ha excedido el límite de unidades de esta promoción" },
        { status: 400 }
      );
    }

    await db.query(
      "UPDATE promociones SET unidades_usadas = ? WHERE id = ?",
      [nuevasUnidades, id]
    );

    return NextResponse.json({
      message: "Unidades usadas incrementadas",
      id,
      unidades_usadas: nuevasUnidades,
    });
  } catch (error) {
    console.error("PUT /api/promociones/[id]/incrementar-uso error:", error);
    return NextResponse.json(
      { message: "Error al incrementar uso", error: error.message },
      { status: 500 }
    );
  }
}