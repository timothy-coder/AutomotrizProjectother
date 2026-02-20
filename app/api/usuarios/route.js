import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

/* =========================
   GET: listar usuarios
=========================*/
export async function GET() {
  try {
    const [rows] = await db.query(`
      SELECT
        id,
        fullname,
        username,
        email,
        phone,
        role,
        is_active,
        permissions,
        work_schedule,
        created_at,
        color
      FROM usuarios
      ORDER BY id DESC
    `);

    return NextResponse.json(rows);
  } catch (error) {
    return NextResponse.json({ message: "Error al listar" }, { status: 500 });
  }
}

/* =========================
   POST: crear usuario
=========================*/
export async function POST(req) {
  try {
    const body = await req.json();

    const fullname = (body.fullname || "").trim();
    const username = (body.username || "").trim();
    const email = (body.email || "").trim();
    const phone = (body.phone || "").trim();
    const role = body.role || "user";
    const color = body.color ?? null;
    const is_active = body.is_active ?? 1;
    const password = body.password || "";

    // convertir objetos a JSON si vienen como objeto
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
    ==========================*/

    if (!fullname || !username || !password) {
      return NextResponse.json(
        { message: "Nombre, usuario y contraseña son obligatorios" },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { message: "La contraseña debe tener mínimo 6 caracteres" },
        { status: 400 }
      );
    }

    // verificar duplicados
    const [dup] = await db.query(
      `SELECT id FROM usuarios WHERE username=? OR (email IS NOT NULL AND email=?) LIMIT 1`,
      [username, email || null]
    );

    if (dup.length > 0) {
      return NextResponse.json(
        { message: "Usuario o email ya existen" },
        { status: 409 }
      );
    }

    /* =========================
       HASH PASSWORD
    ==========================*/
    const hashedPassword = await bcrypt.hash(password, 10);

    /* =========================
       INSERT
    ==========================*/
    const [result] = await db.query(
      `
      INSERT INTO usuarios
      (fullname, username, email, phone, role, password_hash, is_active, permissions, work_schedule, color)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        fullname,
        username,
        email || null,
        phone || null,
        role,
        hashedPassword,
        is_active ? 1 : 0,
        permissions,
        work_schedule,
        color,
      ]
    );

    return NextResponse.json(
      {
        message: "Usuario creado",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al crear usuario" },
      { status: 500 }
    );
  }
}
