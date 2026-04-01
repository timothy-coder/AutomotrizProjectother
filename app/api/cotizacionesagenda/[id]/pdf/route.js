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

    // ✅ Obtener especificaciones del modelo
    const [especificaciones] = await db.query(
      `SELECT 
        e.nombre as especificacion_nombre,
        me.valor,
        e.tipo_dato
      FROM modelo_especificaciones me
      INNER JOIN especificaciones e ON e.id = me.especificacion_id
      WHERE me.marca_id = ? AND me.modelo_id = ?
      ORDER BY e.nombre ASC`,
      [cot.marca_id, cot.modelo_id]
    );

    console.log("Especificaciones obtenidas:", especificaciones.length);

    // ✅ Obtener precios de versión
    const [preciosVersion] = await db.query(
      `SELECT 
        prv.*
      FROM precios_region_version prv
      WHERE prv.marca_id = ? AND prv.modelo_id = ? AND prv.version_id = ?`,
      [cot.marca_id, cot.modelo_id, cot.version_id]
    );

    const precioData = preciosVersion.length > 0 ? preciosVersion[0] : null;

    console.log("Precio de versión:", precioData);

    // ✅ Obtener accesorios de la cotización
    const [accesorios] = await db.query(
      `SELECT 
        ca.*,
        aa.detalle,
        aa.numero_parte,
        m.codigo as moneda_codigo,
        m.simbolo as moneda_simbolo
       FROM cotizaciones_accesorios ca
       INNER JOIN accesorios_disponibles aa ON ca.accesorio_id = aa.id
       INNER JOIN monedas m ON ca.moneda_id = m.id
       WHERE ca.cotizacion_id = ?
       ORDER BY ca.created_at DESC`,
      [id]
    );

    console.log("Accesorios obtenidos:", accesorios.length);

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
        oo.oportunidad_id,
        CONCAT(c.nombre, ' ', c.apellido) as cliente_name
      FROM oportunidades_oportunidades oo
      INNER JOIN clientes c ON c.id = oo.cliente_id
      WHERE oo.id = ?`,
      [cot.oportunidad_id]
    );

    const clienteName = oportunidad.length > 0 
      ? oportunidad[0].cliente_name
      : "Cliente";

    const oportunidadId = oportunidad.length > 0 
      ? oportunidad[0].oportunidad_id
      : "N/A";

    // ✅ Agrupar accesorios por moneda
    const accesoriosPorMoneda = {};
    accesorios.forEach((acc) => {
      const monedaCodigo = acc.moneda_codigo || "SIN_MONEDA";
      if (!accesoriosPorMoneda[monedaCodigo]) {
        accesoriosPorMoneda[monedaCodigo] = {
          simbolo: acc.moneda_simbolo,
          codigo: monedaCodigo,
          subtotal: 0,
          descuento: 0,
          total: 0,
          accesorios: [],
        };
      }
      const subtotal = Number(acc.subtotal) || 0;
      const descuento = Number(acc.descuento_monto) || 0;
      const total = Number(acc.total) || 0;

      accesoriosPorMoneda[monedaCodigo].subtotal += subtotal;
      accesoriosPorMoneda[monedaCodigo].descuento += descuento;
      accesoriosPorMoneda[monedaCodigo].total += total;
      accesoriosPorMoneda[monedaCodigo].accesorios.push(acc);
    });

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
            font-size: 10px;
            line-height: 1.4;
            color: #333;
          }
          .page { 
            width: 21cm;
            min-height: 29.7cm;
            padding: 15px;
            margin-bottom: 20px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 15px;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
          }
          .header-left { flex: 1; }
          .header-right { text-align: right; }
          .company-name { font-size: 16px; font-weight: bold; margin-bottom: 5px; }
          .client-info { margin-top: 5px; font-size: 9px; }
          .proforma-num { font-size: 13px; font-weight: bold; color: #d32f2f; }
          
          .vehicle-section {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin: 15px 0;
          }
          .vehicle-specs {
            border: 1px solid #000;
          }
          .spec-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            border-bottom: 1px solid #ccc;
            font-size: 9px;
          }
          .spec-row:last-child { border-bottom: none; }
          .spec-label {
            font-weight: bold;
            padding: 6px;
            border-right: 1px solid #ccc;
            background: #f5f5f5;
          }
          .spec-value {
            padding: 6px;
          }
          
          .section-title {
            font-weight: bold;
            font-size: 11px;
            margin-top: 15px;
            margin-bottom: 8px;
            border-bottom: 2px solid #000;
            padding-bottom: 3px;
            color: #000;
          }
          
          .specifications {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 9px;
            margin-bottom: 15px;
          }
          .specifications th {
            background: #333;
            color: #fff;
            border: 1px solid #000;
            padding: 4px;
            text-align: left;
            font-weight: bold;
          }
          .specifications td {
            border: 1px solid #ddd;
            padding: 4px;
          }
          .specifications tr:nth-child(even) {
            background: #f9f9f9;
          }
          
          .price-section {
            margin-top: 10px;
            padding: 10px;
            background: #f0f0f0;
            border: 1px solid #000;
            font-size: 9px;
          }
          
          .price-row {
            display: grid;
            grid-template-columns: 1fr auto;
            margin-bottom: 5px;
          }
          
          .price-row:last-child {
            margin-bottom: 0;
            border-top: 1px solid #000;
            padding-top: 5px;
            font-weight: bold;
            font-size: 10px;
          }
          
          .accessories-table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 8px;
            margin-bottom: 10px;
          }
          .accessories-table th {
            background: #e0e0e0;
            border: 1px solid #999;
            padding: 3px;
            text-align: left;
            font-weight: bold;
          }
          .accessories-table td {
            border: 1px solid #ddd;
            padding: 3px;
          }
          .accessories-table tr:nth-child(even) {
            background: #fafafa;
          }
          
          .summary-box {
            background: #f9f9f9;
            border: 1px solid #000;
            padding: 8px;
            margin: 10px 0;
            font-size: 9px;
          }
          
          .summary-box p {
            margin: 3px 0;
            display: grid;
            grid-template-columns: auto 1fr;
            gap: 10px;
          }
          
          .footer {
            margin-top: 20px;
            text-align: center;
            font-size: 8px;
            border-top: 1px solid #000;
            padding-top: 10px;
          }
          
          .user-signature {
            margin-top: 10px;
            text-align: center;
            font-size: 9px;
          }
          
          .signature-line {
            border-top: 1px solid #000;
            width: 150px;
            margin: 0 auto 3px;
          }
          
          .user-name {
            font-weight: bold;
            margin-bottom: 2px;
          }
          
          .company-info {
            font-size: 8px;
            color: #666;
          }
          
          .content {
            margin-bottom: 80px;
          }

          .two-columns {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }

          .info-box {
            background: #f0f0f0;
            padding: 8px;
            border: 1px solid #ccc;
            font-size: 9px;
          }

          .info-box strong {
            display: block;
            margin-top: 5px;
            margin-bottom: 2px;
          }

          .info-box strong:first-child {
            margin-top: 0;
          }

          .total-section {
            display: grid;
            grid-template-columns: auto auto;
            gap: 20px;
            margin-top: 10px;
            justify-content: end;
          }

          .total-group {
            text-align: right;
            font-size: 10px;
          }

          .total-group p {
            margin: 3px 0;
          }

          .total-value {
            font-weight: bold;
            color: #d32f2f;
            font-size: 11px;
          }

          .mono-space {
            font-family: 'Courier New', monospace;
            font-size: 9px;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <!-- Header -->
          <div class="header">
            <div class="header-left">
              <div class="company-name">NISSAN PERÚ</div>
              <div class="client-info">
                <div><strong>Cliente:</strong> ${clienteName}</div>
                <div><strong>Oportunidad:</strong> ${oportunidadId}</div>
              </div>
              <div class="client-info" style="margin-top: 8px;">
                <div>${new Date().toLocaleDateString("es-PE", { 
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
                  <div class="spec-label">MARCA</div>
                  <div class="spec-value">${cot.marca}</div>
                </div>
                <div class="spec-row">
                  <div class="spec-label">MODELO</div>
                  <div class="spec-value">${cot.modelo}</div>
                </div>
                <div class="spec-row">
                  <div class="spec-label">VERSIÓN</div>
                  <div class="spec-value">${cot.version_nombre || "-"}</div>
                </div>
                <div class="spec-row">
                  <div class="spec-label">AÑO MODELO</div>
                  <div class="spec-value">${cot.anio || new Date().getFullYear()}</div>
                </div>
                <div class="spec-row">
                  <div class="spec-label">SKU</div>
                  <div class="spec-value mono-space">${cot.sku || "-"}</div>
                </div>
                <div class="spec-row">
                  <div class="spec-label">COLOR EXT.</div>
                  <div class="spec-value">${cot.color_externo || "-"}</div>
                </div>
                <div class="spec-row">
                  <div class="spec-label">COLOR INT.</div>
                  <div class="spec-value">${cot.color_interno || "-"}</div>
                </div>
              </div>

              <div>
                ${
                  precioData
                    ? `
                  <div class="price-section">
                    <div style="font-weight: bold; margin-bottom: 5px; border-bottom: 1px solid #000; padding-bottom: 3px;">
                      INFORMACIÓN DE PRECIO
                    </div>
                    <div class="price-row">
                      <span>Precio Base:</span>
                      <span><strong>$${Number(precioData.precio_base).toLocaleString("es-PE")}</strong></span>
                    </div>
                    <div class="price-row">
                      <span>Stock:</span>
                      <span>${precioData.en_stock ? "✓ En Stock" : "⊗ Sin Stock"}</span>
                    </div>
                    ${
                      precioData.tiempo_entrega_dias > 0
                        ? `
                      <div class="price-row">
                        <span>Entrega:</span>
                        <span>${precioData.tiempo_entrega_dias} días</span>
                      </div>
                    `
                        : ""
                    }
                  </div>
                `
                    : ""
                }
              </div>
            </div>

            <!-- Specifications Section -->
            ${
              especificaciones.length > 0
                ? `
            <div class="section-title">ESPECIFICACIONES TÉCNICAS</div>
            <table class="specifications">
              <thead>
                <tr>
                  <th style="width: 50%;">Especificación</th>
                  <th style="width: 50%;">Valor</th>
                </tr>
              </thead>
              <tbody>
                ${especificaciones
                  .map(
                    (esp) => `
                <tr>
                  <td>${esp.especificacion_nombre}</td>
                  <td>${esp.valor.substring(0, 50)}${esp.valor.length > 50 ? "..." : ""}</td>
                </tr>
              `
                  )
                  .join("")}
              </tbody>
            </table>
            `
                : ""
            }

            <!-- Accessories Section -->
            ${
              accesorios.length > 0
                ? `
            <div class="section-title">ACCESORIOS INCLUIDOS</div>
            ${Object.keys(accesoriosPorMoneda)
              .map(
                (monedaCodigo) => `
              <div style="margin-bottom: 12px;">
                <div style="font-weight: bold; font-size: 9px; margin-bottom: 3px; color: #333;">
                  Accesorios en ${accesoriosPorMoneda[monedaCodigo].simbolo}
                </div>
                <table class="accessories-table">
                  <thead>
                    <tr>
                      <th>Descripción</th>
                      <th>N° Parte</th>
                      <th style="text-align: right;">Cantidad</th>
                      <th style="text-align: right;">Unitario</th>
                      <th style="text-align: right;">Subtotal</th>
                      <th style="text-align: right;">Descuento</th>
                      <th style="text-align: right;">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${accesoriosPorMoneda[monedaCodigo].accesorios
                      .map(
                        (acc) => `
                      <tr>
                        <td>${acc.detalle}</td>
                        <td>${acc.numero_parte}</td>
                        <td style="text-align: right;">${acc.cantidad}</td>
                        <td style="text-align: right;">$${Number(acc.precio_unitario).toFixed(2)}</td>
                        <td style="text-align: right;">$${Number(acc.subtotal).toFixed(2)}</td>
                        <td style="text-align: right;">
                          ${
                            acc.descuento_monto && Number(acc.descuento_monto) > 0
                              ? `-$${Number(acc.descuento_monto).toFixed(2)} (${acc.descuento_porcentaje}%)`
                              : "-"
                          }
                        </td>
                        <td style="text-align: right;"><strong>$${Number(acc.total).toFixed(2)}</strong></td>
                      </tr>
                    `
                      )
                      .join("")}
                  </tbody>
                </table>
                <div class="total-section">
                  <div class="total-group">
                    <p>Subtotal: <span class="total-value">$${Number(accesoriosPorMoneda[monedaCodigo].subtotal).toFixed(2)}</span></p>
                    <p>Descuentos: <span class="total-value">-$${Number(accesoriosPorMoneda[monedaCodigo].descuento).toFixed(2)}</span></p>
                    <p style="border-top: 1px solid #000; padding-top: 3px; margin-top: 3px;">
                      Total: <span class="total-value" style="font-size: 12px;">$${Number(accesoriosPorMoneda[monedaCodigo].total).toFixed(2)}</span>
                    </p>
                  </div>
                </div>
              </div>
            `
              )
              .join("")}
            `
                : ""
            }

            <!-- Summary Section -->
            <div class="section-title">RESUMEN GENERAL</div>
            <div class="two-columns">
              <div class="info-box">
                <strong>Información del Vehículo</strong>
                <div>Marca: ${cot.marca}</div>
                <div>Modelo: ${cot.modelo}</div>
                <div>Versión: ${cot.version_nombre || "-"}</div>
                <div>Año: ${cot.anio || "-"}</div>
                <div>SKU: ${cot.sku || "-"}</div>
              </div>
              <div class="info-box">
                <strong>Información de Cotización</strong>
                <div>Cotización #: Q-${String(id).padStart(6, "0")}</div>
                <div>Oportunidad: ${oportunidadId}</div>
                <div>Cliente: ${clienteName}</div>
                <div>Fecha: ${new Date(cot.created_at).toLocaleDateString("es-PE")}</div>
                <div>Estado: <span style="font-weight: bold; color: ${cot.estado === "enviada" ? "#27ae60" : cot.estado === "borrador" ? "#f39c12" : "#e74c3c"};">${cot.estado}</span></div>
              </div>
            </div>
          </div>

          <!-- Footer with User -->
          <div class="footer">
            <div class="user-signature">
              <div class="signature-line"></div>
              <div class="user-name">${usuarioNombre}</div>
              <div class="company-info">Asesor de Ventas - NISSAN PERÚ</div>
            </div>
            <div style="margin-top: 5px; font-size: 8px; color: #999;">
              Documento generado automáticamente el ${new Date().toLocaleDateString("es-PE")} ${new Date().toLocaleTimeString("es-PE")}
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