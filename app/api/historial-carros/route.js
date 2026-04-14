import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/* =========================
   GET: Listar historial de carros
=========================*/
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limite = parseInt(searchParams.get("limite") || "10");
    const offset = parseInt(searchParams.get("offset") || "0");
    const marcaId = searchParams.get("marca_id");
    const modeloId = searchParams.get("modelo_id");
    const versionId = searchParams.get("version_id");
    const vin = searchParams.get("vin");

    let query = `
      SELECT 
        hc.vin,
        hc.marca_id,
        m.name as marca_nombre,
        hc.modelo_id,
        mo.name as modelo_nombre,
        hc.version_id,
        v.nombre as version_nombre,
        hc.numerofactura,
        hc.preciocompra,
        hc.precioventa,
        hc.created_at,
        hc.created_at_facturacion,
        hc.created_at_entrega,
        hc.updated_at
      FROM historial_carros hc
      LEFT JOIN marcas m ON hc.marca_id = m.id
      LEFT JOIN modelos mo ON hc.modelo_id = mo.id
      LEFT JOIN versiones v ON hc.version_id = v.id
      WHERE 1=1
    `;

    let params = [];

    if (marcaId) {
      query += ` AND hc.marca_id = ?`;
      params.push(marcaId);
    }

    if (modeloId) {
      query += ` AND hc.modelo_id = ?`;
      params.push(modeloId);
    }

    if (versionId) {
      query += ` AND hc.version_id = ?`;
      params.push(versionId);
    }

    if (vin) {
      query += ` AND hc.vin LIKE ?`;
      params.push(`%${vin}%`);
    }

    query += ` ORDER BY hc.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limite, offset);

    const [rows] = await db.query(query, params);

    // ✅ Contar total
    let countQuery = `SELECT COUNT(*) as total FROM historial_carros WHERE 1=1`;
    let countParams = [];

    if (marcaId) {
      countQuery += ` AND marca_id = ?`;
      countParams.push(marcaId);
    }
    if (modeloId) {
      countQuery += ` AND modelo_id = ?`;
      countParams.push(modeloId);
    }
    if (versionId) {
      countQuery += ` AND version_id = ?`;
      countParams.push(versionId);
    }
    if (vin) {
      countQuery += ` AND vin LIKE ?`;
      countParams.push(`%${vin}%`);
    }

    const [countResult] = await db.query(countQuery, countParams);

    return NextResponse.json({
      data: rows,
      total: countResult[0]?.total || 0,
      limite,
      offset,
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { message: "Error al listar historial de carros" },
      { status: 500 }
    );
  }
}

/* =========================
   POST: Crear nuevo registro de historial
=========================*/
export async function POST(request) {
  try {
    const body = await request.json();

    const vin = (body.vin || "").trim().toUpperCase();
    const marcaId = body.marca_id;
    const modeloId = body.modelo_id;
    const versionId = body.version_id;
    const numerofactura = body.numerofactura ? (body.numerofactura || "").trim() : null;
    const preciocompra = body.preciocompra ? parseFloat(body.preciocompra) : null;
    const createdAtFacturacion = body.created_at_facturacion || null;
    const createdAtEntrega = body.created_at_entrega || null;

    /* =========================
       VALIDACIONES
    =========================*/
    if (!vin ) {
      return NextResponse.json(
        { message: "VIN inválido" },
        { status: 400 }
      );
    }

    if (!marcaId || !modeloId || !versionId) {
      return NextResponse.json(
        { message: "marca_id, modelo_id y version_id son requeridos" },
        { status: 400 }
      );
    }

    if (preciocompra !== null && preciocompra < 0) {
      return NextResponse.json(
        { message: "El precio de compra no puede ser negativo" },
        { status: 400 }
      );
    }

    // ✅ Verificar que no exista el VIN
    const [existing] = await db.query(
      `SELECT vin FROM historial_carros WHERE vin = ?`,
      [vin]
    );

    if (existing.length > 0) {
      return NextResponse.json(
        { message: "Este VIN ya existe" },
        { status: 409 }
      );
    }

    // ✅ Verificar que la combinación marca-modelo-version no exista
    const [duplicateCombo] = await db.query(
      `SELECT vin FROM historial_carros WHERE marca_id = ? AND modelo_id = ? AND version_id = ?`,
      [marcaId, modeloId, versionId]
    );


    /* =========================
       INSERT HISTORIAL
    =========================*/
    await db.query(
      `
      INSERT INTO historial_carros(
        vin, marca_id, modelo_id, version_id, 
        numerofactura, preciocompra, 
        created_at_facturacion, created_at_entrega
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        vin,
        marcaId,
        modeloId,
        versionId,
        numerofactura,
        preciocompra,
        createdAtFacturacion,
        createdAtEntrega,
      ]
    );

    return NextResponse.json(
      {
        message: "✓ Registro de historial creado exitosamente",
        vin: vin,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(error);

    if (error.code === "ER_NO_REFERENCED_ROW_2") {
      return NextResponse.json(
        { message: "Una o más referencias (marca, modelo, versión) no existen" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { message: "Error al crear registro" },
      { status: 500 }
    );
  }
}