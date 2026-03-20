// ============================================
// API DE IMPORTACIÓN DE ESPECIFICACIONES POR MODELO
// archivo: app/api/modelo-especificaciones/import/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import ExcelJS from "exceljs";

export async function POST(req) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { message: "Archivo requerido" },
        { status: 400 }
      );
    }

    const buffer = await file.arrayBuffer();
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const worksheet = workbook.getWorksheet(1);

    if (!worksheet) {
      return NextResponse.json(
        { message: "Hoja de trabajo no encontrada" },
        { status: 400 }
      );
    }

    const rows = worksheet.getSheetValues();
    const headers = rows[1];

    // Esperamos: marca, modelo, especificacion, valor
    const headerMap = {};
    headers.forEach((header, index) => {
      if (header) {
        headerMap[header.toLowerCase().trim()] = index;
      }
    });

    const requiredHeaders = ["marca", "modelo", "especificacion", "valor"];
    const missingHeaders = requiredHeaders.filter((h) => !headerMap[h]);

    if (missingHeaders.length > 0) {
      return NextResponse.json(
        {
          message: `Headers faltantes: ${missingHeaders.join(", ")}`,
        },
        { status: 400 }
      );
    }

    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let rowIndex = 2; rowIndex <= worksheet.actualRowCount; rowIndex++) {
      const row = worksheet.getRow(rowIndex).values;

      if (!row || !row[headerMap["marca"]]) continue;

      try {
        const marcaNombre = row[headerMap["marca"]]?.toString().trim();
        const modeloNombre = row[headerMap["modelo"]]?.toString().trim();
        const especificacionNombre = row[headerMap["especificacion"]]?.toString().trim();
        const valor = row[headerMap["valor"]]?.toString().trim();

        if (!marcaNombre || !modeloNombre || !especificacionNombre || !valor) {
          errors.push(`Fila ${rowIndex}: Todos los campos son requeridos`);
          errorCount++;
          continue;
        }

        // Obtener IDs
        const [marcaResult] = await db.query(
          "SELECT id FROM marcas WHERE name = ?",
          [marcaNombre]
        );

        if (marcaResult.length === 0) {
          errors.push(`Fila ${rowIndex}: Marca "${marcaNombre}" no encontrada`);
          errorCount++;
          continue;
        }

        const marca_id = marcaResult[0].id;

        const [modeloResult] = await db.query(
          "SELECT id FROM modelos WHERE name = ? AND marca_id = ?",
          [modeloNombre, marca_id]
        );

        if (modeloResult.length === 0) {
          errors.push(
            `Fila ${rowIndex}: Modelo "${modeloNombre}" no encontrada en ${marcaNombre}`
          );
          errorCount++;
          continue;
        }

        const modelo_id = modeloResult[0].id;

        const [especificacionResult] = await db.query(
          "SELECT id FROM especificaciones WHERE nombre = ?",
          [especificacionNombre]
        );

        if (especificacionResult.length === 0) {
          errors.push(
            `Fila ${rowIndex}: Especificación "${especificacionNombre}" no encontrada`
          );
          errorCount++;
          continue;
        }

        const especificacion_id = especificacionResult[0].id;

        // Insertar o actualizar
        await db.query(
          `INSERT INTO modelo_especificaciones (marca_id, modelo_id, especificacion_id, valor)
           VALUES(?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE valor = ?`,
          [marca_id, modelo_id, especificacion_id, valor, valor]
        );

        successCount++;
      } catch (error) {
        console.error("Error en fila:", rowIndex, error);
        errors.push(`Fila ${rowIndex}: ${error.message}`);
        errorCount++;
      }
    }

    return NextResponse.json({
      message: "Importación completada",
      success: successCount,
      errors: errorCount,
      details: errors.slice(0, 20),
      totalErrors: errors.length,
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error procesando archivo", error: e.message },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get("action");

    if (action === "template") {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Especificaciones por Modelo");

      worksheet.columns = [
        { header: "marca", width: 20 },
        { header: "modelo", width: 25 },
        { header: "especificacion", width: 30 },
        { header: "valor", width: 30 },
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0070C0" },
      };

      // Ejemplos
      const ejemplos = [
        ["Toyota", "Corolla", "Motor", "1.6L"],
        ["Toyota", "Corolla", "Potencia", "120"],
        ["Toyota", "Corolla", "Combustible", "Gasolina"],
        ["Honda", "Civic", "Motor", "1.5L"],
        ["Honda", "Civic", "Potencia", "130"],
        ["Honda", "Civic", "Tracción", "Delantera"],
      ];

      ejemplos.forEach((ejemplo) => {
        worksheet.addRow(ejemplo);
      });

      worksheet.addRow([]);
      worksheet.addRow([]);
      worksheet.addRow(["INSTRUCCIONES:", "", "", ""]);
      worksheet.addRow([
        "1. marca: Nombre exacto de la marca",
        "",
        "",
        "",
      ]);
      worksheet.addRow([
        "2. modelo: Nombre exacto del modelo para esa marca",
        "",
        "",
        "",
      ]);
      worksheet.addRow([
        "3. especificacion: Nombre de la especificación que ya debe existir",
        "",
        "",
        "",
      ]);
      worksheet.addRow([
        "4. valor: El valor específico para ese modelo y marca",
        "",
        "",
        "",
      ]);

      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition":
            'attachment; filename="plantilla-especificaciones-modelo.xlsx"',
        },
      });
    }

    return NextResponse.json({ message: "Acción no válida" }, { status: 400 });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error generando plantilla", error: e.message },
      { status: 500 }
    );
  }
}