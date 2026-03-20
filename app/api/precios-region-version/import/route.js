// ============================================
// API DE IMPORTACIÓN CON VERSIÓN
// archivo: app/api/precios-region-version/import/route.js
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

    const requiredHeaders = ["marca", "modelo", "version", "precio"];
    const headerMap = {};
    headers.forEach((header, index) => {
      if (header) {
        headerMap[header.toLowerCase().trim()] = index;
      }
    });

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
        const marca = row[headerMap["marca"]]?.toString().trim();
        const modelo = row[headerMap["modelo"]]?.toString().trim();
        const version = row[headerMap["version"]]?.toString().trim();
        const precio = parseFloat(row[headerMap["precio"]]);

        if (!marca || !modelo || !version || !precio || isNaN(precio)) {
          errors.push(
            `Fila ${rowIndex}: Campos requeridos faltando o precio inválido`
          );
          errorCount++;
          continue;
        }

        // Obtener IDs
        const [marcaData] = await db.query(
          "SELECT id FROM marcas WHERE name = ?",
          [marca]
        );
        if (!marcaData.length) {
          errors.push(`Fila ${rowIndex}: Marca "${marca}" no encontrada`);
          errorCount++;
          continue;
        }
        const marcaId = marcaData[0].id;

        const [modeloData] = await db.query(
          "SELECT id FROM modelos WHERE name = ?",
          [modelo]
        );
        if (!modeloData.length) {
          errors.push(`Fila ${rowIndex}: Modelo "${modelo}" no encontrado`);
          errorCount++;
          continue;
        }
        const modeloId = modeloData[0].id;

        const [versionData] = await db.query(
          "SELECT id FROM versiones WHERE nombre = ?",
          [version]
        );
        if (!versionData.length) {
          errors.push(`Fila ${rowIndex}: Versión "${version}" no encontrada`);
          errorCount++;
          continue;
        }
        const versionId = versionData[0].id;

        // Verificar si existe
        const [existing] = await db.query(
          `SELECT id FROM precios_region_version 
           WHERE marca_id = ? AND modelo_id = ? AND version_id = ?`,
          [marcaId, modeloId, versionId]
        );

        if (existing.length > 0) {
          await db.query(
            "UPDATE precios_region_version SET precio_base = ? WHERE id = ?",
            [precio, existing[0].id]
          );
        } else {
          await db.query(
            `INSERT INTO precios_region_version 
            (marca_id, modelo_id, version_id, precio_base)
            VALUES(?, ?, ?, ?)`,
            [marcaId, modeloId, versionId, precio]
          );
        }

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
      const worksheet = workbook.addWorksheet("Precios");

      worksheet.columns = [
        { header: "marca", width: 20 },
        { header: "modelo", width: 20 },
        { header: "version", width: 15 },
        { header: "precio", width: 15 },
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0070C0" },
      };

      const ejemplos = [
        ["Toyota", "Hilux", "Base", 145000],
        ["Toyota", "Hilux", "Plus", 165000],
        ["Toyota", "Hilux", "Premium", 185000],
        ["Ford", "Ranger", "Base", 152000],
        ["Ford", "Ranger", "Plus", 172000],
      ];

      ejemplos.forEach((ejemplo) => {
        worksheet.addRow(ejemplo);
      });

      worksheet.addRow([]);
      worksheet.addRow([
        "IMPORTANTE: Los valores de Marca, Modelo y Versión deben existir en el sistema",
      ]);

      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": 'attachment; filename="plantilla-precios.xlsx"',
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