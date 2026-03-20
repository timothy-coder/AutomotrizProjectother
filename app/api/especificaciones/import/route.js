// ============================================
// API DE IMPORTACIÓN DE ESPECIFICACIONES
// archivo: app/api/especificaciones/import/route.js
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

    // Esperamos: nombre, tipo_dato, opciones (separadas por |)
    const headerMap = {};
    headers.forEach((header, index) => {
      if (header) {
        headerMap[header.toLowerCase().trim()] = index;
      }
    });

    const requiredHeaders = ["nombre", "tipo_dato"];
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

      if (!row || !row[headerMap["nombre"]]) continue;

      try {
        const nombre = row[headerMap["nombre"]]?.toString().trim();
        const tipo_dato = row[headerMap["tipo_dato"]]?.toString().trim().toLowerCase();
        const opcionesRaw = row[headerMap["opciones"]]?.toString().trim() || "";

        if (!nombre) {
          errors.push(`Fila ${rowIndex}: Nombre es requerido`);
          errorCount++;
          continue;
        }

        if (!["texto", "numero", "booleano", "lista"].includes(tipo_dato)) {
          errors.push(
            `Fila ${rowIndex}: Tipo de dato inválido. Debe ser: texto, numero, booleano, lista`
          );
          errorCount++;
          continue;
        }

        // Procesar opciones
        let opciones = null;
        if (tipo_dato === "lista") {
          if (!opcionesRaw) {
            errors.push(
              `Fila ${rowIndex}: Las listas requieren opciones separadas por |`
            );
            errorCount++;
            continue;
          }
          opciones = JSON.stringify(
            opcionesRaw.split("|").map((opt) => opt.trim())
          );
        }

        // Verificar si ya existe
        const [existing] = await db.query(
          "SELECT id FROM especificaciones WHERE nombre = ?",
          [nombre]
        );

        if (existing.length > 0) {
          // Actualizar
          await db.query(
            "UPDATE especificaciones SET tipo_dato = ?, opciones = ? WHERE nombre = ?",
            [tipo_dato, opciones, nombre]
          );
        } else {
          // Crear
          await db.query(
            "INSERT INTO especificaciones (nombre, tipo_dato, opciones) VALUES(?, ?, ?)",
            [nombre, tipo_dato, opciones]
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
      const worksheet = workbook.addWorksheet("Especificaciones");

      worksheet.columns = [
        { header: "nombre", width: 30 },
        { header: "tipo_dato", width: 20 },
        { header: "opciones", width: 50 },
      ];

      worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
      worksheet.getRow(1).fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF0070C0" },
      };

      // Ejemplos
      const ejemplos = [
        ["Motor", "texto", ""],
        ["Potencia", "numero", ""],
        ["Torque", "numero", ""],
        ["Tracción", "lista", "Delantera|Trasera|4x4|AWD"],
        ["Combustible", "lista", "Gasolina|Diesel|Híbrido|Eléctrico"],
        ["Transmisión", "texto", ""],
        ["Asientos", "numero", ""],
        ["Pantalla Táctil", "booleano", ""],
      ];

      ejemplos.forEach((ejemplo) => {
        worksheet.addRow(ejemplo);
      });

      worksheet.addRow([]);
      worksheet.addRow([]);
      worksheet.addRow([
        "INSTRUCCIONES:",
        "",
        "",
      ]);
      worksheet.addRow([
        "1. nombre: Nombre de la especificación",
        "",
        "",
      ]);
      worksheet.addRow([
        "2. tipo_dato: texto, numero, booleano o lista",
        "",
        "",
      ]);
      worksheet.addRow([
        "3. opciones: Para listas, separar opciones con | (Ej: Opción1|Opción2|Opción3)",
        "",
        "",
      ]);

      const buffer = await workbook.xlsx.writeBuffer();
      return new NextResponse(buffer, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition":
            'attachment; filename="plantilla-especificaciones.xlsx"',
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