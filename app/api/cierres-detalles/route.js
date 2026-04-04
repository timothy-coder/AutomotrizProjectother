import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ✅ GET - Obtener todos los detalles de cierres
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const offset = (page - 1) * limit;
    const search = searchParams.get("search");

    let sql = "SELECT * FROM cierres_detalle WHERE 1=1";
    const params = [];

    if (search) {
      sql += " AND detalle LIKE ?";
      params.push(`%${search}%`);
    }

    // Contar total
    const countSql = `SELECT COUNT(*) as total FROM cierres_detalle WHERE 1=1 ${search ? "AND detalle LIKE ?" : ""}`;
    const countParams = search ? [`%${search}%`] : [];
    const [countResult] = await db.query(countSql, countParams);
    const total = countResult[0].total;

    sql += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const [rows] = await db.query(sql, params);

    return NextResponse.json({
      data: rows,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { message: "Error: " + error.message },
      { status: 500 }
    );
  }
}

// ✅ POST - Crear nuevo detalle de cierre
export async function POST(req) {
  try {
    const { detalle } = await req.json();

    if (!detalle || !detalle.trim()) {
      return NextResponse.json(
        { message: "El detalle es requerido" },
        { status: 400 }
      );
    }

    const [result] = await db.query(
      "INSERT INTO cierres_detalle (detalle) VALUES (?)",
      [detalle]
    );

    return NextResponse.json(
      {
        message: "Detalle de cierre creado",
        id: result.insertId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { message: "Error: " + error.message },
      { status: 500 }
    );
  }
}