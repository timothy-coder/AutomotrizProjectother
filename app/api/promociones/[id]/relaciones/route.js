// ============================================
// API DE RELACIONES DE PROMOCIONES
// archivo: app/api/promociones/[id]/relaciones/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";

// ============================================
// GET: Obtener todas las relaciones de una promoción
// ============================================
export async function GET(req, { params }) {
  try {
    const { id } = params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de promoción inválido" },
        { status: 400 }
      );
    }

    // Verificar que la promoción existe
    const [promo] = await db.query(
      "SELECT id FROM promociones WHERE id = ?",
      [id]
    );

    if (promo.length === 0) {
      return NextResponse.json(
        { message: "Promoción no encontrada" },
        { status: 404 }
      );
    }

    // Obtener marcas
    const [marcas] = await db.query(
      `SELECT m.id, m.name FROM marcas m
       INNER JOIN promociones_marcas pm ON pm.marca_id = m.id
       WHERE pm.promocion_id = ?`,
      [id]
    );

    // Obtener modelos
    const [modelos] = await db.query(
      `SELECT mo.id, mo.name, ma.name as marca_name FROM modelos mo
       INNER JOIN marcas ma ON ma.id = mo.marca_id
       INNER JOIN promociones_modelos pmo ON pmo.modelo_id = mo.id
       WHERE pmo.promocion_id = ?`,
      [id]
    );

    // Obtener versiones
    const [versiones] = await db.query(
      `SELECT v.id, v.nombre FROM versiones v
       INNER JOIN promociones_versiones pv ON pv.version_id = v.id
       WHERE pv.promocion_id = ?`,
      [id]
    );

    // Obtener departamentos
    const [departamentos] = await db.query(
      `SELECT d.id, d.nombre FROM departamentos d
       INNER JOIN promociones_departamentos pd ON pd.departamento_id = d.id
       WHERE pd.promocion_id = ?`,
      [id]
    );

    // Obtener provincias
    const [provincias] = await db.query(
      `SELECT pr.id, pr.nombre, d.nombre as departamento_nombre FROM provincias pr
       INNER JOIN departamentos d ON d.id = pr.departamento_id
       INNER JOIN promociones_provincias pp ON pp.provincia_id = pr.id
       WHERE pp.promocion_id = ?`,
      [id]
    );

    // Obtener distritos
    const [distritos] = await db.query(
      `SELECT di.id, di.nombre, pr.nombre as provincia_nombre, d.nombre as departamento_nombre FROM distritos di
       INNER JOIN provincias pr ON pr.id = di.provincia_id
       INNER JOIN departamentos d ON d.id = di.departamento_id
       INNER JOIN promociones_distritos pdi ON pdi.distrito_id = di.id
       WHERE pdi.promocion_id = ?`,
      [id]
    );

    return NextResponse.json({
      promocion_id: id,
      marcas,
      modelos,
      versiones,
      departamentos,
      provincias,
      distritos,
      resumen: {
        total_marcas: marcas.length,
        total_modelos: modelos.length,
        total_versiones: versiones.length,
        total_departamentos: departamentos.length,
        total_provincias: provincias.length,
        total_distritos: distritos.length,
      },
    });
  } catch (error) {
    console.error("GET /api/promociones/[id]/relaciones error:", error);
    return NextResponse.json(
      { message: "Error al obtener relaciones", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// POST: Agregar relaciones a una promoción
// ============================================
export async function POST(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const {
      marcas = [],
      modelos = [],
      versiones = [],
      departamentos = [],
      provincias = [],
      distritos = [],
    } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de promoción inválido" },
        { status: 400 }
      );
    }

    // Verificar que la promoción existe
    const [promo] = await db.query(
      "SELECT id FROM promociones WHERE id = ?",
      [id]
    );

    if (promo.length === 0) {
      return NextResponse.json(
        { message: "Promoción no encontrada" },
        { status: 404 }
      );
    }

    const resultado = {
      marcas_agregadas: 0,
      modelos_agregados: 0,
      versiones_agregadas: 0,
      departamentos_agregados: 0,
      provincias_agregadas: 0,
      distritos_agregados: 0,
      errores: [],
    };

    // Agregar marcas
    for (const marca_id of marcas) {
      try {
        await db.query(
          "INSERT IGNORE INTO promociones_marcas (promocion_id, marca_id) VALUES (?, ?)",
          [id, marca_id]
        );
        resultado.marcas_agregadas++;
      } catch (error) {
        resultado.errores.push(`Error al agregar marca ${marca_id}: ${error.message}`);
      }
    }

    // Agregar modelos
    for (const modelo_id of modelos) {
      try {
        await db.query(
          "INSERT IGNORE INTO promociones_modelos (promocion_id, modelo_id) VALUES (?, ?)",
          [id, modelo_id]
        );
        resultado.modelos_agregados++;
      } catch (error) {
        resultado.errores.push(`Error al agregar modelo ${modelo_id}: ${error.message}`);
      }
    }

    // Agregar versiones
    for (const version_id of versiones) {
      try {
        await db.query(
          "INSERT IGNORE INTO promociones_versiones (promocion_id, version_id) VALUES (?, ?)",
          [id, version_id]
        );
        resultado.versiones_agregadas++;
      } catch (error) {
        resultado.errores.push(`Error al agregar versión ${version_id}: ${error.message}`);
      }
    }

    // Agregar departamentos
    for (const departamento_id of departamentos) {
      try {
        await db.query(
          "INSERT IGNORE INTO promociones_departamentos (promocion_id, departamento_id) VALUES (?, ?)",
          [id, departamento_id]
        );
        resultado.departamentos_agregados++;
      } catch (error) {
        resultado.errores.push(`Error al agregar departamento ${departamento_id}: ${error.message}`);
      }
    }

    // Agregar provincias
    for (const provincia_id of provincias) {
      try {
        await db.query(
          "INSERT IGNORE INTO promociones_provincias (promocion_id, provincia_id) VALUES (?, ?)",
          [id, provincia_id]
        );
        resultado.provincias_agregadas++;
      } catch (error) {
        resultado.errores.push(`Error al agregar provincia ${provincia_id}: ${error.message}`);
      }
    }

    // Agregar distritos
    for (const distrito_id of distritos) {
      try {
        await db.query(
          "INSERT IGNORE INTO promociones_distritos (promocion_id, distrito_id) VALUES (?, ?)",
          [id, distrito_id]
        );
        resultado.distritos_agregados++;
      } catch (error) {
        resultado.errores.push(`Error al agregar distrito ${distrito_id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      message: "Relaciones agregadas",
      resultado,
    });
  } catch (error) {
    console.error("POST /api/promociones/[id]/relaciones error:", error);
    return NextResponse.json(
      { message: "Error al agregar relaciones", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// PUT: Actualizar relaciones (reemplazar)
// ============================================
export async function PUT(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const {
      marcas = [],
      modelos = [],
      versiones = [],
      departamentos = [],
      provincias = [],
      distritos = [],
    } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de promoción inválido" },
        { status: 400 }
      );
    }

    // Verificar que la promoción existe
    const [promo] = await db.query(
      "SELECT id FROM promociones WHERE id = ?",
      [id]
    );

    if (promo.length === 0) {
      return NextResponse.json(
        { message: "Promoción no encontrada" },
        { status: 404 }
      );
    }

    // Limpiar relaciones existentes
    await db.query("DELETE FROM promociones_marcas WHERE promocion_id = ?", [id]);
    await db.query("DELETE FROM promociones_modelos WHERE promocion_id = ?", [id]);
    await db.query("DELETE FROM promociones_versiones WHERE promocion_id = ?", [id]);
    await db.query("DELETE FROM promociones_departamentos WHERE promocion_id = ?", [id]);
    await db.query("DELETE FROM promociones_provincias WHERE promocion_id = ?", [id]);
    await db.query("DELETE FROM promociones_distritos WHERE promocion_id = ?", [id]);

    const resultado = {
      marcas_agregadas: 0,
      modelos_agregados: 0,
      versiones_agregadas: 0,
      departamentos_agregados: 0,
      provincias_agregadas: 0,
      distritos_agregados: 0,
      errores: [],
    };

    // Agregar nuevas marcas
    for (const marca_id of marcas) {
      try {
        await db.query(
          "INSERT INTO promociones_marcas (promocion_id, marca_id) VALUES (?, ?)",
          [id, marca_id]
        );
        resultado.marcas_agregadas++;
      } catch (error) {
        resultado.errores.push(`Error al agregar marca ${marca_id}: ${error.message}`);
      }
    }

    // Agregar nuevos modelos
    for (const modelo_id of modelos) {
      try {
        await db.query(
          "INSERT INTO promociones_modelos (promocion_id, modelo_id) VALUES (?, ?)",
          [id, modelo_id]
        );
        resultado.modelos_agregados++;
      } catch (error) {
        resultado.errores.push(`Error al agregar modelo ${modelo_id}: ${error.message}`);
      }
    }

    // Agregar nuevas versiones
    for (const version_id of versiones) {
      try {
        await db.query(
          "INSERT INTO promociones_versiones (promocion_id, version_id) VALUES (?, ?)",
          [id, version_id]
        );
        resultado.versiones_agregadas++;
      } catch (error) {
        resultado.errores.push(`Error al agregar versión ${version_id}: ${error.message}`);
      }
    }

    // Agregar nuevos departamentos
    for (const departamento_id of departamentos) {
      try {
        await db.query(
          "INSERT INTO promociones_departamentos (promocion_id, departamento_id) VALUES (?, ?)",
          [id, departamento_id]
        );
        resultado.departamentos_agregados++;
      } catch (error) {
        resultado.errores.push(`Error al agregar departamento ${departamento_id}: ${error.message}`);
      }
    }

    // Agregar nuevas provincias
    for (const provincia_id of provincias) {
      try {
        await db.query(
          "INSERT INTO promociones_provincias (promocion_id, provincia_id) VALUES (?, ?)",
          [id, provincia_id]
        );
        resultado.provincias_agregadas++;
      } catch (error) {
        resultado.errores.push(`Error al agregar provincia ${provincia_id}: ${error.message}`);
      }
    }

    // Agregar nuevos distritos
    for (const distrito_id of distritos) {
      try {
        await db.query(
          "INSERT INTO promociones_distritos (promocion_id, distrito_id) VALUES (?, ?)",
          [id, distrito_id]
        );
        resultado.distritos_agregados++;
      } catch (error) {
        resultado.errores.push(`Error al agregar distrito ${distrito_id}: ${error.message}`);
      }
    }

    return NextResponse.json({
      message: "Relaciones actualizadas",
      resultado,
    });
  } catch (error) {
    console.error("PUT /api/promociones/[id]/relaciones error:", error);
    return NextResponse.json(
      { message: "Error al actualizar relaciones", error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE: Eliminar relaciones específicas
// ============================================
export async function DELETE(req, { params }) {
  try {
    const { id } = params;
    const body = await req.json();

    const {
      tipo, // "marca", "modelo", "version", "departamento", "provincia", "distrito"
      item_id,
    } = body;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID de promoción inválido" },
        { status: 400 }
      );
    }

    if (!tipo || !item_id) {
      return NextResponse.json(
        { message: "Debe especificar tipo e item_id" },
        { status: 400 }
      );
    }

    const tablas = {
      marca: "promociones_marcas",
      modelo: "promociones_modelos",
      version: "promociones_versiones",
      departamento: "promociones_departamentos",
      provincia: "promociones_provincias",
      distrito: "promociones_distritos",
    };

    const tablasIds = {
      marca: "marca_id",
      modelo: "modelo_id",
      version: "version_id",
      departamento: "departamento_id",
      provincia: "provincia_id",
      distrito: "distrito_id",
    };

    const tabla = tablas[tipo];
    const columnaId = tablasIds[tipo];

    if (!tabla) {
      return NextResponse.json(
        { message: "Tipo de relación inválido" },
        { status: 400 }
      );
    }

    const query = `DELETE FROM ${tabla} WHERE promocion_id = ? AND ${columnaId} = ?`;
    const [result] = await db.query(query, [id, item_id]);

    if (result.affectedRows === 0) {
      return NextResponse.json(
        { message: "Relación no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: `${tipo} eliminado de la promoción`,
      tipo,
      item_id,
    });
  } catch (error) {
    console.error("DELETE /api/promociones/[id]/relaciones error:", error);
    return NextResponse.json(
      { message: "Error al eliminar relación", error: error.message },
      { status: 500 }
    );
  }
}