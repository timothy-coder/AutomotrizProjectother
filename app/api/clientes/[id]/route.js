import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/clientes/1  (incluye vehiculos)
export async function GET(req, { params }) {
  try {
    const { id } = await params;

    const [cRows] = await db.query(`SELECT * FROM clientes WHERE id=?`, [id]);
    const cliente = cRows?.[0];
    if (!cliente) return NextResponse.json({ message: "No existe" }, { status: 404 });

    const [vRows] = await db.query(
      `
      SELECT v.*,
        m.name AS marca_nombre,
        mo.name AS modelo_nombre
      FROM vehiculos v
      LEFT JOIN marcas m ON m.id = v.marca_id
      LEFT JOIN modelos mo ON mo.id = v.modelo_id
      WHERE v.cliente_id=?
      ORDER BY v.id DESC
      `,
      [id]
    );

    return NextResponse.json({ ...cliente, vehiculos: vRows });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

// PUT /api/clientes/1
export async function PUT(req, { params }) {
  try {
    const { id } = await params;
    const body = await req.json();

    const nombre = (body.nombre || "").trim();
    const apellido = (body.apellido || "").trim();
    const email = (body.email || "").trim();
    const celular = (body.celular || "").trim();
    const tipo_identificacion = body.tipo_identificacion || null;
    const identificacion_fiscal = (body.identificacion_fiscal || "").trim();
    const nombre_comercial = (body.nombre_comercial || "").trim();

    if (!nombre) return NextResponse.json({ message: "Nombre requerido" }, { status: 400 });
    if (tipo_identificacion && !["DNI", "RUC"].includes(tipo_identificacion)) {
      return NextResponse.json({ message: "tipo_identificacion inválido" }, { status: 400 });
    }

    const [result] = await db.query(
      `
      UPDATE clientes SET
        nombre=?,
        apellido=?,
        email=?,
        celular=?,
        tipo_identificacion=?,
        identificacion_fiscal=?,
        nombre_comercial=?
      WHERE id=?
      `,
      [
        nombre,
        apellido || null,
        email || null,
        celular || null,
        tipo_identificacion,
        identificacion_fiscal || null,
        nombre_comercial || null,
        id,
      ]
    );

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: "No existe" }, { status: 404 });
    }

    return NextResponse.json({ message: "Cliente actualizado" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}

// DELETE /api/clientes/1 (borra también vehiculos por ON DELETE CASCADE)
export async function DELETE(req, { params }) {
  try {
    const { id } = await params;

    const [result] = await db.query(`DELETE FROM clientes WHERE id=?`, [id]);

    if (result.affectedRows === 0) {
      return NextResponse.json({ message: "No existe" }, { status: 404 });
    }

    return NextResponse.json({ message: "Cliente eliminado" });
  } catch (e) {
    console.log(e);
    return NextResponse.json({ message: "Error" }, { status: 500 });
  }
}
