"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Link as LinkIcon, Copy, ExternalLink, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
    day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit",
  });
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

export default function CotizacionDetailDialog({
  open,
  onOpenChange,
  cotizacionId,
  permEdit = false,
  onStatusChanged,
}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [publicToken, setPublicToken] = useState(null);
  const [views, setViews] = useState([]);
  const [loadingViews, setLoadingViews] = useState(false);
  const [generatingLink, setGeneratingLink] = useState(false);

  useEffect(() => {
    if (!open || !cotizacionId) return;
    loadDetail();
    setPublicToken(null);
    setViews([]);
  }, [open, cotizacionId]);

  async function loadDetail() {
    setLoading(true);
    try {
      const r = await fetch(`/api/cotizaciones/${cotizacionId}`, { cache: "no-store" });
      const d = await r.json();
      if (r.ok) {
        setData(d);
        if (d.public_token) setPublicToken(d.public_token);
      }
      else toast.error("Error cargando detalle");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(newStatus) {
    setUpdatingStatus(true);
    try {
      const r = await fetch(`/api/cotizaciones/${cotizacionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado: newStatus }),
      });
      if (r.ok) {
        toast.success("Estado actualizado");
        setData((prev) => ({ ...prev, estado: newStatus }));
        onStatusChanged?.();
      } else {
        toast.error("Error actualizando estado");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setUpdatingStatus(false);
    }
  }

  async function handleGenerateLink() {
    setGeneratingLink(true);
    try {
      const r = await fetch(`/api/cotizaciones/${cotizacionId}/public-link`, {
        method: "POST"
      });
      const d = await r.json();
      if (r.ok) {
        setPublicToken(d.token);
        copyToClipboard(d.token);
      } else {
        toast.error("Error generando enlace");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setGeneratingLink(false);
    }
  }

  function copyToClipboard(token) {
    const url = `${window.location.origin}/q/${token}`;
    navigator.clipboard.writeText(url);
    toast.success("Enlace público copiado al portapapeles");
  }

  async function loadViews() {
    setLoadingViews(true);
    try {
      const r = await fetch(`/api/cotizaciones/${cotizacionId}/views`);
      if (r.ok) {
        setViews(await r.json());
      }
    } catch {
    } finally {
      setLoadingViews(false);
    }
  }

  if (!data && !loading) return null;

  const label = data?.tipo === "pyp" ? "Paños" : "Mano de obra";
  const currencyCode = data?.moneda_codigo || "PEN";
  const desglose = calcDescuentoDesglose(data);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between mt-2 mb-2 pr-6">
            <DialogTitle>Detalle de Cotización #{data?.id || ""}</DialogTitle>
            {data && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={publicToken ? () => copyToClipboard(publicToken) : handleGenerateLink}
                disabled={generatingLink}
                className="h-8 shadow-sm flex items-center gap-2"
              >
                {generatingLink ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <LinkIcon className="w-3.5 h-3.5" />
                )}
                {publicToken ? "Copiar enlace público" : "Crear enlace público"}
              </Button>
            )}
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : data ? (
          <Tabs defaultValue="detalle" onValueChange={(v) => v === "vistas" && loadViews()}>
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="detalle">Resumen Cotización</TabsTrigger>
              <TabsTrigger value="vistas" className="flex items-center gap-2">
                <Eye className="w-4 h-4" /> Métricas de Vistas
              </TabsTrigger>
            </TabsList>
            <TabsContent value="detalle" className="space-y-6">
              {/* General info */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Tipo:</span>
                <Badge variant="outline" className="ml-2">
                  {data.tipo === "taller" ? "Taller" : "Planchado y Pintura"}
                </Badge>
              </div>
              <div>
                <span className="text-muted-foreground">Estado:</span>
                {permEdit ? (
                  <Select
                    value={data.estado}
                    onValueChange={updateStatus}
                    disabled={updatingStatus}
                  >
                    <SelectTrigger className="w-37.5 h-8 inline-flex ml-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pendiente">Pendiente</SelectItem>
                      <SelectItem value="aprobada">Aprobada</SelectItem>
                      <SelectItem value="rechazada">Rechazada</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={`ml-2 ${estadoColor[data.estado] || ""}`}>
                    {estadoLabel[data.estado] || data.estado}
                  </Badge>
                )}
              </div>
              <div>
                <span className="text-muted-foreground">Cliente:</span>
                <span className="ml-2 font-medium">{data.cliente_nombre || "Sin cliente"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Creado por:</span>
                <span className="ml-2 font-medium">{data.usuario_nombre || "—"}</span>
              </div>
              <div>
                <span className="text-muted-foreground">Fecha:</span>
                <span className="ml-2">{formatDate(data.created_at)}</span>
              </div>
              {data.descripcion && (
                <div className="col-span-2">
                  <span className="text-muted-foreground">Descripción:</span>
                  <span className="ml-2">{data.descripcion}</span>
                </div>
              )}
              {data.centro_nombre && (
                <div>
                  <span className="text-muted-foreground">Centro:</span>
                  <span className="ml-2 font-medium">{data.centro_nombre}</span>
                </div>
              )}
              {data.taller_nombre && (
                <div>
                  <span className="text-muted-foreground">Taller:</span>
                  <span className="ml-2 font-medium">{data.taller_nombre}</span>
                </div>
              )}
              {data.mostrador_nombre && (
                <div>
                  <span className="text-muted-foreground">Mostrador:</span>
                  <span className="ml-2 font-medium">{data.mostrador_nombre}</span>
                </div>
              )}
            </div>

            {/* Products */}
            {data.productos?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Productos</h4>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nro. Parte</TableHead>
                        <TableHead>Producto</TableHead>
                        <TableHead className="text-right">Cant.</TableHead>
                        <TableHead className="text-right">P. Unit.</TableHead>
                        <TableHead className="text-center">Desc.</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.productos.map((p) => {
                        const base = Number(p.cantidad) * Number(p.precio_unitario);
                        const d = Number(p.descuento_porcentaje || 0);
                        const sub = base - base * d / 100;
                        return (
                          <TableRow key={p.id}>
                            <TableCell className="font-mono text-sm">{p.numero_parte}</TableCell>
                            <TableCell>{p.producto_nombre}</TableCell>
                            <TableCell className="text-right">{p.cantidad}</TableCell>
                            <TableCell className="text-right">{formatCurrency(p.precio_unitario, currencyCode)}</TableCell>
                            <TableCell className="text-center">
                              {d > 0 ? <Badge variant="secondary">{d}%</Badge> : "\u2014"}
                            </TableCell>
                            <TableCell className="text-right font-medium">{formatCurrency(sub, currencyCode)}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Mano de obra / paños */}
            <div>
              <h4 className="font-semibold mb-2">{label}</h4>
              <div className="bg-muted/50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Tarifa:</span>
                  <span>{data.tarifa_nombre || "\u2014"} \u2014 {formatCurrency(data.tarifa_hora, currencyCode)}/hr</span>
                </div>
                <div className="flex justify-between">
                  <span>Horas:</span>
                  <span>{data.horas_trabajo}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(data.subtotal_mano_obra, currencyCode)}</span>
                </div>
              </div>
            </div>

            {/* Adicionales */}
            {data.extras?.length > 0 && (
              <div>
                <h4 className="font-semibold mb-2">Adicionales</h4>
                <div className="border rounded-md">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Descripción</TableHead>
                        <TableHead className="text-right">Precio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {data.extras.map((e) => (
                        <TableRow key={e.id}>
                          <TableCell>{e.descripcion}</TableCell>
                          <TableCell className="text-right">{formatCurrency(calcExtraNeto(e), currencyCode)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Totals */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal productos:</span>
                <span>{formatCurrency(desglose.netoProductos, currencyCode)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Subtotal {label.toLowerCase()}:</span>
                <span>{formatCurrency(desglose.netoManoObra, currencyCode)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Subtotal adicionales:</span>
                <span>{formatCurrency(desglose.netoAdicionales, currencyCode)}</span>
              </div>
              {(Number(data.descuento_porcentaje || 0) > 0 || Number(data.descuento_monto || 0) > 0) && (
                <>
                  <hr />
                  <div className="flex justify-between text-xs text-red-500">
                    <span>Desc. productos</span>
                    <span>-{formatCurrency(desglose.descuentoProductos, currencyCode)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-red-500">
                    <span>Desc. {label.toLowerCase()}</span>
                    <span>-{formatCurrency(desglose.descuentoManoObra, currencyCode)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-red-500">
                    <span>Desc. adicionales</span>
                    <span>-{formatCurrency(desglose.descuentoAdicionales, currencyCode)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-red-600">
                    <span>Descuento total aplicado</span>
                    <span>-{formatCurrency(desglose.totalDescuento, currencyCode)}</span>
                  </div>
                </>
              )}
              {Number(data.incluir_igv || 0) === 1 && (
                <div className="flex justify-between text-sm">
                  <span>IGV ({Number(data.impuesto_porcentaje || data.impuesto_porcentaje_config || 0)}%)</span>
                  <span>{formatCurrency(
                    desglose.netoSinIgv * Number(data.impuesto_porcentaje || data.impuesto_porcentaje_config || 0) / 100,
                    currencyCode
                  )}</span>
                </div>
              )}
              <hr />
              <div className="flex justify-between text-lg font-bold">
                <span>TOTAL:</span>
                <span className="text-green-600">{formatCurrency(data.monto_total, currencyCode)}</span>
              </div>
            </div>
            </TabsContent>
            
            <TabsContent value="vistas">
              <div className="space-y-4 pt-2">
                <div className="flex items-center justify-between pb-2">
                  <h4 className="font-semibold text-lg flex items-center gap-2">
                    Visualizaciones del Link Público
                  </h4>
                  <Badge variant="outline" className="text-sm px-3 py-1 bg-slate-50">
                    Total: {views.length} vistas
                  </Badge>
                </div>

                {!publicToken && (
                  <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-md text-sm">
                    Aún no se ha generado un enlace público para esta cotización. Haz clic en "Crear enlace público" arriba.
                  </div>
                )}

                {publicToken && (
                  <div className="flex items-center gap-2 p-3 bg-slate-50 border rounded-md text-sm text-muted-foreground break-all">
                    <span className="font-medium text-slate-700">Enlace HTTP:</span> 
                    <a href={`${window.location.origin}/q/${publicToken}`} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                      {window.location.origin}/q/{publicToken}
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}

                <div className="border rounded-md mt-4 overflow-hidden">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="w-[180px]">Fecha y Hora</TableHead>
                        <TableHead className="w-[140px]">Dirección IP</TableHead>
                        <TableHead>Dispositivo / Navegador</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingViews ? (
                        <TableRow>
                          <TableCell colSpan={3} className="h-24 text-center">
                            <Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" />
                          </TableCell>
                        </TableRow>
                      ) : views.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="h-24 text-center text-muted-foreground">
                            {publicToken ? "Nadie ha visto esta cotización aún." : "Genera un enlace para empezar a rastrear vistas."}
                          </TableCell>
                        </TableRow>
                      ) : (
                        views.map((v, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium whitespace-nowrap text-sm">
                              {formatDate(v.viewed_at)}
                            </TableCell>
                            <TableCell className="font-mono text-xs text-slate-600">
                              {v.ip_address || "Desconocida"}
                            </TableCell>
                            <TableCell className="text-xs text-slate-500 break-words max-w-[280px]">
                              {v.user_agent || "Desconocido"}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
