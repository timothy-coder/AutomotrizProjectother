// app/api/cotizaciones-pdf/route.js

import { NextResponse } from 'next/server';
import jsPDF from 'jspdf';

export async function POST(req) {
  try {
    const { cotizacion_id } = await req.json();

    if (!cotizacion_id) {
      return NextResponse.json(
        { error: 'cotizacion_id es requerido' },
        { status: 400 }
      );
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

    // 2. Cálculos (SIN REGALOS)
    const precioVehiculo = precioActual ? parseFloat(precioActual.precio_base) : 0;
    
    const subtotalAcc = accesorios.reduce((sum, a) => sum + parseFloat(a.subtotal || 0), 0);
    const descuentosAcc = accesorios.reduce((sum, a) => sum + parseFloat(a.descuento_monto || 0), 0);

    const subtotal = precioVehiculo + subtotalAcc;
    const descuentos = descuentosAcc;
    const subtotalSinIgv = subtotal - descuentos;
    const igv = subtotalSinIgv * 0.18;
    const granTotal = subtotalSinIgv + igv;

    // 3. Crear PDF
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    let yPosition = 15;

    // Header
    doc.setFontSize(24);
    doc.setFont(undefined, 'bold');
    doc.text('COTIZACIÓN', 105, yPosition, { align: 'center' });

    yPosition += 15;
    doc.setFontSize(12);
    doc.setFont(undefined, 'normal');
    doc.text(`Q-${String(cotizacion_id).padStart(6, '0')}`, 105, yPosition, { align: 'center' });

    yPosition += 20;

    // Cliente
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('CLIENTE:', 15, yPosition);

    yPosition += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(oportunidad.cliente_nombre || 'N/A', 15, yPosition);

    yPosition += 5;
    doc.setFontSize(9);
    doc.text(oportunidad.cliente_email || 'N/A', 15, yPosition);

    yPosition += 15;

    // Vehículo
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('VEHÍCULO:', 15, yPosition);

    yPosition += 7;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
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

    // Precio del vehículo
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text('Precio Base:', 15, yPosition);

    if (precioActual) {
      doc.setFont(undefined, 'normal');
      doc.setTextColor(46, 204, 113);
      doc.text(`$${precioVehiculo.toFixed(2)}`, 60, yPosition);
      doc.setTextColor(0, 0, 0);
    } else {
      doc.text('N/A', 60, yPosition);
    }

    yPosition += 15;

    // Especificaciones
    if (especificaciones.length > 0) {
      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('ESPECIFICACIONES:', 15, yPosition);

      yPosition += 10;
      doc.setFontSize(9);

      const especsByRow = 3;
      let especIndex = 0;
      let especYPos = yPosition;
      let especXPos = 15;

      especificaciones.forEach((espec, index) => {
        // Saltar a siguiente página si es necesario
        if (especYPos > 260) {
          doc.addPage();
          especYPos = 15;
          especXPos = 15;
          especIndex = 0;
        }

        // Procesar especificaciones
        if (espec.tipo_dato === 'media' && espec.valor) {
          // Mostrar imagen
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
            doc.text(espec.especificacion_nombre.toUpperCase(), especXPos, especYPos + 32);
            especYPos += 40;
          } catch (err) {
            console.log('Error cargando imagen:', espec.valor);
            doc.setFontSize(8);
            doc.text(`${espec.especificacion_nombre}: [Imagen no disponible]`, especXPos, especYPos);
            especYPos += 8;
          }
        } else if (espec.tipo_dato === 'texto' && espec.valor.includes('http')) {
          // URL - intentar cargar como imagen
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
            doc.text(espec.especificacion_nombre.toUpperCase(), especXPos, especYPos + 32);
            especYPos += 40;
          } catch (err) {
            // Si no es imagen, mostrar como link
            doc.setTextColor(0, 102, 204);
            doc.setFont(undefined, 'underline');
            doc.text('Ver ' + espec.especificacion_nombre, especXPos, especYPos);
            doc.textWithLink(espec.valor, especXPos + 20, especYPos, {
              pageNumber: 1,
              url: espec.valor
            });
            doc.setFont(undefined, 'normal');
            doc.setTextColor(0, 0, 0);
            especYPos += 8;
          }
        } else if (espec.tipo_dato === 'texto') {
          // Texto normal
          doc.setFontSize(8);
          doc.setFont(undefined, 'bold');
          doc.text(`${espec.especificacion_nombre}:`, especXPos, especYPos);
          doc.setFont(undefined, 'normal');
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

    // Accesorios
    if (accesorios.length > 0) {
      if (yPosition > 230) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('ACCESORIOS', 15, yPosition);

      yPosition += 10;
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');

      doc.text('Descripción', 15, yPosition);
      doc.text('Cant.', 115, yPosition, { align: 'center' });
      doc.text('Unitario', 135, yPosition, { align: 'right' });
      doc.text('Subtotal', 160, yPosition, { align: 'right' });
      doc.text('Total', 190, yPosition, { align: 'right' });

      yPosition += 5;
      doc.setDrawColor(200);
      doc.line(15, yPosition, 195, yPosition);

      yPosition += 5;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);

      accesorios.forEach((acc) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 15;
        }

        const totalSinIgv = parseFloat(acc.subtotal) - parseFloat(acc.descuento_monto || 0);
        const totalConIgv = totalSinIgv * 1.18;

        doc.text(acc.detalle.substring(0, 50), 15, yPosition);
        doc.text(String(acc.cantidad), 115, yPosition, { align: 'center' });
        doc.text(`$${parseFloat(acc.precio_unitario).toFixed(2)}`, 135, yPosition, { align: 'right' });
        doc.text(`$${parseFloat(acc.subtotal).toFixed(2)}`, 160, yPosition, { align: 'right' });
        doc.text(`$${totalConIgv.toFixed(2)}`, 190, yPosition, { align: 'right' });

        yPosition += 6;
      });

      yPosition += 5;
    }

    // Regalos (solo mostrar, sin sumar)
    if (regalos.length > 0) {
      if (yPosition > 230) {
        doc.addPage();
        yPosition = 15;
      }

      doc.setFontSize(11);
      doc.setFont(undefined, 'bold');
      doc.text('REGALOS INCLUIDOS', 15, yPosition);

      yPosition += 10;
      doc.setFontSize(9);
      doc.setFont(undefined, 'bold');

      doc.text('Descripción', 15, yPosition);
      doc.text('Cant.', 115, yPosition, { align: 'center' });
      doc.text('Lote', 160, yPosition, { align: 'right' });

      yPosition += 5;
      doc.setDrawColor(200);
      doc.line(15, yPosition, 195, yPosition);

      yPosition += 5;
      doc.setFont(undefined, 'normal');
      doc.setFontSize(8);

      regalos.forEach((regalo) => {
        if (yPosition > 270) {
          doc.addPage();
          yPosition = 15;
        }

        doc.text(regalo.detalle.substring(0, 70), 15, yPosition);
        doc.text(String(regalo.cantidad), 115, yPosition, { align: 'center' });
        doc.text(regalo.lote || '-', 160, yPosition, { align: 'right' });

        yPosition += 6;
      });

      yPosition += 5;
    }

    if (yPosition > 230) {
      doc.addPage();
      yPosition = 15;
    }

    yPosition += 10;

    // Totales (sin regalos)
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('RESUMEN:', 15, yPosition);

    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont(undefined, 'normal');
    doc.text(`Precio Vehículo:`, 120, yPosition, { align: 'right' });
    doc.text(`$${precioVehiculo.toFixed(2)}`, 190, yPosition, { align: 'right' });

    yPosition += 6;
    doc.text(`Accesorios:`, 120, yPosition, { align: 'right' });
    doc.text(`$${subtotalAcc.toFixed(2)}`, 190, yPosition, { align: 'right' });

    yPosition += 6;
    doc.text(`Subtotal:`, 120, yPosition, { align: 'right' });
    doc.text(`$${subtotal.toFixed(2)}`, 190, yPosition, { align: 'right' });

    yPosition += 6;
    doc.text(`Descuentos:`, 120, yPosition, { align: 'right' });
    doc.text(`-$${descuentos.toFixed(2)}`, 190, yPosition, { align: 'right' });

    yPosition += 6;
    doc.text(`IGV (18%):`, 120, yPosition, { align: 'right' });
    doc.text(`+$${igv.toFixed(2)}`, 190, yPosition, { align: 'right' });

    yPosition += 8;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.setTextColor(46, 204, 113);
    doc.text(`TOTAL: $${granTotal.toFixed(2)}`, 190, yPosition, { align: 'right' });
    doc.setTextColor(0, 0, 0);

    yPosition += 20;

    // Vigencia
    doc.setFontSize(9);
    doc.setFont(undefined, 'normal');
    doc.text('Vigencia: 30 días', 15, yPosition);

    yPosition += 15;

    // Firma con nombre desde fullname
    doc.setFontSize(11);
    doc.setFont(undefined, 'bold');
    doc.text('Autorizado por:', 15, yPosition);

    yPosition += 15;
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text((cotizacion.fullname || 'Usuario').toUpperCase(), 15, yPosition);

    // Línea de firma
    yPosition += 8;
    doc.setDrawColor(0);
    doc.line(15, yPosition, 80, yPosition);

    yPosition += 5;
    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 15, yPosition);

    // Generar PDF
    const pdfBuffer = Buffer.from(doc.output('arraybuffer'));

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