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

function formatCurrency(v) {
  return new Intl.NumberFormat("es-MX", { style: "currency", currency: "MXN" }).format(v || 0);
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-MX", {
    day: "2-digit", month: "short", year: "numeric",
  });
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

      // Header
      doc.setFontSize(18);
      doc.text(`Cotización #${data.id}`, 14, 20);
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
              formatCurrency(p.precio_unitario),
              d > 0 ? `${d}%` : "—",
              formatCurrency(sub),
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
          formatCurrency(data.tarifa_hora),
          data.horas_trabajo || 0,
          formatCurrency(data.subtotal_mano_obra),
        ]],
        styles: { fontSize: 9 },
        headStyles: { fillColor: [41, 128, 185] },
      });
      y = doc.lastAutoTable.finalY + 8;

      // Extras
      if (data.extras?.length > 0) {
        doc.setFontSize(12);
        doc.text("Gastos extras", 14, y);
        y += 2;
        autoTable(doc, {
          startY: y,
          head: [["Descripción", "Monto"]],
          body: data.extras.map((e) => [e.descripcion, formatCurrency(e.monto)]),
          styles: { fontSize: 9 },
          headStyles: { fillColor: [41, 128, 185] },
        });
        y = doc.lastAutoTable.finalY + 8;
      }

      // Totals
      const descPct = Number(data.descuento_porcentaje || 0);
      const descMonto = Number(data.descuento_monto || 0);
      const totalsRows = [
        ["Subtotal productos", formatCurrency(data.subtotal_productos)],
        [`Subtotal ${manoLabel.toLowerCase()}`, formatCurrency(data.subtotal_mano_obra)],
        ["Subtotal extras", formatCurrency(data.subtotal_extras)],
      ];
      if (descPct > 0 || descMonto > 0) {
        const bruto = Number(data.subtotal_productos) + Number(data.subtotal_mano_obra) + Number(data.subtotal_extras);
        const totalDesc = bruto * descPct / 100 + descMonto;
        totalsRows.push(["Descuento", `-${formatCurrency(totalDesc)}`]);
      }
      totalsRows.push(["TOTAL", formatCurrency(data.monto_total)]);

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
      String(item.id).includes(search)
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
              <TableHead>Fecha</TableHead>
              {showTipo && <TableHead>Tipo</TableHead>}
              <TableHead>Cliente</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Creado por</TableHead>
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
                  <TableCell className="font-medium">{item.id}</TableCell>
                  <TableCell>{formatDate(item.created_at)}</TableCell>
                  {showTipo && (
                    <TableCell>
                      <Badge variant="outline">
                        {item.tipo === "taller" ? "Taller" : "Planchado y Pintura"}
                      </Badge>
                    </TableCell>
                  )}
                  <TableCell>{item.cliente_nombre || "Sin cliente"}</TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {item.descripcion || "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(item.monto_total)}
                  </TableCell>
                  <TableCell>
                    <Badge className={estadoColor[item.estado] || ""}>
                      {estadoLabel[item.estado] || item.estado}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.usuario_nombre || "—"}</TableCell>
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
