"use client";

import { useEffect, useState, use } from "react";
import { Loader2, Car, Calendar, MapPin, Receipt, AlertCircle, Phone, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";

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
    day: "numeric", month: "long", year: "numeric",
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

export default function PublicQuotePage({ params }) {
  const unwrappedParams = use(params);
  const { token } = unwrappedParams;
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!token) return;
    loadQuote();
  }, [token]);

  async function loadQuote() {
    try {
      const res = await fetch(`/api/public-quotes/${token}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      } else {
        if (res.status === 404) setError("La cotización que buscas no existe o el enlace ha caducado.");
        else setError("Ocurrió un error al cargar la información.");
      }
    } catch (e) {
      setError("Error de conexión. Verifica tu internet e intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600 mb-4" />
        <h2 className="text-xl font-medium text-slate-700">Cargando cotización...</h2>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md shadow-lg border-slate-200">
          <CardContent className="pt-6 flex flex-col items-center text-center">
            <AlertCircle className="w-12 h-12 text-red-500 mb-4" />
            <h2 className="text-xl font-bold text-slate-800 mb-2">Cotización Inaccesible</h2>
            <p className="text-slate-600 mb-6">{error || "No se pudo cargar la cotización."}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const labelManoObra = data.tipo === "pyp" ? "Paños" : "Mano de Obra";
  const currencyCode = data.moneda_codigo || "PEN";
  const desglose = calcDescuentoDesglose(data);

  return (
    <div className="min-h-screen bg-slate-50/50 py-8 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div>
            <Badge variant="outline" className="mb-3 px-3 py-1 bg-slate-100 text-slate-600 font-medium">
              DOCUMENTO DE COTIZACIÓN
            </Badge>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Cotización #{data.id}</h1>
            <p className="text-slate-500 mt-1 flex items-center gap-2">
              <Calendar className="w-4 h-4" /> Emitida el {formatDate(data.created_at)}
            </p>
          </div>
          <div className="text-left md:text-right">
            <p className="text-sm font-medium text-slate-500 uppercase tracking-wider">Monto Total</p>
            <p className="text-4xl font-extrabold text-blue-600 mt-1">
              {formatCurrency(data.monto_total, currencyCode)}
            </p>
            {Number(data.incluir_igv) === 1 && (
              <p className="text-xs text-slate-400 mt-1">Incluye IGV ({Number(data.impuesto_porcentaje_config || data.impuesto_porcentaje || 0)}%)</p>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                <Car className="w-4 h-4" /> Detalles del Servicio
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-sm">
              <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-500">Tipo de servicio</span>
                <span className="font-semibold text-slate-800">{data.tipo === "pyp" ? "Planchado y Pintura" : "Taller Automotriz"}</span>
              </div>
              {(data.centro_nombre || data.taller_nombre) && (
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                  <span className="text-slate-500">Ubicación</span>
                  <span className="font-medium text-slate-800 text-right">
                    {data.centro_nombre} {data.taller_nombre ? `• ${data.taller_nombre}` : ""}
                  </span>
                </div>
              )}
              {data.descripcion && (
                <div className="pt-2">
                  <span className="text-slate-500 block mb-1">Descripción del requerimiento</span>
                  <p className="text-slate-800 bg-slate-50 p-3 rounded-md border border-slate-100 italic">
                    {data.descripcion}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
              <CardTitle className="text-sm font-bold uppercase tracking-wide text-slate-500 flex items-center gap-2">
                <Receipt className="w-4 h-4" /> Datos del Cliente
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-sm">
              <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                <span className="text-slate-500">A nombre de</span>
                <span className="font-semibold text-slate-800">{data.cliente_nombre || "Consumidor Final"}</span>
              </div>
              {data.cliente_email && (
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                  <span className="text-slate-500 flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" /> Correo</span>
                  <span className="font-medium text-slate-800">{data.cliente_email}</span>
                </div>
              )}
              {data.cliente_celular && (
                <div className="flex justify-between border-b border-dashed border-slate-200 pb-2">
                  <span className="text-slate-500 flex items-center gap-1.5"><Phone className="w-3.5 h-3.5" /> Teléfono</span>
                  <span className="font-medium text-slate-800">{data.cliente_celular}</span>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Desglose de Productos */}
        {data.productos?.length > 0 && (
          <Card className="border-slate-200 shadow-sm overflow-hidden">
             <CardHeader className="bg-slate-50 border-b border-slate-200 py-4">
              <CardTitle className="text-lg text-slate-800">Repuestos y Productos</CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 hover:bg-slate-50">
                    <TableHead className="w-[120px] font-semibold">Nro. Parte</TableHead>
                    <TableHead className="font-semibold">Descripción del Producto</TableHead>
                    <TableHead className="text-right w-[80px] font-semibold">Cant.</TableHead>
                    <TableHead className="text-right w-[120px] font-semibold">P. Unitario</TableHead>
                    <TableHead className="text-right w-[140px] font-semibold">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.productos.map((p) => {
                    const base = Number(p.cantidad) * Number(p.precio_unitario);
                    const d = Number(p.descuento_porcentaje || 0);
                    const sub = base - base * d / 100;
                    return (
                      <TableRow key={p.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-mono text-xs text-slate-500">{p.numero_parte || "—"}</TableCell>
                        <TableCell className="font-medium text-slate-700">{p.producto_nombre}</TableCell>
                        <TableCell className="text-right">{p.cantidad}</TableCell>
                        <TableCell className="text-right text-slate-600">{formatCurrency(p.precio_unitario, currencyCode)}</TableCell>
                        <TableCell className="text-right font-semibold text-slate-800">{formatCurrency(sub, currencyCode)}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )}

        {/* Desglose de Mano de Obra y Extras */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            {(Number(data.subtotal_mano_obra) > 0 || data.horas_trabajo > 0) && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
                  <CardTitle className="text-sm font-semibold text-slate-800 uppercase tracking-wide">{labelManoObra}</CardTitle>
                </CardHeader>
                <CardContent className="pt-4 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Tarifa ({formatCurrency(data.tarifa_hora, currencyCode)}/hr)</span>
                    <span className="font-medium">{data.tarifa_nombre || "Estándar"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Horas estimadas</span>
                    <span className="font-medium">{data.horas_trabajo}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t border-slate-100 font-semibold text-slate-800">
                    <span>Subtotal</span>
                    <span>{formatCurrency(data.subtotal_mano_obra, currencyCode)}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {data.extras?.length > 0 && (
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="bg-slate-50 border-b border-slate-200 py-3">
                  <CardTitle className="text-sm font-semibold text-slate-800 uppercase tracking-wide">Servicios Adicionales</CardTitle>
                </CardHeader>
                <div className="px-4 py-3">
                  <div className="space-y-3 text-sm">
                    {data.extras.map((e) => (
                      <div key={e.id} className="flex justify-between border-b border-dashed border-slate-100 pb-2 last:border-0 last:pb-0">
                        <span className="text-slate-700">{e.descripcion}</span>
                        <span className="font-medium text-slate-800">{formatCurrency(calcExtraNeto(e), currencyCode)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            )}
          </div>

          <div className="self-start">
            <Card className="border-slate-200 shadow-md bg-white overflow-hidden ring-1 ring-slate-900/5">
              <div className="bg-slate-800 p-4">
                <h3 className="text-slate-100 font-medium tracking-wide">Resumen Financiero</h3>
              </div>
              <CardContent className="p-6 space-y-4">
                <div className="space-y-3 text-sm text-slate-600">
                  <div className="flex justify-between">
                    <span>Productos y Repuestos</span>
                    <span className="font-medium text-slate-800">{formatCurrency(desglose.netoProductos, currencyCode)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{labelManoObra}</span>
                    <span className="font-medium text-slate-800">{formatCurrency(desglose.netoManoObra, currencyCode)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Adicionales</span>
                    <span className="font-medium text-slate-800">{formatCurrency(desglose.netoAdicionales, currencyCode)}</span>
                  </div>
                </div>

                {desglose.totalDescuento > 0 && (
                  <div className="pt-3 border-t border-slate-100 space-y-2">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Descuentos Aplicados</p>
                    {desglose.descuentoProductos > 0 && (
                      <div className="flex justify-between text-sm text-emerald-600">
                        <span>En productos</span>
                        <span>-{formatCurrency(desglose.descuentoProductos, currencyCode)}</span>
                      </div>
                    )}
                    {desglose.descuentoManoObra > 0 && (
                      <div className="flex justify-between text-sm text-emerald-600">
                        <span>En {labelManoObra.toLowerCase()}</span>
                        <span>-{formatCurrency(desglose.descuentoManoObra, currencyCode)}</span>
                      </div>
                    )}
                    {desglose.descuentoAdicionales > 0 && (
                      <div className="flex justify-between text-sm text-emerald-600">
                        <span>En adicionales / general</span>
                        <span>-{formatCurrency(desglose.descuentoAdicionales, currencyCode)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm font-semibold text-emerald-700 pt-1">
                      <span>Total Ahorrado</span>
                      <span>-{formatCurrency(desglose.totalDescuento, currencyCode)}</span>
                    </div>
                  </div>
                )}

                <div className="pt-4 border-t-2 border-slate-100 space-y-2">
                  <div className="flex justify-between text-slate-700">
                    <span className="font-medium">Subtotal</span>
                    <span className="font-semibold">{formatCurrency(desglose.netoSinIgv, currencyCode)}</span>
                  </div>
                  
                  {Number(data.incluir_igv) === 1 && (
                    <div className="flex justify-between text-slate-600 text-sm">
                      <span>IGV ({Number(data.impuesto_porcentaje_config || data.impuesto_porcentaje || 0)}%)</span>
                      <span>
                        {formatCurrency(
                          desglose.netoSinIgv * Number(data.impuesto_porcentaje_config || data.impuesto_porcentaje || 0) / 100,
                          currencyCode
                        )}
                      </span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t-2 border-slate-800 flex justify-between items-end">
                  <span className="text-lg font-bold text-slate-900">Total a Pagar</span>
                  <span className="text-3xl font-black text-blue-600">{formatCurrency(data.monto_total, currencyCode)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="text-center py-8 text-sm text-slate-400">
          <p>Este documento es una cotización informativa y está sujeto a cambios por verificación física del vehículo.</p>
        </div>
      </div>
    </div>
  );
}
