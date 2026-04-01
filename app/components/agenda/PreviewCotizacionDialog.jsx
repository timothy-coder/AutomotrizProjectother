"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader } from "lucide-react";
import { toast } from "sonner";

export default function PreviewCotizacionDialog({ open, onOpenChange, cotizacion }) {
  const [accesorios, setAccesorios] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !cotizacion) return;
    loadAccesorios();
  }, [open, cotizacion]);

  async function loadAccesorios() {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/cotizaciones-accesorios/by-cotizacion/${cotizacion.id}`,
        { cache: "no-store" }
      );

      if (!res.ok) throw new Error("Error cargando accesorios");

      const data = await res.json();
      
      // ✅ Convertir strings a números
      const accesoriosFormateados = Array.isArray(data) ? data.map(acc => ({
        ...acc,
        cantidad: Number(acc.cantidad),
        precio_unitario: Number(acc.precio_unitario),
        subtotal: Number(acc.subtotal),
        descuento_porcentaje: acc.descuento_porcentaje ? Number(acc.descuento_porcentaje) : 0,
        descuento_monto: acc.descuento_monto ? Number(acc.descuento_monto) : 0,
        total: Number(acc.total),
      })) : [];
      
      setAccesorios(accesoriosFormateados);
    } catch (error) {
      console.error(error);
      toast.error("Error cargando cotización");
    } finally {
      setLoading(false);
    }
  }

  // ✅ AGRUPAR POR MONEDA
  const agruparPorMoneda = () => {
    const grupos = {};

    accesorios.forEach((acc) => {
      const monedaCodigo = acc.moneda_codigo || "SIN_MONEDA";
      
      if (!grupos[monedaCodigo]) {
        grupos[monedaCodigo] = {
          simbolo: acc.moneda_simbolo,
          codigo: monedaCodigo,
          subtotal: 0,
          descuento: 0,
          total: 0,
          accesorios: [],
        };
      }

      grupos[monedaCodigo].subtotal += acc.subtotal || 0;
      grupos[monedaCodigo].descuento += acc.descuento_monto || 0;
      grupos[monedaCodigo].total += acc.total || 0;
      grupos[monedaCodigo].accesorios.push(acc);
    });

    return Object.values(grupos);
  };

  const gruposMoneda = agruparPorMoneda();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Previsualización de Cotización Q-{String(cotizacion?.id).padStart(6, "0")}</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader className="h-6 w-6 animate-spin text-blue-600" />
          </div>
        ) : accesorios.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <p className="text-gray-500">No hay accesorios en esta cotización</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Información General */}
            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm text-gray-600">Marca</p>
                <p className="font-semibold text-gray-900">{cotizacion?.marca || "N/A"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Modelo</p>
                <p className="font-semibold text-gray-900">{cotizacion?.modelo || "N/A"}</p>
              </div>
            </div>

            {/* ✅ TABLAS POR MONEDA */}
            {gruposMoneda.map((grupo) => (
              <div key={grupo.codigo} className="space-y-4">
                {/* Encabezado de Moneda */}
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900">
                    Resumen en {grupo.simbolo} ({grupo.codigo})
                  </h3>
                </div>

                {/* Tabla de Accesorios */}
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="text-left p-3 font-semibold">Descripción</th>
                        <th className="text-left p-3 font-semibold">N° Parte</th>
                        <th className="text-right p-3 font-semibold">Cantidad</th>
                        <th className="text-right p-3 font-semibold">Unitario</th>
                        <th className="text-right p-3 font-semibold">Subtotal</th>
                        <th className="text-right p-3 font-semibold">Descuento</th>
                        <th className="text-right p-3 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.accesorios.map((acc) => (
                        <tr key={acc.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">{acc.detalle}</td>
                          <td className="p-3 text-gray-600">{acc.numero_parte}</td>
                          <td className="text-right p-3">{acc.cantidad}</td>
                          <td className="text-right p-3">
                            {Number(acc.precio_unitario).toFixed(2)} {acc.moneda_simbolo}
                          </td>
                          <td className="text-right p-3 font-medium">
                            {Number(acc.subtotal).toFixed(2)}
                          </td>
                          <td className="text-right p-3">
                            {acc.descuento_monto && Number(acc.descuento_monto) > 0 ? (
                              <>
                                <p className="text-xs text-gray-500">
                                  {acc.descuento_porcentaje}%
                                </p>
                                <p className="font-medium">
                                  -{Number(acc.descuento_monto).toFixed(2)}
                                </p>
                              </>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="text-right p-3 font-bold text-blue-600">
                            {Number(acc.total).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* ✅ TOTALES POR MONEDA */}
                <div className="space-y-2 p-4 bg-gray-50 rounded-lg ml-auto w-80 border-l-4 border-blue-500">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">
                      {Number(grupo.subtotal).toFixed(2)} {grupo.simbolo}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Descuentos:</span>
                    <span className="font-medium text-red-600">
                      -{Number(grupo.descuento).toFixed(2)} {grupo.simbolo}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-bold text-gray-900">Total:</span>
                    <span className="font-bold text-lg text-blue-600">
                      {Number(grupo.total).toFixed(2)} {grupo.simbolo}
                    </span>
                  </div>
                </div>
              </div>
            ))}

            {/* ✅ RESUMEN GENERAL (SI HAY MÚLTIPLES MONEDAS) */}
            {gruposMoneda.length > 1 && (
              <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-orange-300">
                <h3 className="font-bold text-lg text-orange-900 mb-3">
                  Resumen General (Múltiples Monedas)
                </h3>
                <div className="space-y-2">
                  {gruposMoneda.map((grupo) => (
                    <div key={grupo.codigo} className="flex justify-between items-center p-2 bg-white rounded border border-orange-200">
                      <div>
                        <p className="font-semibold text-gray-900">{grupo.codigo}</p>
                        <p className="text-xs text-gray-600">{grupo.simbolo}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-600">
                          Subtotal: {Number(grupo.subtotal).toFixed(2)}
                        </p>
                        <p className="text-sm text-red-600">
                          Desc: -{Number(grupo.descuento).toFixed(2)}
                        </p>
                        <p className="text-base font-bold text-blue-600">
                          Total: {Number(grupo.total).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 p-3 bg-orange-100 rounded text-sm text-orange-900">
                  <p className="font-semibold">⚠️ Nota:</p>
                  <p>Esta cotización contiene múltiples monedas. Los totales se muestran separados por moneda.</p>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}