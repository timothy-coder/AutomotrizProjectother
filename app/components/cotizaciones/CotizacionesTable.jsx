"use client";

import { useState } from "react";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Eye, Pencil, Trash2, Search, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";

const estadoColor = {
  pendiente: "bg-yellow-100 text-yellow-800 border-yellow-300",
  aprobada: "bg-green-100 text-green-800 border-green-300",
  rechazada: "bg-red-100 text-red-800 border-red-300",
};

const estadoLabel = {
  pendiente: "Pendiente",
  aprobada: "Aprobada",
  rechazada: "Rechazada",
};

function formatCurrency(v, currencyCode = "PEN") {
  try {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: currencyCode }).format(v || 0);
  } catch {
    return new Intl.NumberFormat("es-PE", { style: "currency", currency: "PEN" }).format(v || 0);
  }
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function formatCorrelativo(item) {
  const year = new Date(item?.created_at || Date.now()).getFullYear();
  const serie = String(item?.id || 0).padStart(3, "0");
  return `${serie}-${year}`;
}

function calcExtraNeto(extra) {
  const base = Number(extra?.monto || 0);
  const tipo = extra?.descuento_tipo === "monto" ? "monto" : "porcentaje";
  const valor = Number(extra?.descuento_valor || 0);
  const descuento = tipo === "monto"
    ? Math.max(0, Math.min(base, valor))
    : base * Math.max(0, Math.min(100, valor)) / 100;
  return Math.max(0, base - descuento);
}

function calcDescuentoDesglose(data) {
  const subtotalProductos = Number(data?.subtotal_productos || 0);
  const subtotalManoObra = Number(data?.subtotal_mano_obra || 0);
  const subtotalAdicionales = Number(data?.subtotal_extras || 0);
  const bruto = subtotalProductos + subtotalManoObra + subtotalAdicionales;
  const pct = Number(data?.descuento_porcentaje || 0) / 100;
  const montoFijo = Math.max(0, Number(data?.descuento_monto || 0));
  const montoFijoAplicado = Math.min(montoFijo, bruto);
  const factorFijo = bruto > 0 ? montoFijoAplicado / bruto : 0;
  const tasaTotal = pct + factorFijo;

  const descuentoProductos = subtotalProductos * tasaTotal;
  const descuentoManoObra = subtotalManoObra * tasaTotal;
  const descuentoAdicionales = subtotalAdicionales * tasaTotal;

  const netoProductos = Math.max(0, subtotalProductos - descuentoProductos);
  const netoManoObra = Math.max(0, subtotalManoObra - descuentoManoObra);
  const netoAdicionales = Math.max(0, subtotalAdicionales - descuentoAdicionales);

  return {
    descuentoProductos,
    descuentoManoObra,
    descuentoAdicionales,
    totalDescuento: descuentoProductos + descuentoManoObra + descuentoAdicionales,
    netoProductos,
    netoManoObra,
    netoAdicionales,
    netoSinIgv: netoProductos + netoManoObra + netoAdicionales,
  };
}

export default function CotizacionesTable({
  items = [],
  showTipo = false,
  onView,
  onEdit,
  onDelete,
  permEdit = false,
  permDelete = false,
}) {
  const [q, setQ] = useState("");
  const [pdfLoading, setPdfLoading] = useState(null);

  async function downloadPdf(item) {
    setPdfLoading(item.id);
    try {
      // Load detail
      const r = await fetch(`/api/cotizaciones/${item.id}`, { cache: "no-store" });
      if (!r.ok) { toast.error("Error cargando detalle"); return; }
      const data = await r.json();

      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      const tipoLabel = data.tipo === "pyp" ? "Planchado y Pintura" : "Taller";
      const manoLabel = data.tipo === "pyp" ? "Paños" : "Mano de obra";
      const currencyCode = data.moneda_codigo || "PEN";

      // Header
      doc.setFontSize(18);
      doc.text(`Cotización #${formatCorrelativo(data)}`, 14, 20);
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Tipo: ${tipoLabel}`, 14, 28);
      doc.text(`Estado: ${estadoLabel[data.estado] || data.estado}`, 14, 33);
      doc.text(`Fecha: ${formatDate(data.created_at)}`, 14, 38);
      doc.text(`Cliente: ${data.cliente_nombre || "Sin cliente"}`, 14, 43);
      doc.text(`Creado por: ${data.usuario_nombre || "—"}`, 14, 48);

      let y = 53;
      if (data.centro_nombre) {
        doc.text(`Centro: ${data.centro_nombre}`, 14, y); y += 5;
      }
      if (data.taller_nombre) {
        doc.text(`Taller: ${data.taller_nombre}`, 14, y); y += 5;
      }
      if (data.mostrador_nombre) {
        doc.text(`Mostrador: ${data.mostrador_nombre}`, 14, y); y += 5;
      }
      if (data.descripcion) {
        doc.text(`Descripción: ${data.descripcion}`, 14, y); y += 5;
      }

      y += 5;
      doc.setTextColor(0);

      // Products table
      if (data.productos?.length > 0) {
        doc.setFontSize(12);
        doc.text("Productos", 14, y);
        y += 2;
        autoTable(doc, {
          startY: y,
          head: [["Nro. Parte", "Producto", "Cant.", "P. Unit.", "Desc. %", "Subtotal"]],
          body: data.productos.map((p) => {
            const base = Number(p.cantidad) * Number(p.precio_unitario);
            const d = Number(p.descuento_porcentaje || 0);
            const sub = base - base * d / 100;
            return [
              p.numero_parte || "",
              p.producto_nombre || "",
              p.cantidad,
              formatCurrency(p.precio_unitario, currencyCode),
              d > 0 ? `${d}%` : "—",
              formatCurrency(sub, currencyCode),
            ];
          }),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [41, 128, 185] },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      // Mano de obra
      doc.setFontSize(12);
      doc.text(manoLabel, 14, y);
      y += 2;
      autoTable(doc, {
        startY: y,
        head: [["Tarifa", "Precio/hr", "Horas", "Subtotal"]],
        body: [[
          data.tarifa_nombre || "—",
          formatCurrency(data.tarifa_hora, currencyCode),
          data.horas_trabajo || 0,
          formatCurrency(data.subtotal_mano_obra, currencyCode),
        ]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185] },
      });
      y = doc.lastAutoTable.finalY + 8;

      // Adicionales
      if (data.extras?.length > 0) {
        doc.setFontSize(12);
        doc.text("Adicionales", 14, y);
        y += 2;
        autoTable(doc, {
          startY: y,
          head: [["Descripción", "Precio"]],
          body: data.extras.map((e) => [e.descripcion, formatCurrency(calcExtraNeto(e), currencyCode)]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [41, 128, 185] },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      // Totals
      const desglose = calcDescuentoDesglose(data);
      const totalsRows = [
        ["Subtotal productos", formatCurrency(desglose.netoProductos, currencyCode)],
        [`Subtotal ${manoLabel.toLowerCase()}`, formatCurrency(desglose.netoManoObra, currencyCode)],
        ["Subtotal adicionales", formatCurrency(desglose.netoAdicionales, currencyCode)],
      ];
      if (desglose.totalDescuento > 0) {
        totalsRows.push(["Desc. productos", `-${formatCurrency(desglose.descuentoProductos, currencyCode)}`]);
        totalsRows.push([`Desc. ${manoLabel.toLowerCase()}`, `-${formatCurrency(desglose.descuentoManoObra, currencyCode)}`]);
        totalsRows.push(["Desc. adicionales", `-${formatCurrency(desglose.descuentoAdicionales, currencyCode)}`]);
        totalsRows.push(["Descuento total aplicado", `-${formatCurrency(desglose.totalDescuento, currencyCode)}`]);
      }
      if (Number(data.incluir_igv || 0) === 1) {
        const pct = Number(data.impuesto_porcentaje || data.impuesto_porcentaje_config || 0);
        totalsRows.push([`IGV (${pct}%)`, formatCurrency(desglose.netoSinIgv * pct / 100, currencyCode)]);
      }
      totalsRows.push(["TOTAL", formatCurrency(data.monto_total, currencyCode)]);

      autoTable(doc, {
        startY: y,
        body: totalsRows,
        styles: { fontSize: 10 },
        columnStyles: { 0: { fontStyle: "bold" }, 1: { halign: "right" } },
        theme: "plain",
      });

      doc.save(`cotizacion-${data.id}.pdf`);
    } catch (err) {
      console.error(err);
      toast.error("Error generando PDF");
    } finally {
      setPdfLoading(null);
    }
  }

  const filtered = items.filter((item) => {
    const search = q.toLowerCase();
    return (
      !q ||
      (item.cliente_nombre || "").toLowerCase().includes(search) ||
      (item.descripcion || "").toLowerCase().includes(search) ||
      (item.usuario_nombre || "").toLowerCase().includes(search) ||
      String(item.id).includes(search) ||
      formatCorrelativo(item).toLowerCase().includes(search)
    );
  });

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Buscar cotización..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-16">#</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado por</TableHead>
              <TableHead>Fecha</TableHead>
              {showTipo && <TableHead>Tipo</TableHead>}
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={showTipo ? 9 : 8} className="text-center py-8 text-muted-foreground">
                  No se encontraron cotizaciones
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{formatCorrelativo(item)}</TableCell>
                  <TableCell>{item.cliente_nombre || "Sin cliente"}</TableCell>
                  <TableCell className="max-w-50 truncate">
                    {item.descripcion || "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(item.monto_total, item.moneda_codigo || "PEN")}
                  </TableCell>
                  <TableCell>
                    <Badge className={estadoColor[item.estado] || ""}>
                      {estadoLabel[item.estado] || item.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.usuario_nombre || "—"}</TableCell>
                  <TableCell>{formatDate(item.created_at)}</TableCell>
                  {showTipo && (
                    <TableCell>
                      <Badge variant="outline">
                        {item.tipo === "taller" ? "Taller" : "Planchado y Pintura"}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => onView?.(item)} title="Ver detalle">
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost" size="icon"
                        onClick={() => downloadPdf(item)}
                        title="Descargar PDF"
                        disabled={pdfLoading === item.id}
                      >
                        {pdfLoading === item.id
                          ? <Loader2 className="w-4 h-4 animate-spin" />
                          : <FileDown className="w-4 h-4" />
                        }
                      </Button>
                      {permEdit && (
                        <Button variant="ghost" size="icon" onClick={() => onEdit?.(item)} title="Editar">
                          <Pencil className="w-4 h-4" />
                        </Button>
                      )}
                      {permDelete && (
                        <Button variant="ghost" size="icon" onClick={() => onDelete?.(item)} title="Eliminar"
                          className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
