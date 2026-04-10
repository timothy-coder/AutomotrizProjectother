import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import jsPDF from "jspdf";

export async function GET(request, { params }) {
  try {
    const { id } = await params;

    if (!id || isNaN(id)) {
      return NextResponse.json(
        { message: "ID inválido" },
        { status: 400 }
      );
    }

    // ✅ Obtener información básica de la reserva
    const [rows] = await db.query(`
      SELECT 
        r.id,
        r.oportunidad_id,
        r.created_by,
        r.created_at,
        r.updated_at,
        r.estado,
        u.fullname as created_by_name,
        oo.oportunidad_id as oportunidad_codigo,
        oo.cliente_id,
        CONCAT(c.nombre, ' ', c.apellido) as cliente_nombre,
        c.email as cliente_email,
        c.celular as cliente_telefono,
        c.identificacion_fiscal as cliente_dni,
        e.nombre as etapa_nombre
      FROM reservas r
      LEFT JOIN usuarios u ON r.created_by = u.id
      LEFT JOIN oportunidades_oportunidades oo ON r.oportunidad_id = oo.id
      LEFT JOIN clientes c ON oo.cliente_id = c.id
      LEFT JOIN etapasconversion e ON oo.etapasconversion_id = e.id
      WHERE r.id = ?
    `, [id]);

    if (rows.length === 0) {
      return NextResponse.json(
        { message: "Reserva no encontrada" },
        { status: 404 }
      );
    }

    const reserva = rows[0];
    const oportunidadId = reserva.oportunidad_id;

    // ✅ Obtener detalles completos de la reserva
    const [detalles] = await db.query(`
      SELECT 
        rd.id as detalle_id,
        rd.departamento_id,
        rd.provincia_id,
        rd.distrito_id,
        rd.tipo_comprobante,
        c.identificacion_fiscal,
        c.nombre_comercial,
        rd.fecha_nacimiento,
        rd.ocupacion,
        rd.domicilio,
        d.nombre as departamento_nombre,
        p.nombre as provincia_nombre,
        di.nombre as distrito_nombre,
        c.email,
        c.celular,
        rd.nombreconyugue,
        rd.dniconyugue,
        oo.oportunidad_id,
        m.name as marca_nombre,
        mo.name as modelo_nombre,
        cl.name as clase_nombre,
        v.nombre as version_nombre,
        rd.vin,
        rd.usovehiculo,
        ca.anio,
        ca.color_externo,
        ca.color_interno,
        prv.precio_base,
        rd.numero_motor,
        rd.dsctocredinissan,
        rd.dsctotienda,
        rd.dsctobonoretoma,
        rd.dsctonper,
        rd.cantidad,
        rd.precio_unitario,
        rd.flete,
        rd.tarjetaplaca,
        rd.glp,
        rd.tc_referencial,
        rd.total,
        rd.descripcion,
        ca.id as cotizacion_id
      FROM reserva_detalles rd
      JOIN reservas r ON r.id = rd.reserva_id
      JOIN oportunidades_oportunidades oo ON oo.id = r.oportunidad_id
      JOIN clientes c ON oo.cliente_id = c.id
      JOIN cotizacionesagenda ca ON ca.id = rd.cotizacion_id
      JOIN marcas m ON m.id = ca.marca_id
      JOIN modelos mo ON ca.modelo_id = mo.id
      LEFT JOIN departamentos d ON d.id = rd.departamento_id
      LEFT JOIN provincias p ON p.id = rd.provincia_id
      LEFT JOIN distritos di ON di.id = rd.distrito_id
      LEFT JOIN clases cl ON cl.id = mo.clase_id
      LEFT JOIN versiones v ON v.id = ca.version_id
      LEFT JOIN precios_region_version prv ON prv.marca_id = m.id 
        AND prv.modelo_id = mo.id 
        AND prv.version_id = v.id
      WHERE rd.reserva_id = ?
      ORDER BY rd.created_at DESC
      LIMIT 1
    `, [id]);

    if (detalles.length === 0) {
      return NextResponse.json(
        { message: "Detalles de reserva no encontrados" },
        { status: 404 }
      );
    }

    const detalle = detalles[0];
    const fechaFormato = new Date(reserva.created_at).toLocaleDateString("es-ES");

    // ✅ Obtener usuario que creó la reserva (para firma)
    const [usuarioCreador] = await db.query(
  `SELECT id, fullname FROM usuarios WHERE id = ?`,
  [reserva.created_by]
);

// ✅ Obtener JEFE DE VENTAS - CAMBIO AQUÍ
const [jefeVentas] = await db.query(
  `SELECT u.id, u.fullname FROM usuarios u
  JOIN roles r ON u.role_id = r.id
  WHERE r.name = 'JEFE DE VENTAS' LIMIT 1`
);

const creador = usuarioCreador[0] || {};
const jefe = jefeVentas[0] || {};

    // ✅ Crear PDF con jsPDF
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - 2 * margin;
    let yPosition = margin;

    // Colores
    const primaryColor = [93, 22, 236];
    const secondaryColor = [100, 100, 100];
    const textColor = [50, 50, 50];
    const warningColor = [220, 53, 69];

    // Función para agregar línea separadora
    const addSeparator = () => {
      doc.setDrawColor(...secondaryColor);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;
    };

    // Encabezado
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text("NISSAN", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;

    doc.setFontSize(12);
    doc.text("NOTA DE PEDIDO Y CARTA DE CARACTERÍSTICAS", pageWidth / 2, yPosition, {
      align: "center",
    });
    yPosition += 6;

    doc.setFontSize(10);
    doc.setTextColor(...secondaryColor);
    doc.text(`Fecha: ${fechaFormato}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 4;
    doc.text(`Reserva #${reserva.id}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 7;

    // ✅ MARCA DE AGUA según estado
    if (reserva.estado === "observado" || reserva.estado === "subsanado" ) {
      doc.setFontSize(60);
      doc.setTextColor(220, 220, 220);
      doc.setFont("helvetica", "bold");
      
      if (reserva.estado === "observado") {
        doc.text("OBSERVADO", pageWidth / 2, pageHeight / 2, { 
          align: "center", 
          angle: 45 
        });
      } else if (reserva.estado === "subsanado") {
        doc.text("SUBSANADO", pageWidth / 2, pageHeight / 2, { 
          align: "center", 
          angle: 45 
        });
      }
      
      doc.setTextColor(...textColor);
      doc.setFontSize(10);
    }

    addSeparator();

    // Función para agregar sección
    const addSection = (title) => {
      if (yPosition > pageHeight - 30) {
        doc.addPage();
        yPosition = margin;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(...primaryColor);
      doc.text(title, margin, yPosition);
      yPosition += 5;
      addSeparator();
    };

    // Función para convertir a número y dar formato
    const formatCurrency = (value) => {
      if (value === null || value === undefined || value === "") {
        return "0.00";
      }
      const num = parseFloat(value);
      if (isNaN(num)) {
        return "0.00";
      }
      return num.toFixed(2);
    };

    // Función para agregar campo
    const addField = (label, value) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = margin;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...textColor);
      const labelText = `${label}:`;
      doc.text(labelText, margin, yPosition);
      
      doc.setFont("helvetica", "normal");
      const valueText = String(value || "-");
      const maxWidth = contentWidth - 60;
      const wrappedText = doc.splitTextToSize(valueText, maxWidth);
      doc.text(wrappedText, margin + 60, yPosition);
      
      const lineHeight = wrappedText.length * 4;
      yPosition += Math.max(5, lineHeight);
    };

    // INFORMACIÓN DE LA RESERVA
    addSection("INFORMACIÓN DE LA RESERVA");
    addField("Oportunidad", reserva.oportunidad_codigo || "-");
    addField("Código Reserva", `RES-${reserva.id}`);
    addField("Estado", reserva.etapa_nombre || "-");
    addField("Creado por", reserva.created_by_name || "-");
    yPosition += 3;

    // DATOS DEL CLIENTE
    addSection("DATOS DEL CLIENTE");
    addField("Nombre", reserva.cliente_nombre || "-");
    addField("Email", reserva.cliente_email || "-");
    addField("Teléfono", reserva.cliente_telefono || "-");
    addField("DNI/RUC", reserva.cliente_dni || "-");
    addField("Tipo Comprobante", detalle.tipo_comprobante || "-");
    addField("Ocupación", detalle.ocupacion || "-");
    addField("Domicilio", detalle.domicilio || "-");
    addField("Ubicación", `${detalle.distrito_nombre || ""}, ${detalle.provincia_nombre || ""}, ${detalle.departamento_nombre || ""}`);
    addField("Nombre Cónyuge", detalle.nombreconyugue || "-");
    addField("DNI Cónyuge", detalle.dniconyugue || "-");
    yPosition += 3;

    // DATOS DEL VEHÍCULO
    addSection("DATOS DEL VEHÍCULO");
    addField("Marca", detalle.marca_nombre || "-");
    addField("Modelo", detalle.modelo_nombre || "-");
    addField("Clase", detalle.clase_nombre || "-");
    addField("Versión", detalle.version_nombre || "-");
    addField("Año", detalle.anio?.toString() || "-");
    addField("VIN", detalle.vin || "-");
    addField("Motor #", detalle.numero_motor || "-");
    addField("Color Externo", detalle.color_externo || "-");
    addField("Color Interno", detalle.color_interno || "-");
    addField("Uso del Vehículo", detalle.usovehiculo || "-");
    yPosition += 3;

    // DESCUENTOS Y MONTOS
    addSection("DESCUENTOS Y MONTOS");
    addField("Precio Base", `S/ ${formatCurrency(detalle.precio_base)}`);
    addField("Descuento Crédito Nissan", `S/ ${formatCurrency(detalle.dsctocredinissan)}`);
    addField("Descuento Tienda", `S/ ${formatCurrency(detalle.dsctotienda)}`);
    addField("Bono Retoma", `S/ ${formatCurrency(detalle.dsctobonoretoma)}`);
    addField("Descuento NPER", `S/ ${formatCurrency(detalle.dsctonper)}`);
    addField("Flete", `S/ ${formatCurrency(detalle.flete)}`);
    addField("Tarjeta Placa", `S/ ${formatCurrency(detalle.tarjetaplaca)}`);
    addField("GLP", `S/ ${formatCurrency(detalle.glp)}`);
    addField("T.C. Referencial", detalle.tc_referencial?.toString() || "-");
    yPosition += 5;

    // TOTAL
    if (yPosition > pageHeight - 25) {
      doc.addPage();
      yPosition = margin;
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(...primaryColor);
    doc.text("TOTAL:", margin, yPosition);
    doc.setFontSize(16);
    doc.text(`S/ ${formatCurrency(detalle.total)}`, pageWidth - margin - 20, yPosition, {
      align: "right",
    });
    yPosition += 10;

    // OBSERVACIONES
    if (detalle.descripcion) {
      addSection("OBSERVACIONES");
      const wrappedObs = doc.splitTextToSize(detalle.descripcion, contentWidth);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...textColor);
      doc.text(wrappedObs, margin, yPosition);
      yPosition += wrappedObs.length * 4;
    }

    // ✅ FIRMAS según estado
   // ✅ FIRMAS según estado
if (yPosition > pageHeight - 60) {
  doc.addPage();
  yPosition = margin;
}

yPosition += 15;

if (reserva.estado === "borrador") {
  // No mostrar firmas en borrador
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...secondaryColor);
  doc.text("Documento en estado borrador - Sin firmas requeridas", margin, yPosition);
} else if (reserva.estado === "enviado_firma") {
  // Campo en blanco para firma del cliente y firma de creador
  yPosition += 10;
  
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.text("FIRMA DEL CLIENTE:", margin, yPosition);
  
  yPosition += 10;
  doc.setDrawColor(...secondaryColor);
  doc.line(margin, yPosition, margin + 50, yPosition);
  yPosition += 8;
  doc.setFontSize(8);
  doc.text("Firma del Cliente", margin, yPosition);
  
  yPosition += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.text("FIRMA AUTORIZADO:", margin, yPosition);
  
  yPosition += 10;
  doc.setDrawColor(...secondaryColor);
  doc.line(margin, yPosition, margin + 50, yPosition);
  yPosition += 8;
  doc.setFontSize(8);
  doc.text(creador.fullname || "Usuario", margin, yPosition);
} else if (reserva.estado === "firmado") {
  // Mostrar firma del cliente (en blanco) + firma de creador + nombre jefe de ventas
  yPosition += 10;
  
  // Firma del cliente
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.text("FIRMA DEL CLIENTE:", margin, yPosition);
  
  yPosition += 10;
  doc.setDrawColor(...secondaryColor);
  doc.line(margin, yPosition, margin + 50, yPosition);
  yPosition += 8;
  doc.setFontSize(8);
  doc.text("Firma del Cliente", margin, yPosition);
  
  // Firma de quien creó
  yPosition += 15;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.text("AUTORIZADO POR:", margin, yPosition);
  
  yPosition += 10;
  doc.setDrawColor(...secondaryColor);
  doc.line(margin, yPosition, margin + 50, yPosition);
  yPosition += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text((creador.fullname || "Usuario").toUpperCase(), margin, yPosition);
  
  // Jefe de Ventas
  yPosition += 12;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(...textColor);
  doc.text("JEFE DE VENTAS:", margin, yPosition);
  
  yPosition += 10;
  doc.setDrawColor(...secondaryColor);
  doc.line(margin, yPosition, margin + 50, yPosition);
  yPosition += 8;
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.text((jefe.fullname || "No asignado").toUpperCase(), margin, yPosition);
}

// Pie de página
yPosition = pageHeight - 10;
doc.setFont("helvetica", "normal");
doc.setFontSize(8);
doc.setTextColor(...secondaryColor);
doc.text(
  `Este documento fue generado el ${fechaFormato} por el sistema de gestión de Nissan.`,
  pageWidth / 2,
  yPosition,
  { align: "center" }
);

    // Generar PDF
    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));

    return new NextResponse(pdfBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="reserva-${reserva.id}.pdf"`,
      },
    });
  } catch (e) {
    console.log(e);
    return NextResponse.json(
      { message: "Error generando PDF: " + e.message },
      { status: 500 }
    );
  }
}