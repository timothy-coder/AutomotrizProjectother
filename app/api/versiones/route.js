import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const search = searchParams.get("search") || "";

    // Validar que page y limit sean números válidos
    const validPage = Math.max(1, page);
    const validLimit = Math.max(1, Math.min(100, limit)); // máximo 100
    const offset = (validPage - 1) * validLimit;

    let query = "SELECT * FROM versiones";
    let countQuery = "SELECT COUNT(*) as total FROM versiones";
    const params = [];

    // Agregar búsqueda si existe
    if (search.trim()) {
      const searchTerm = `%${search.trim()}%`;
      query += " WHERE nombre LIKE ? OR descripcion LIKE ?";
      countQuery += " WHERE nombre LIKE ? OR descripcion LIKE ?";
      params.push(searchTerm, searchTerm);
    }

    // Contar total de registros
    const [[{ total }]] = await db.query(countQuery, params);

    // Obtener datos paginados
    query += " ORDER BY nombre ASC LIMIT ? OFFSET ?";
    const [rows] = await db.query(query, [...params, validLimit, offset]);

    // Calcular páginas totales
    const pages = Math.ceil(total / validLimit);

    return NextResponse.json({
      data: rows,
      pagination: {
        total,
        pages,
        currentPage: validPage,
        limit: validLimit,
        offset,
      },
    });
  } catch (e) {
    console.error("Error fetching versiones:", e);
    return NextResponse.json(
      { message: "Error al cargar versiones" },
      { status: 500 }
    );
  }
}

export async function POST(req) {
  try {
    const { nombre, descripcion } = await req.json();

    // Validaciones
    if (!nombre || !nombre.trim()) {
      return NextResponse.json(
        { message: "El nombre es requerido" },
        { status: 400 }
      );
    }

    // Verificar que no exista una versión con el mismo nombre
    const [existing] = await db.query(
      "SELECT id FROM versiones WHERE nombre = ?",
      [nombre.trim()]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "Ya existe una versión con este nombre" },
        { status: 400 }
      );
    }

    // Insertar nueva versión
    const [result] = await db.query(
      "INSERT INTO versiones (nombre, descripcion) VALUES(?, ?)",
      [nombre.trim(), descripcion?.trim() || null]
    );

    return NextResponse.json(
      {
        message: "Versión creada exitosamente",
        id: result.insertId,
        data: {
          id: result.insertId,
          nombre: nombre.trim(),
          descripcion: descripcion?.trim() || null,
          created_at: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (e) {
    console.error("Error creating versión:", e);
    return NextResponse.json(
      { message: "Error al crear versión" },
      { status: 500 }
    );
  }
}