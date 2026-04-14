// api/clientes/route.ts
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
        d.nombre AS departamento_nombre,
        p.nombre AS provincia_nombre,
        dist.nombre AS distrito_nombre,
        (SELECT COUNT(*) FROM vehiculos v WHERE v.cliente_id = c.id) AS vehiculos_count
      FROM clientes c
      LEFT JOIN departamentos d ON d.id = c.departamento_id
      LEFT JOIN provincias p ON p.id = c.provincia_id
      LEFT JOIN distritos dist ON dist.id = c.distrito_id
      WHERE (? = "" OR
        c.nombre LIKE ? OR
        c.apellido LIKE ? OR
        c.email LIKE ? OR
        c.celular LIKE ? OR
        c.identificacion_fiscal LIKE ? OR
        c.nombre_comercial LIKE ? OR
        c.ocupacion LIKE ? OR
        c.domicilio LIKE ?
      )
      ORDER BY c.id DESC
      `,
      [q, like, like, like, like, like, like, like, like]
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
    const tipo_identificacion = body.tipo_identificacion || null;
    const identificacion_fiscal = (body.identificacion_fiscal || "").trim();
    const nombre_comercial = (body.nombre_comercial || "").trim();
    
    // ✅ NUEVOS CAMPOS
    const fecha_nacimiento = body.fecha_nacimiento || null;
    const ocupacion = (body.ocupacion || "").trim() || null;
    const domicilio = (body.domicilio || "").trim() || null;
    const departamento_id = body.departamento_id || null;
    const provincia_id = body.provincia_id || null;
    const distrito_id = body.distrito_id || null;
    const nombreconyugue = (body.nombreconyugue || "").trim() || null;
    const dniconyugue = (body.dniconyugue || "").trim() || null;

    if (!nombre) {
      return NextResponse.json({ message: "Nombre requerido" }, { status: 400 });
    }

    if (tipo_identificacion && !["DNI", "RUC", "PASAPORTE"].includes(tipo_identificacion)) {
      return NextResponse.json({ message: "tipo_identificacion inválido" }, { status: 400 });
    }

    // ✅ Validar que no existan duplicados
    const [existing] = await db.query(
      `
      SELECT id, 
        CASE 
          WHEN identificacion_fiscal = ? AND identificacion_fiscal != '' THEN 'identificacion_fiscal'
          WHEN email = ? AND email != '' THEN 'email'
          WHEN celular = ? AND celular != '' THEN 'celular'
        END as field
      FROM clientes
      WHERE (
        (identificacion_fiscal = ? AND identificacion_fiscal != '') OR
        (email = ? AND email != '') OR
        (celular = ? AND celular != '')
      )
      LIMIT 1
      `,
      [
        identificacion_fiscal,
        email,
        celular,
        identificacion_fiscal,
        email,
        celular,
      ]
    );

    if (existing.length > 0) {
      const fieldName = existing[0].field;
      let mensaje = "";

      switch (fieldName) {
        case "identificacion_fiscal":
          mensaje = `Ya existe un cliente con la identificación fiscal: ${identificacion_fiscal}`;
          break;
        case "email":
          mensaje = `Ya existe un cliente con el email: ${email}`;
          break;
        case "celular":
          mensaje = `Ya existe un cliente con el celular: ${celular}`;
          break;
        default:
          mensaje = "Este cliente ya existe";
      }

      return NextResponse.json(
        { message: mensaje, field: fieldName },
        { status: 409 }
      );
    }

    const [result] = await db.query(
      `
      INSERT INTO clientes(
        nombre, apellido, email, celular,
        tipo_identificacion, identificacion_fiscal, nombre_comercial,
        fecha_nacimiento, ocupacion, domicilio,
        departamento_id, provincia_id, distrito_id,
        nombreconyugue, dniconyugue,
        created_at
      ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?, CURRENT_DATE)
      `,
      [
        nombre,
        apellido || null,
        email || null,
        celular || null,
        tipo_identificacion,
        identificacion_fiscal || null,
        nombre_comercial || null,
        fecha_nacimiento,
        ocupacion,
        domicilio,
        departamento_id,
        provincia_id,
        distrito_id,
        nombreconyugue,
        dniconyugue,
      ]
    );

    return NextResponse.json(
      { message: "Cliente creado", id: result.insertId },
      { status: 201 }
    );
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}