import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import jsPDF from "jspdf";
import fs from "fs";
import path from "path";

export async function GET(request, context) {
  try {
    const { params } = context;
    const resolvedParams = await params;
    const { id } = resolvedParams;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ message: "ID inválido" }, { status: 400 });
    }

    const [rows] = await db.query(
      `
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
      `,
      [id]
    );

    if (rows.length === 0) {
      return NextResponse.json({ message: "Reserva no encontrada" }, { status: 404 });
    }

    const reserva = rows[0];

    const [detalles] = await db.query(
      `
      SELECT 
        rd.id as detalle_id,
        c.departamento_id,
        c.provincia_id,
        c.distrito_id,
        rd.tipo_comprobante,
        c.identificacion_fiscal,
        c.nombre_comercial,
        c.fecha_nacimiento,
        c.ocupacion,
        c.domicilio,
        d.nombre as departamento_nombre,
        p.nombre as provincia_nombre,
        di.nombre as distrito_nombre,
        c.email,
        c.celular,
        c.nombreconyugue,
        c.dniconyugue,
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
      LEFT JOIN departamentos d ON d.id = c.departamento_id
      LEFT JOIN provincias p ON p.id = c.provincia_id
      LEFT JOIN distritos di ON di.id = c.distrito_id
      LEFT JOIN clases cl ON cl.id = mo.clase_id
      LEFT JOIN versiones v ON v.id = ca.version_id
      LEFT JOIN precios_region_version prv ON prv.marca_id = m.id 
        AND prv.modelo_id = mo.id 
        AND prv.version_id = v.id
      WHERE rd.reserva_id = ?
      ORDER BY rd.created_at DESC
      LIMIT 1
      `,
      [id]
    );

    if (detalles.length === 0) {
      return NextResponse.json(
        { message: "Detalles de reserva no encontrados" },
        { status: 404 }
      );
    }

    const detalle = detalles[0];
    const cotizacionId = detalle.cotizacion_id || null;
    const fechaFormato = new Date(reserva.created_at).toLocaleDateString("es-ES");

    let accesorios = [];
    let regalos = [];
    let accesoriosDisponibles = [];
    let regalosDisponibles = [];

    if (cotizacionId) {
      const [accRows] = await db.query(
        `SELECT * FROM cotizaciones_accesorios WHERE cotizacion_id = ? ORDER BY id ASC`,
        [cotizacionId]
      );

      const [regRows] = await db.query(
        `SELECT * FROM cotizaciones_regalos WHERE cotizacion_id = ? ORDER BY id ASC`,
        [cotizacionId]
      );

      accesorios = accRows || [];
      regalos = regRows || [];
    }

    // Nombres disponibles de accesorios y regalos
    const [accDispRows] = await db.query(
      `SELECT id, detalle, numero_parte FROM accesorios_disponibles ORDER BY detalle ASC`
    );
    accesoriosDisponibles = accDispRows || [];

    const [regDispRows] = await db.query(
      `SELECT id, detalle, lote FROM regalos_disponibles ORDER BY detalle ASC`
    );
    regalosDisponibles = regDispRows || [];

    const [usuarioCreador] = await db.query(
      `SELECT id, fullname FROM usuarios WHERE id = ?`,
      [reserva.created_by]
    );

    const [jefeVentas] = await db.query(
      `
      SELECT u.id, u.fullname
      FROM usuarios u
      JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'JEFE DE VENTAS'
      LIMIT 1
      `
    );

    const creador = usuarioCreador[0] || {};
    const jefe = jefeVentas[0] || {};

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const fontPath = path.join(process.cwd(), "public/fonts/Autography.ttf");
    const fontData = fs.readFileSync(fontPath);
    const fontBase64 = fontData.toString("base64");
    doc.addFileToVFS("Autography.ttf", fontBase64);
    doc.addFont("Autography.ttf", "Autography", "normal");

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - margin * 2;
    let yPosition = margin;

    const primaryColor = [93, 22, 236];
    const secondaryColor = [100, 100, 100];
    const textColor = [50, 50, 50];

    const addSeparator = () => {
      doc.setDrawColor(...secondaryColor);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 5;
    };

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

    const formatCurrency = (value) => {
      if (value === null || value === undefined || value === "") return "0.00";
      const num = parseFloat(value);
      if (isNaN(num)) return "0.00";
      return num.toFixed(2);
    };

    const getDisponibleName = (type, detalleName) => {
      const list = type === "acc" ? accesoriosDisponibles : regalosDisponibles;
      const found = list.find((x) => String(x.detalle).toLowerCase() === String(detalleName).toLowerCase());
      return found ? found.detalle : detalleName || "-";
    };

    const addField = (label, value) => {
      if (yPosition > pageHeight - 20) {
        doc.addPage();
        yPosition = margin;
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...textColor);
      doc.text(`${label}:`, margin, yPosition);

      doc.setFont("helvetica", "normal");
      const valueText = String(value || "-");
      const wrappedText = doc.splitTextToSize(valueText, contentWidth - 60);
      doc.text(wrappedText, margin + 60, yPosition);

      const lineHeight = wrappedText.length * 4;
      yPosition += Math.max(5, lineHeight);
    };

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(...primaryColor);
    doc.text("NISSAN", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 8;

    doc.setFontSize(12);
    doc.text("NOTA DE PEDIDO", pageWidth / 2, yPosition, { align: "center" });
    yPosition += 6;

    doc.setFontSize(10);
    doc.setTextColor(...secondaryColor);
    doc.text(`Fecha: ${fechaFormato}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 4;
    doc.text(`Reserva #${reserva.id}`, pageWidth / 2, yPosition, { align: "center" });
    yPosition += 7;

    if (reserva.estado === "observado" || reserva.estado === "subsanado") {
      doc.setFontSize(60);
      doc.setTextColor(220, 220, 220);
      doc.setFont("helvetica", "bold");
      doc.text(
        reserva.estado === "observado" ? "OBSERVADO" : "SUBSANADO",
        pageWidth / 2,
        pageHeight / 2,
        { align: "center", angle: 45 }
      );
      doc.setTextColor(...textColor);
      doc.setFontSize(10);
    }

    addSeparator();

    addSection("INFORMACIÓN DE LA RESERVA");
    addField("Oportunidad", reserva.oportunidad_codigo || "-");
    addField("Código Reserva", `RES-${reserva.id}`);
    addField("Estado", reserva.etapa_nombre || "-");
    addField("Creado por", reserva.created_by_name || "-");
    yPosition += 3;

    addSection("DATOS DEL CLIENTE");
    addField("Nombre", reserva.cliente_nombre || "-");
    addField("Email", reserva.cliente_email || "-");
    addField("Teléfono", reserva.cliente_telefono || "-");
    addField("DNI/RUC", reserva.cliente_dni || "-");
    addField("Tipo Comprobante", detalle.tipo_comprobante || "-");
    addField("Ocupación", detalle.ocupacion || "-");
    addField("Domicilio", detalle.domicilio || "-");
    addField(
      "Ubicación",
      `${detalle.distrito_nombre || ""}, ${detalle.provincia_nombre || ""}, ${detalle.departamento_nombre || ""}`
    );
    addField("Nombre Cónyuge", detalle.nombreconyugue || "-");
    addField("DNI Cónyuge", detalle.dniconyugue || "-");
    yPosition += 3;

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

    addSection("DESCUENTOS Y MONTOS");
    addField("Precio Base", `$ ${formatCurrency(detalle.precio_base)}`);
    addField("Descuento Tienda", `$ ${formatCurrency(detalle.dsctotienda)}`);
    addField("Bono Retoma", `$ ${formatCurrency(detalle.dsctobonoretoma)}`);
    addField("Descuento NPER", `$ ${formatCurrency(detalle.dsctonper)}`);
    addField("Flete", `$ ${formatCurrency(detalle.flete)}`);
    addField("Tarjeta Placa", `$ ${formatCurrency(detalle.tarjetaplaca)}`);
    addField("GLP", `$ ${formatCurrency(detalle.glp)}`);
    addField("T.C. Referencial", detalle.tc_referencial?.toString() || "-");
    addField("Total", `$ ${formatCurrency(detalle.total)}`);
    yPosition += 5;

    // Accesorios
    if (accesorios.length > 0) {
      addSection("ACCESORIOS");
      accesorios.forEach((acc, index) => {
        const accName = getDisponibleName("acc", acc.detalle) || acc.detalle || `Accesorio ${index + 1}`;
        const desc = acc.descuento_monto ? ` | Desc.: $ ${formatCurrency(acc.descuento_monto)}` : "";
        addField(
          accName,
          `Cant: ${acc.cantidad || 0} | P.Unit: $ ${formatCurrency(acc.precio_unitario)}${desc} | Total: $ ${formatCurrency(acc.total)}`
        );
      });
      yPosition += 3;
    }

    // Regalos
    if (regalos.length > 0) {
      addSection("REGALOS");
      regalos.forEach((reg, index) => {
        const regName = getDisponibleName("reg", reg.detalle) || reg.detalle || `Regalo ${index + 1}`;
        const desc = reg.descuento_monto ? ` | Desc.: $ ${formatCurrency(reg.descuento_monto)}` : "";
        addField(
          regName,
          `Cant: ${reg.cantidad || 0} | P.Unit: $ ${formatCurrency(reg.precio_unitario)}${desc} | Total: $ ${formatCurrency(reg.total)}`
        );
      });
      yPosition += 3;
    }

    // Nuevo campo total accesorios + regalos con descuentos
   const totalAccesorios = accesorios.reduce((sum, a) => sum + parseFloat(a.total || 0), 0);
const totalRegalos = regalos.reduce((sum, r) => sum + parseFloat(r.total || 0), 0);
const descuentosAccesorios = accesorios.reduce((sum, a) => sum + parseFloat(a.descuento_monto || 0), 0);
const descuentosRegalos = regalos.reduce((sum, r) => sum + parseFloat(r.descuento_monto || 0), 0);
const totalAccRegFinal = (totalAccesorios + totalRegalos) - descuentosAccesorios - descuentosRegalos;
const totalGeneralFinal = parseFloat(detalle.total || 0) + totalAccRegFinal;

    addSection("RESUMEN ACCESORIOS Y REGALOS");
    addField("Total Accesorios", `$ ${formatCurrency(totalAccesorios)}`);
    addField("Total Regalos", `$ ${formatCurrency(totalRegalos)}`);
    addField("Descuentos Accesorios", `$ ${formatCurrency(descuentosAccesorios)}`);
    addField("Descuentos Regalos", `$ ${formatCurrency(descuentosRegalos)}`);
    addField("Total Accesorios + Regalos", `$ ${formatCurrency(totalAccRegFinal)}`);

    addSection("RESUMEN FINAL");
addField("Total Nota de Pedido", `$ ${formatCurrency(detalle.total)}`);
addField("Total Accesorios y Regalos", `$ ${formatCurrency(totalAccRegFinal)}`);
addField("TOTAL GENERAL", `$ ${formatCurrency(totalGeneralFinal)}`);

    if (yPosition > pageHeight - 80) {
      doc.addPage();
      yPosition = margin;
    }

    yPosition += 15;

    const drawSignature = (label, name) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.setTextColor(...textColor);
      doc.text(label, margin, yPosition);

      yPosition += 10;
      doc.setDrawColor(...secondaryColor);
      doc.line(margin, yPosition, margin + 50, yPosition);

      yPosition += 10;
      doc.setFont("Autography", "normal");
      doc.setFontSize(26);
      doc.setTextColor(0, 0, 0);
      doc.text(name || "", margin, yPosition);

      yPosition += 15;
    };

    if (reserva.estado === "borrador") {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...secondaryColor);
      doc.text("Documento en estado borrador - Sin firmas requeridas", margin, yPosition);
    } else if (reserva.estado === "enviado_firma") {
      drawSignature("FIRMA DEL CLIENTE:", "Firma del Cliente");
      drawSignature("FIRMA AUTORIZADO:", creador.fullname || "Usuario");
    } else if (reserva.estado === "firmado") {
      drawSignature("FIRMA DEL CLIENTE:", "Firma del Cliente");
      drawSignature("AUTORIZADO POR:", (creador.fullname || "Usuario"));
      drawSignature("JEFE DE VENTAS:", (jefe.fullname || "No asignado"));
    }

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