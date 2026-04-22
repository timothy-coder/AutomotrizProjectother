import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, generateToken } from "@/lib/auth";

export async function POST(req) {
  try {

    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { message: "Usuario y contraseña son requeridos" },
        { status: 400 }
      );
    }

    const [rows] = await db.query(
      `SELECT u.*, r.name AS role
       FROM usuarios u
       LEFT JOIN roles r ON r.id = u.role_id
       WHERE u.username = ? AND u.is_active = 1
       LIMIT 1`,
      [username]
    );

    if (!rows.length) {
      return NextResponse.json(
        { message: "Usuario no existe" },
        { status: 404 }
      );
    }

    const user = rows[0];

    const valid = await verifyPassword(password, user.password_hash);

    if (!valid) {
      return NextResponse.json(
        { message: "Contraseña incorrecta" },
        { status: 401 }
      );
    }

    const token = generateToken(user);

    return NextResponse.json({
      token,
      user: {
        id: user.id,
        fullname: user.fullname,
        username: user.username,
        role: user.role,
        permissions: user.permissions,
        chatwoot_agent_id: user.chatwoot_agent_id ?? null,
      }
    });


  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { message: "Error interno" },
      { status: 500 }
    );
  }
}
