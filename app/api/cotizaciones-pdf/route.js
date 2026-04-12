// app/api/cotizaciones-pdf/route.js

import { NextResponse } from 'next/server';
import jsPDF from 'jspdf';
import fs from 'fs';
import path from 'path';

export async function POST(req) {
  try {
    const { cotizacion_id } = await req.json();

    if (!cotizacion_id) {
      return NextResponse.json(
        { error: 'cotizacion_id es requerido' },
        { status: 400 }
      );
    }

    // ✅ CARGAR FUENTE TTF
    const fontPath = path.join(process.cwd(), 'public/fonts/Autography.ttf');
    const fontData = fs.readFileSync(fontPath);
    const fontBase64 = fontData.toString('base64');

    // ✅ CARGAR PLANTILLA
    const plantillaPath = path.join(process.cwd(), 'public/plantilla-pdf.json');
    let plantilla = {};
    if (fs.existsSync(plantillaPath)) {
      const plantillaData = fs.readFileSync(plantillaPath, 'utf-8');
      plantilla = JSON.parse(plantillaData);
    }

    // 1. Obtener datos
    const resCot = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/cotizacionesagenda/${cotizacion_id}`,
      { cache: 'no-store' }
    );

    if (!resCot.ok) {
      return NextResponse.json(
        { error: 'Cotización no encontrada' },
        { status: 404 }
      );
    }

    const cotizacion = await resCot.json();

    const resAcc = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/cotizaciones-accesorios/by-cotizacion/${cotizacion_id}`,
      { cache: 'no-store' }
    );
    const accesorios = resAcc.ok ? await resAcc.json() : [];

    const resReg = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/cotizaciones-regalos/by-cotizacion/${cotizacion_id}`,
      { cache: 'no-store' }
    );
    const regalos = resReg.ok ? await resReg.json() : [];

    const resOpo = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/oportunidades-oportunidades/${cotizacion.oportunidad_id}`,
      { cache: 'no-store' }
    );
    const oportunidad = resOpo.ok ? await resOpo.json() : {};

    // Obtener precio del vehículo
    const resPrecio = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/precios-region-version?marca_id=${cotizacion.marca_id}&modelo_id=${cotizacion.modelo_id}&version_id=${cotizacion.version_id || ''}`,
      { cache: 'no-store' }
    );
    const preciosData = resPrecio.ok ? await resPrecio.json() : [];
    const precioActual = Array.isArray(preciosData) ? preciosData[0] : null;

    // Obtener especificaciones
    const resEspec = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/modelo-especificaciones?marca_id=${cotizacion.marca_id}&modelo_id=${cotizacion.modelo_id}`,
      { cache: 'no-store' }
    );
    const especificaciones = resEspec.ok ? await resEspec.json() : [];

    // Obtener IGV
    const resIgv = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/api/impuestos`,
      { cache: 'no-store' }
    );
    const impuestos = resIgv.ok ? await resIgv.json() : [];
    const igvData = impuestos.find((imp) => imp.nombre === 'IGV');
    const IGV_RATE = igvData ? parseFloat(igvData.porcentaje) / 100 : 0.18;

    // ✅ 2. Cálculos (CON PRECIOS QUE YA INCLUYEN IGV)
    const precioVehiculoConIgv = precioActual ? parseFloat(precioActual.precio_base) : 0;
    const precioVehiculoSinIgv = precioVehiculoConIgv / (1 + IGV_RATE);
    const igvVehiculo = precioVehiculoConIgv - precioVehiculoSinIgv;
    
    // Descuento vehículo
    const descuentoVehiculoConIgv = 
      parseFloat(cotizacion.descuento_vehículo) > 0
        ? parseFloat(cotizacion.descuento_vehículo)
        : precioVehiculoConIgv * (parseFloat(cotizacion.descuento_vehículo_porcentaje) / 100 || 0);
    
    const descuentoVehiculoSinIgv = descuentoVehiculoConIgv / (1 + IGV_RATE);
    
    const precioVehiculoConDescuentoSinIgv = precioVehiculoSinIgv - descuentoVehiculoSinIgv;
    const precioVehiculoConDescuentoConIgv = precioVehiculoConDescuentoSinIgv * (1 + IGV_RATE);

    // ✅ Accesorios (YA INCLUYEN IGV EN SUS TOTALES)
    const accesoriosSubtotalConIgv = accesorios.reduce((sum, a) => sum + parseFloat(a.subtotal || 0), 0);
    const accesoriosDescuentoItems = accesorios.reduce((sum, a) => sum + parseFloat(a.descuento_monto || 0), 0);
    const accesoriosTotalConIgv = accesorios.reduce((sum, a) => sum + parseFloat(a.total || 0), 0);
    const accesoriosTotalSinIgv = accesoriosTotalConIgv / (1 + IGV_RATE);
    const accesoriosIgv = accesoriosTotalConIgv - accesoriosTotalSinIgv;
    
    // Descuento general accesorios
    const descuentoAccConIgv = parseFloat(cotizacion.descuento_total_accesorios || 0);
    const descuentoAccSinIgv = descuentoAccConIgv / (1 + IGV_RATE);

    // ✅ Regalos (YA INCLUYEN IGV EN SUS TOTALES)
    const regalosSubtotalConIgv = regalos.reduce((sum, r) => sum + parseFloat(r.subtotal || 0), 0);
    const regalosDescuentoItems = regalos.reduce((sum, r) => sum + parseFloat(r.descuento_monto || 0), 0);
    const regalosTotalConIgv = regalos.reduce((sum, r) => sum + parseFloat(r.total || 0), 0);
    const regalosTotalSinIgv = regalosTotalConIgv / (1 + IGV_RATE);
    const regalosIgv = regalosTotalConIgv - regalosTotalSinIgv;
    
    // Descuento general regalos
    const descuentoRegConIgv = parseFloat(cotizacion.descuento_total_regalos || 0);
    const descuentoRegSinIgv = descuentoRegConIgv / (1 + IGV_RATE);

    // ✅ Totales generales SIN IGV
    const subtotalSinIgv = 
      precioVehiculoConDescuentoSinIgv + 
      accesoriosTotalSinIgv + 
      regalosTotalSinIgv - 
      descuentoAccSinIgv - 
      descuentoRegSinIgv;

    // ✅ IGV total
    const igvTotal = subtotalSinIgv * IGV_RATE;

    // ✅ Gran total
    const granTotal = subtotalSinIgv + igvTotal;

    // 3. Crear PDF
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    // ✅ REGISTRAR FUENTE TTF
    doc.addFileToVFS('Autography.ttf', fontBase64);
    doc.addFont('Autography.ttf', 'Autography', 'normal');

    let yPosition = 15;

    // ✅ ENCABEZADO CON PLANTILLA
    if (plantilla.encabezado?.logo_url) {
      try {
        const logoPath = path.join(process.cwd(), 'public', plantilla.encabezado.logo_url);
        if (fs.existsSync(logoPath)) {
          const logoData = fs.readFileSync(logoPath);
          const logoBase64 = logoData.toString('base64');
          const ext = plantilla.encabezado.logo_url.split('.').pop().toUpperCase();
          doc.addImage(logoBase64, ext, 15, yPosition, 50, 20);
          yPosition += 25;
        }
      } catch (err) {
        console.log('Error cargando logo:', err);
      }
    }

    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    
    // ✅ Convertir color hex a RGB
    const colorHex = plantilla.encabezado?.color_titulo || '#2ecc71';
    const r = parseInt(colorHex.slice(1, 3), 16);
    const g = parseInt(colorHex.slice(3, 5), 16);
    const b = parseInt(colorHex.slice(5, 7), 16);
    doc.setTextColor(r, g, b);
    
    doc.text(plantilla.encabezado?.titulo || 'COTIZACIÓN', 105, yPosition, { align: 'center' });
    doc.setTextColor(0, 0, 0);

    yPosition += 15;
    
    if (plantilla.encabezado?.mostrar_numero !== false) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Q-${String(cotizacion_id).padStart(6, '0')}`, 105, yPosition, { align: 'center' });
      yPosition += 20;
    } else {
      yPosition += 5;
    }

    // ✅ CLIENTE (USAR PLANTILLA)
    if (plantilla.cliente?.mostrar !== false) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(plantilla.cliente?.titulo || 'CLIENTE:', 15, yPosition);

      yPosition += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(oportunidad.cliente_nombre || 'N/A', 15, yPosition);

      yPosition += 5;
      doc.setFontSize(9);
      doc.text(oportunidad.cliente_email || 'N/A', 15, yPosition);

      yPosition += 15;
    }

    // ✅ VEHÍCULO (USAR PLANTILLA)
    if (plantilla.vehiculo?.mostrar !== false) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(plantilla.vehiculo?.titulo || 'VEHÍCULO:', 15, yPosition);

      yPosition += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(
        `${cotizacion.marca} ${cotizacion.modelo} ${cotizacion.version || ''} (${cotizacion.anio})`,
        15,
        yPosition
      );

      yPosition += 5;
      doc.setFontSize(9);
      doc.text(`Color Externo: ${cotizacion.color_externo || 'N/A'}`, 15, yPosition);

      yPosition += 5;
      doc.text(`Color Interno: ${cotizacion.color_interno || 'N/A'}`, 15, yPosition);

      yPosition += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Precio Base:', 15, yPosition);

      if (precioActual) {
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(46, 204, 113);
        doc.text(`$${precioVehiculoConIgv.toFixed(2)}`, 60, yPosition);
        doc.setTextColor(0, 0, 0);
      } else {
        doc.setFont('helvetica', 'normal');
        doc.text('N/A', 60, yPosition);
      }

      yPosition += 15;
    }

    // ✅ ESPECIFICACIONES (USAR PLANTILLA)
    if (plantilla.especificaciones?.mostrar !== false && especificaciones.length > 0) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(plantilla.especificaciones?.titulo || 'ESPECIFICACIONES:', 15, yPosition);

      yPosition += 10;
      doc.setFontSize(9);

      const especsByRow = 3;
      let especIndex = 0;
      let especYPos = yPosition;
      let especXPos = 15;

      especificaciones.forEach((espec) => {
        if (especYPos > 260) {
          doc.addPage();
          especYPos = 15;
          especXPos = 15;
          especIndex = 0;
        }

        if (espec.tipo_dato === 'media' && espec.valor) {
          try {
            doc.addImage(
              espec.valor,
              'JPEG',
              especXPos,
              especYPos,
              50,
              30
            );
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(espec.especificacion_nombre.toUpperCase(), especXPos, especYPos + 32);
            especYPos += 40;
          } catch (err) {
            console.log('Error cargando imagen:', espec.valor);
            doc.setFontSize(8);
            doc.setFont('helvetica', 'normal');
            doc.text(`${espec.especificacion_nombre}: [Imagen no disponible]`, especXPos, especYPos);
            especYPos += 8;
          }
        } else if (espec.tipo_dato === 'texto' && espec.valor.includes('http')) {
          doc.setTextColor(0, 102, 204);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.text('Ver ' + espec.especificacion_nombre, especXPos, especYPos);
          doc.setTextColor(0, 0, 0);
          especYPos += 8;
        } else if (espec.tipo_dato === 'texto') {
          doc.setFontSize(8);
          doc.setFont('helvetica', 'bold');
          doc.text(`${espec.especificacion_nombre}:`, especXPos, especYPos);
          doc.setFont('helvetica', 'normal');
          doc.text(espec.valor, especXPos, especYPos + 5);
          especYPos += 15;
        }

        especIndex++;
        if (especIndex >= especsByRow) {
          especIndex = 0;
          especXPos = 15;
          especYPos += 5;
        } else {
          especXPos += 65;
        }
      });

      yPosition = especYPos + 15;
    }

    // ✅ ACCESORIOS (USAR PLANTILLA)
    if (plantilla.accesorios?.mostrar !== false && accesorios.length > 0) {
      if (yPosition > 230) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(plantilla.accesorios?.titulo || 'ACCESORIOS', 15, yPosition);

      yPosition += 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');

      doc.text('Descripción', 15, yPosition);
      doc.text('Cant.', 115, yPosition, { align: 'center' });
      doc.text('Unitario', 135, yPosition, { align: 'right' });
      doc.text('Desc.', 160, yPosition, { align: 'right' });
      doc.text('Total', 190, yPosition, { align: 'right' });

      yPosition += 5;
      doc.setDrawColor(200);
      doc.line(15, yPosition, 195, yPosition);

      yPosition += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      accesorios.forEach((acc) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 15;
        }

        const descuentoMonto = parseFloat(acc.descuento_monto || 0);
        const totalConDesc = parseFloat(acc.total || 0);

        doc.text(acc.detalle.substring(0, 50), 15, yPosition);
        doc.text(String(acc.cantidad), 115, yPosition, { align: 'center' });
        doc.text(`$${parseFloat(acc.precio_unitario).toFixed(2)}`, 135, yPosition, { align: 'right' });
        doc.text(`-$${descuentoMonto.toFixed(2)}`, 160, yPosition, { align: 'right' });
        doc.text(`$${totalConDesc.toFixed(2)}`, 190, yPosition, { align: 'right' });

        yPosition += 6;
      });

      yPosition += 5;
    }

    // ✅ REGALOS (USAR PLANTILLA)
    if (plantilla.regalos?.mostrar !== false && regalos.length > 0) {
      if (yPosition > 230) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(plantilla.regalos?.titulo || 'REGALOS INCLUIDOS', 15, yPosition);

      yPosition += 10;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');

      doc.text('Descripción', 15, yPosition);
      doc.text('Cant.', 115, yPosition, { align: 'center' });
      doc.text('Desc.', 160, yPosition, { align: 'right' });
      doc.text('Total', 190, yPosition, { align: 'right' });

      yPosition += 5;
      doc.setDrawColor(200);
      doc.line(15, yPosition, 195, yPosition);

      yPosition += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);

      regalos.forEach((regalo) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 15;
        }

        const descuentoMonto = parseFloat(regalo.descuento_monto || 0);
        const totalConDesc = parseFloat(regalo.total || 0);

        doc.text(regalo.detalle.substring(0, 70), 15, yPosition);
        doc.text(String(regalo.cantidad), 115, yPosition, { align: 'center' });
        doc.text(`-$${descuentoMonto.toFixed(2)}`, 160, yPosition, { align: 'right' });
        doc.text(`$${totalConDesc.toFixed(2)}`, 190, yPosition, { align: 'right' });

        yPosition += 6;
      });

      yPosition += 5;
    }

    if (yPosition > 230) {
      doc.addPage();
      yPosition = 15;
    }

    yPosition += 10;

    // ✅ RESUMEN (USAR PLANTILLA)
    if (plantilla.resumen?.mostrar !== false) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(plantilla.resumen?.titulo || 'RESUMEN:', 15, yPosition);

      yPosition += 8;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      
      doc.text(`Vehículo (c/IGV):`, 120, yPosition, { align: 'right' });
      doc.text(`$${precioVehiculoConIgv.toFixed(2)}`, 190, yPosition, { align: 'right' });

      yPosition += 6;
      if (descuentoVehiculoConIgv > 0) {
        doc.text(`Desc. Vehículo:`, 120, yPosition, { align: 'right' });
        doc.text(`-$${descuentoVehiculoConIgv.toFixed(2)}`, 190, yPosition, { align: 'right' });
        yPosition += 6;
      }

      doc.text(`Accesorios (c/IGV):`, 120, yPosition, { align: 'right' });
      doc.text(`$${accesoriosTotalConIgv.toFixed(2)}`, 190, yPosition, { align: 'right' });

      yPosition += 6;
      if (descuentoAccConIgv > 0) {
        doc.text(`Desc. Accesorios:`, 120, yPosition, { align: 'right' });
        doc.text(`-$${descuentoAccConIgv.toFixed(2)}`, 190, yPosition, { align: 'right' });
        yPosition += 6;
      }

      if (regalosTotalConIgv > 0) {
        doc.text(`Regalos (c/IGV):`, 120, yPosition, { align: 'right' });
        doc.text(`$${regalosTotalConIgv.toFixed(2)}`, 190, yPosition, { align: 'right' });

        yPosition += 6;
        if (descuentoRegConIgv > 0) {
          doc.text(`Desc. Regalos:`, 120, yPosition, { align: 'right' });
          doc.text(`-$${descuentoRegConIgv.toFixed(2)}`, 190, yPosition, { align: 'right' });
          yPosition += 6;
        }
      }

      yPosition += 2;
      doc.text(`Subtotal (S/IGV):`, 120, yPosition, { align: 'right' });
      doc.text(`$${subtotalSinIgv.toFixed(2)}`, 190, yPosition, { align: 'right' });

      yPosition += 6;
      doc.text(`IGV (${(IGV_RATE * 100).toFixed(0)}%):`, 120, yPosition, { align: 'right' });
      doc.text(`+$${igvTotal.toFixed(2)}`, 190, yPosition, { align: 'right' });

      yPosition += 8;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(r, g, b);
      doc.text(`TOTAL: $${granTotal.toFixed(2)}`, 190, yPosition, { align: 'right' });
      doc.setTextColor(0, 0, 0);

      yPosition += 20;
    }

    // ✅ PIE DE PÁGINA (USAR PLANTILLA)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Vigencia: ${plantilla.pie?.vigencia || '30 días'}`, 15, yPosition);

    yPosition += 15;

    // ✅ FIRMA (USAR PLANTILLA)
    if (plantilla.pie?.mostrar_firma !== false) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(plantilla.pie?.texto_firma || 'Autorizado por:', 15, yPosition);

      yPosition += 15;
      doc.setFontSize(28);
      doc.setFont('Autography', 'normal');
      doc.text((cotizacion.fullname || 'Usuario'), 15, yPosition);

      yPosition += 14;
      doc.setDrawColor(0);
      doc.line(15, yPosition, 80, yPosition);

      yPosition += 5;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 15, yPosition);
    }

    // ✅ GENERAR PDF
    const pdfBytes = doc.output('arraybuffer');

    if (!pdfBytes) {
      throw new Error('Error al generar el buffer del PDF');
    }

    const pdfBuffer = Buffer.from(pdfBytes);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="cotizacion-${cotizacion_id}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generando PDF:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    );
  }
}