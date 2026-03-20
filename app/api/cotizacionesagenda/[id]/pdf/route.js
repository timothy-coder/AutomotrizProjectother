// ============================================
// API PARA GENERAR PDF
// archivo: app/api/cotizacionesagenda/[id]/pdf/route.js
// ============================================

import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import puppeteer from "puppeteer";

export async function GET(req, { params }) {
  let browser;
  try {
    const { id } = await params;

    console.log("Generando PDF para cotización:", id);

    // Obtener datos de la cotización
    const [cotizaciones] = await db.query(
      `SELECT 
        ca.*,
        m.name as marca,
        mo.name as modelo,
        v.nombre as version_nombre
      FROM cotizacionesagenda ca
      INNER JOIN marcas m ON m.id = ca.marca_id
      INNER JOIN modelos mo ON mo.id = ca.modelo_id
      LEFT JOIN versiones v ON v.id = ca.version_id
      WHERE ca.id = ?`,
      [id]
    );

    if (cotizaciones.length === 0) {
      return NextResponse.json(
        { message: "Cotización no encontrada" },
        { status: 404 }
      );
    }

    const cot = cotizaciones[0];

    // Obtener especificaciones
    const [especificaciones] = await db.query(
      `SELECT 
        e.nombre as especificacion_nombre,
        me.valor
      FROM modelo_especificaciones me
      INNER JOIN especificaciones e ON e.id = me.especificacion_id
      WHERE me.marca_id = ? AND me.modelo_id = ?
      ORDER BY e.nombre ASC`,
      [cot.marca_id, cot.modelo_id]
    );

    console.log("Especificaciones obtenidas:", especificaciones.length);

    // Obtener usuario logueado
    const [usuario] = await db.query(
      "SELECT fullname FROM usuarios WHERE id = ?",
      [cot.created_by]
    );

    const usuarioNombre = usuario.length > 0 
      ? usuario[0].fullname
      : "Usuario";

    // Obtener oportunidad y cliente
    const [oportunidad] = await db.query(
      `SELECT 
        o.oportunidad_id,
        CONCAT(c.nombre, ' ', c.apellido) as cliente_name
      FROM oportunidades o
      INNER JOIN clientes c ON c.id = o.cliente_id
      WHERE o.id = ?`,
      [cot.oportunidad_id]
    );

    const clienteName = oportunidad.length > 0 
      ? oportunidad[0].cliente_name
      : "Cliente";

    // Generar HTML del PDF
    const html = `
      <!DOCTYPE html>
      <html lang="es">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Proforma Q-${String(id).padStart(6, "0")}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            font-size: 11px;
            line-height: 1.4;
            color: #333;
          }
          .page { 
            width: 21cm;
            height: 29.7cm;
            padding: 20px;
            page-break-after: always;
            position: relative;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 20px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .header-left { flex: 1; }
          .header-right { text-align: right; }
          .company-name { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
          .client-info { margin-top: 10px; }
          .proforma-num { font-size: 14px; font-weight: bold; }
          
          .vehicle-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin: 20px 0;
          }
          .vehicle-specs {
            border: 1px solid #000;
          }
          .spec-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-bottom: 1px solid #000;
          }
          .spec-row:last-child { border-bottom: none; }
          .spec-label {
            font-weight: bold;
            padding: 8px;
            border-right: 1px solid #000;
            background: #f5f5f5;
          }
          .spec-value {
            padding: 8px;
          }
          .vehicle-image {
            text-align: center;
            padding: 20px;
            background: #f9f9f9;
            border: 1px solid #ddd;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 60px;
          }
          
          .section-title {
            font-weight: bold;
            font-size: 12px;
            margin-top: 20px;
            margin-bottom: 10px;
            border-bottom: 1px solid #000;
            padding-bottom: 5px;
          }
          
          .specifications {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
            font-size: 10px;
          }
          .specifications th {
            background: #f0f0f0;
            border: 1px solid #000;
            padding: 5px;
            text-align: left;
            font-weight: bold;
          }
          .specifications td {
            border: 1px solid #000;
            padding: 5px;
          }
          .specifications tr:nth-child(even) {
            background: #f9f9f9;
          }
          
          .summary-box {
            background: #f0f0f0;
            border: 1px solid #000;
            padding: 10px;
            margin: 10px 0;
            font-size: 10px;
          }
          
          .summary-box p {
            margin: 5px 0;
          }
          
          .footer {
            position: absolute;
            bottom: 20px;
            left: 20px;
            right: 20px;
            text-align: center;
            font-size: 9px;
            border-top: 1px solid #000;
            padding-top: 10px;
          }
          
          .user-signature {
            margin-bottom: 20px;
            text-align: center;
            font-size: 10px;
          }
          
          .signature-line {
            border-top: 1px solid #000;
            width: 200px;
            margin: 0 auto 5px;
          }
          
          .user-name {
            font-weight: bold;
            margin-bottom: 5px;
          }
          
          .company-info {
            font-size: 9px;
            color: #666;
          }
          
          .content {
            margin-bottom: 120px;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <div class="company-name">NISSAN PERU</div>
              <div style="margin-top: 5px;">
                <div><strong>Cliente:</strong></div>
                <div>${clienteName}</div>
              </div>
              <div class="client-info">
                <div>Huancayo ${new Date().toLocaleDateString("es-PE", { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</div>
              </div>
            </div>
            <div class="header-right">
              <div class="proforma-num">PROFORMA Nº Q-${String(id).padStart(6, "0")}</div>
            </div>
          </div>

          <div class="content">
            <!-- Vehicle Section -->
            <div class="vehicle-section">
              <div class="vehicle-specs">
                <div class="spec-row">
                  <div class="spec-label">MODELO</div>
                  <div class="spec-value">${cot.modelo}</div>
                </div>
                <div class="spec-row">
                  <div class="spec-label">DESCRIPCIÓN</div>
                  <div class="spec-value">${cot.version_nombre || "-"}</div>
                </div>
                <div class="spec-row">
                  <div class="spec-label">AÑO MODELO</div>
                  <div class="spec-value">${cot.anio || new Date().getFullYear()}</div>
                </div>
                <div class="spec-row">
                  <div class="spec-label">COLOR</div>
                  <div class="spec-value">${cot.color_externo || "-"}</div>
                </div>
              </div>
              <div class="vehicle-image">🚗</div>
            </div>

            <!-- Specifications Section -->
            <div class="section-title">ESPECIFICACIONES TÉCNICAS</div>
            ${
              especificaciones.length > 0
                ? `
            <table class="specifications">
              <thead>
                <tr>
                  <th>Especificación</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>
                ${especificaciones
                  .map(
                    (esp) => `
                <tr>
                  <td>${esp.especificacion_nombre}</td>
                  <td>${esp.valor}</td>
                </tr>
              `
                  )
                  .join("")}
              </tbody>
            </table>
            `
                : `<p style="font-size: 10px; color: #999;">No hay especificaciones configuradas</p>`
            }

            <!-- Summary Section -->
            <div class="section-title">RESUMEN DE COTIZACIÓN</div>
            <div class="summary-box">
              <p><strong>Vehículo:</strong> ${cot.marca} ${cot.modelo}</p>
              <p><strong>SKU:</strong> ${cot.sku || "-"}</p>
              <p><strong>Año:</strong> ${cot.anio || "-"}</p>
              <p><strong>Color Exterior:</strong> ${cot.color_externo || "-"}</p>
              <p><strong>Color Interior:</strong> ${cot.color_interno || "-"}</p>
              <p><strong>Fecha de Cotización:</strong> ${new Date(
                cot.created_at
              ).toLocaleDateString("es-PE")}</p>
              <p><strong>Estado:</strong> ${cot.estado.charAt(0).toUpperCase() + cot.estado.slice(1)}</p>
            </div>
          </div>

          <!-- Footer with User -->
          <div class="footer">
            <div class="user-signature">
              <div class="signature-line"></div>
              <div class="user-name">${usuarioNombre}</div>
              <div class="company-info">Asesor de Ventas - NISSAN PERU</div>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    console.log("HTML generado, iniciando Puppeteer...");

    // Generar PDF con Puppeteer
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });
    
    const pdfBuffer = await page.pdf({
      format: "A4",
      margin: {
        top: "10mm",
        right: "10mm",
        bottom: "10mm",
        left: "10mm",
      },
    });

    await browser.close();

    console.log("PDF generado exitosamente");

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Cotizacion-Q-${String(
          id
        ).padStart(6, "0")}.pdf"`,
      },
    });
  } catch (e) {
    console.log("Error generando PDF:", e);
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        console.log("Error cerrando browser:", closeErr);
      }
    }
    return NextResponse.json(
      { message: "Error generando PDF", error: e.message },
      { status: 500 }
    );
  }
}