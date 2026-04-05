import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

function normalizarIds(arr) {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map(Number).filter((id) => Number.isInteger(id) && id > 0))];
}

/* =========================
   GET: obtener usuario por id con roles
========================= */
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const [rows] = await db.query(
      `
      SELECT
        u.id,
        u.fullname,
        u.username,
        u.email,
        u.phone,
        u.role_id,
        r.name as role_name,
        r.description as role_description,
        u.is_active,
        u.permissions,
        u.work_schedule,
        u.created_at,
        u.color,

        (
          SELECT GROUP_CONCAT(DISTINCT um.mostrador_id ORDER BY um.mostrador_id ASC)
          FROM usuario_mostradores um
          WHERE um.usuario_id = u.id
        ) AS mostradores,

        (
          SELECT GROUP_CONCAT(DISTINCT uc.centro_id ORDER BY uc.centro_id ASC)
          FROM usuario_centros uc
          WHERE uc.usuario_id = u.id
        ) AS centros,

        (
          SELECT GROUP_CONCAT(DISTINCT ut.taller_id ORDER BY ut.taller_id ASC)
          FROM usuario_talleres ut
          WHERE ut.usuario_id = u.id
        ) AS talleres

      FROM usuarios u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
      LIMIT 1
      `,
      [id]
    );

    if (!rows.length) {
      return NextResponse.json({ message: "Usuario no encontrado" }, { status: 404 });
    }

    const row = rows[0];

    return NextResponse.json({
      ...row,
      mostradores: row.mostradores ? row.mostradores.split(",").map(Number) : [],
      centros: row.centros ? row.centros.split(",").map(Number) : [],
      talleres: row.talleres ? row.talleres.split(",").map(Number) : [],
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ message: "Error al obtener usuario" }, { status: 500 });
  }
}

/* =========================
   PUT: actualizar usuario + relaciones + role_id
========================= */
export async function PUT(req, { params }) {
  let connection;

  try {
    const { id } = await params;
    const body = await req.json();

    const fullname = (body.fullname || "").trim();
    const username = (body.username || "").trim();
    const email = (body.email || "").trim();
    const phone = (body.phone || "").trim();
    const role_id = body.role_id || null;
    const color = body.color ?? "#5e17eb";
    const is_active = body.is_active ?? 1;
    const password = body.password || "";

    const mostradores = normalizarIds(body.mostradores);
    const centros = normalizarIds(body.centros);
    const talleres = normalizarIds(body.talleres);

    const permissions =
      body.permissions == null
        ? null
        : typeof body.permissions === "string"
        ? body.permissions
        : JSON.stringify(body.permissions);

    const work_schedule =
      body.work_schedule == null
        ? null
        : typeof body.work_schedule === "string"
        ? body.work_schedule
        : JSON.stringify(body.work_schedule);

    /* =========================
       VALIDACIONES
    ========================= */
    if (!fullname || !username) {
      return NextResponse.json(
        { message: "Nombre y usuario son obligatorios" },
        { status: 400 }
      );
    }

    if (password && String(password).trim().length > 0 && String(password).trim().length < 6) {
      return NextResponse.json(
        { message: "La contraseña debe tener mínimo 6 caracteres" },
        { status: 400 }
      );
    }

    if (email && !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json(
        { message: "Email inválido" },
        { status: 400 }
      );
    }

    connection = await db.getConnection();
    await connection.beginTransaction();

    /* =========================
       Verificar que el usuario existe
    ========================= */
    const [exists] = await connection.query(
      `SELECT id FROM usuarios WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!exists.length) {
      await connection.rollback();
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    /* =========================
       Verificar duplicados de username y email
    ========================= */
    const [dup] = await connection.query(
      `
      SELECT id
      FROM usuarios
      WHERE (username = ? OR (email IS NOT NULL AND email = ?))
        AND id <> ?
      LIMIT 1
      `,
      [username, email || null, id]
    );

    if (dup.length > 0) {
      await connection.rollback();
      return NextResponse.json(
        { message: "Usuario o email ya existen" },
        { status: 409 }
      );
    }

    /* =========================
       Validar que role_id existe (si se proporciona)
    ========================= */
    if (role_id) {
      const [roleExists] = await connection.query(
        `SELECT id FROM roles WHERE id = ?`,
        [role_id]
      );

      if (roleExists.length === 0) {
        await connection.rollback();
        return NextResponse.json(
          { message: "El rol especificado no existe" },
          { status: 400 }
        );
      }
    }

    /* =========================
       Hashear contraseña si se proporciona
    ========================= */
    let password_hash = null;
    if (password && String(password).trim().length > 0) {
      password_hash = await bcrypt.hash(password, 10);
    }

    /* =========================
       UPDATE USUARIO
    ========================= */
    await connection.query(
      `
      UPDATE usuarios SET
        role_id = ?,
        fullname = ?,
        username = ?,
        email = ?,
        phone = ?,
        is_active = ?,
        permissions = ?,
        work_schedule = ?,
        color = ?,
        password_hash = IFNULL(?, password_hash)
      WHERE id = ?
      `,
      [
        role_id,
        fullname,
        username,
        email || null,
        phone || null,
        is_active ? 1 : 0,
        permissions,
        work_schedule,
        color,
        password_hash,
        id,
      ]
    );

    /* =========================
       REEMPLAZAR RELACIONES
    ========================= */
    await connection.query(
      `DELETE FROM usuario_mostradores WHERE usuario_id = ?`,
      [id]
    );
    await connection.query(
      `DELETE FROM usuario_centros WHERE usuario_id = ?`,
      [id]
    );
    await connection.query(
      `DELETE FROM usuario_talleres WHERE usuario_id = ?`,
      [id]
    );

    for (const mostrador_id of mostradores) {
      await connection.query(
        `
        INSERT INTO usuario_mostradores (usuario_id, mostrador_id)
        VALUES (?, ?)
        `,
        [id, mostrador_id]
      );
    }

    for (const centro_id of centros) {
      await connection.query(
        `
        INSERT INTO usuario_centros (usuario_id, centro_id)
        VALUES (?, ?)
        `,
        [id, centro_id]
      );
    }

    for (const taller_id of talleres) {
      await connection.query(
        `
        INSERT INTO usuario_talleres (usuario_id, taller_id)
        VALUES (?, ?)
        `,
        [id, taller_id]
      );
    }

    await connection.commit();

    return NextResponse.json(
      { message: "✓ Usuario actualizado exitosamente", id: parseInt(id) },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);

    if (connection) {
      await connection.rollback();
    }

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return NextResponse.json(
        { message: "Uno de los mostradores, centros o talleres no existe" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Error al actualizar usuario" },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}

/* =========================
   DELETE: eliminar usuario con transacción
========================= */
export async function DELETE(req, { params }) {
  let connection;

  try {
    const { id } = await params;

    connection = await db.getConnection();
    await connection.beginTransaction();

    /* =========================
       Verificar que el usuario existe
    ========================= */
    const [exists] = await connection.query(
      `SELECT id FROM usuarios WHERE id = ? LIMIT 1`,
      [id]
    );

    if (!exists.length) {
      await connection.rollback();
      return NextResponse.json(
        { message: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    /* =========================
       Eliminar relaciones (por seguridad, aunque hay ON DELETE CASCADE)
    ========================= */
    await connection.query(
      `DELETE FROM usuario_mostradores WHERE usuario_id = ?`,
      [id]
    );
    await connection.query(
      `DELETE FROM usuario_centros WHERE usuario_id = ?`,
      [id]
    );
    await connection.query(
      `DELETE FROM usuario_talleres WHERE usuario_id = ?`,
      [id]
    );

    /* =========================
       Eliminar usuario
    ========================= */
    await connection.query(
      `DELETE FROM usuarios WHERE id = ?`,
      [id]
    );

    await connection.commit();

    return NextResponse.json(
      { message: "✓ Usuario eliminado exitosamente" },
      { status: 200 }
    );
  } catch (error) {
    console.error(error);

    if (connection) {
      await connection.rollback();
    }

    return NextResponse.json(
      { message: "Error al eliminar usuario" },
      { status: 500 }
    );
  } finally {
    if (connection) connection.release();
  }
}