import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* =========================
   PUT: actualizar configuración de estado de tiempo
========================= */
export async function PUT(req, { params }) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const body = await req.json();
    const { id: paramId } = await params;
    const id = Number(paramId);

    if (!id) {
      await conn.rollback();
      return NextResponse.json(
        { message: "id es obligatorio" },
        { status: 400 }
      );
    }

    const nombre = body.nombre?.trim();
    const estado = body.estado?.trim();
    const minutos_desde = body.minutos_desde !== undefined ? Number(body.minutos_desde) : null;
    const minutos_hasta = body.minutos_hasta !== undefined ? Number(body.minutos_hasta) : null;
    const color_hexadecimal = body.color_hexadecimal?.trim();
    const descripcion = body.descripcion?.trim() || null;
    const activo = body.activo !== undefined ? Number(body.activo) : null;

    // Verificar que el registro existe
    const [existe] = await conn.query(
      `SELECT id FROM configuracion_estados_tiempo WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!existe.length) {
      await conn.rollback();
      return NextResponse.json(
        { message: "La configuración no existe" },
        { status: 404 }
      );
    }

    // Validar que el estado sea único (si se intenta cambiar)
    if (estado) {
      const [estadoExistente] = await conn.query(
        `SELECT id FROM configuracion_estados_tiempo WHERE estado = ? AND id != ? LIMIT 1`,
        [estado, id]
      );

      if (estadoExistente.length) {
        await conn.rollback();
        return NextResponse.json(
          { message: "El estado ya existe" },
          { status: 400 }
        );
      }
    }

    // Validar rango de minutos si se actualizan
    if (minutos_desde !== null && minutos_hasta !== null) {
      if (minutos_desde > minutos_hasta) {
        await conn.rollback();
        return NextResponse.json(
          { message: "minutos_desde no puede ser mayor que minutos_hasta" },
          { status: 400 }
        );
      }
    }

    // Construir query dinámico según lo que se quiera actualizar
    const updates = [];
    const updateParams = [];

    if (nombre) {
      updates.push(`nombre = ?`);
      updateParams.push(nombre);
    }

    if (estado) {
      updates.push(`estado = ?`);
      updateParams.push(estado);
    }

    if (minutos_desde !== null) {
      updates.push(`minutos_desde = ?`);
      updateParams.push(minutos_desde);
    }

    if (minutos_hasta !== null) {
      updates.push(`minutos_hasta = ?`);
      updateParams.push(minutos_hasta);
    }

    if (color_hexadecimal) {
      updates.push(`color_hexadecimal = ?`);
      updateParams.push(color_hexadecimal);
    }

    if (descripcion !== null) {
      updates.push(`descripcion = ?`);
      updateParams.push(descripcion);
    }

    if (activo !== null) {
      updates.push(`activo = ?`);
      updateParams.push(activo);
    }

    if (updates.length === 0) {
      await conn.rollback();
      return NextResponse.json(
        { message: "No hay campos para actualizar" },
        { status: 400 }
      );
    }

    updateParams.push(id);

    const query = `
      UPDATE configuracion_estados_tiempo
      SET ${updates.join(", ")}
      WHERE id = ?
    `;

    await conn.query(query, updateParams);

    await conn.commit();

    return NextResponse.json({
      message: "Configuración de estado de tiempo actualizada",
      id: id,
    });
  } catch (error) {
    await conn.rollback();
    console.error("PUT /api/configuracion-estados-tiempo/[id] error:", error);
    return NextResponse.json(
      {
        message: "Error al actualizar configuración",
        error: error.message,
      },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}

/* =========================
   DELETE: eliminar (desactivar) configuración de estado de tiempo
========================= */
export async function DELETE(req, { params }) {
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    const { id: paramId } = await params;
    const id = Number(paramId);

    if (!id) {
      await conn.rollback();
      return NextResponse.json(
        { message: "id es obligatorio" },
        { status: 400 }
      );
    }

    // Verificar que el registro existe
    const [existe] = await conn.query(
      `SELECT id FROM configuracion_estados_tiempo WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!existe.length) {
      await conn.rollback();
      return NextResponse.json(
        { message: "La configuración no existe" },
        { status: 404 }
      );
    }

    // Desactivar en lugar de eliminar
    await conn.query(
      `UPDATE configuracion_estados_tiempo SET activo = 0 WHERE id = ?`,
      [id]
    );

    await conn.commit();

    return NextResponse.json({
      message: "Configuración de estado de tiempo eliminada",
      id: id,
    });
  } catch (error) {
    await conn.rollback();
    console.error("DELETE /api/configuracion-estados-tiempo/[id] error:", error);
    return NextResponse.json(
      {
        message: "Error al eliminar configuración",
        error: error.message,
      },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}