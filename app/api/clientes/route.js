import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/clientes?q=juan
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();

    const like = `%${q}%`;

    const [rows] = await db.query(
      `
      SELECT
        c.*,
        (SELECT COUNT(*) FROM vehiculos v WHERE v.cliente_id = c.id) AS vehiculos_count
      FROM clientes c
      WHERE (? = "" OR
        c.nombre LIKE ? OR
        c.apellido LIKE ? OR
        c.email LIKE ? OR
        c.celular LIKE ? OR
        c.identificacion_fiscal LIKE ? OR
        c.nombre_comercial LIKE ?
      )
      ORDER BY c.id DESC
      `,
      [q, like, like, like, like, like, like]
    );

    return NextResponse.json(rows);
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

// POST /api/clientes
export async function POST(req) {
  try {
    const body = await req.json();

    const nombre = (body.nombre || "").trim();
    const apellido = (body.apellido || "").trim();
    const email = (body.email || "").trim();
    const celular = (body.celular || "").trim();
    const tipo_identificacion = body.tipo_identificacion || null; // 'DNI' | 'RUC'
    const identificacion_fiscal = (body.identificacion_fiscal || "").trim();
    const nombre_comercial = (body.nombre_comercial || "").trim();

    if (!nombre) {
      return NextResponse.json({ message: "Nombre requerido" }, { status: 400 });
    }

    if (tipo_identificacion && !["DNI", "RUC"].includes(tipo_identificacion)) {
      return NextResponse.json({ message: "tipo_identificacion inválido" }, { status: 400 });
    }

    const [result] = await db.query(
      `
      INSERT INTO clientes(
        nombre, apellido, email, celular,
        tipo_identificacion, identificacion_fiscal, nombre_comercial,
        created_at
      ) VALUES (?,?,?,?,?,?,?, CURRENT_DATE)
      `,
      [
        nombre,
        apellido || null,
        email || null,
        celular || null,
        tipo_identificacion,
        identificacion_fiscal || null,
        nombre_comercial || null,
      ]
    );

    return NextResponse.json({ message: "Cliente creado", id: result.insertId });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
