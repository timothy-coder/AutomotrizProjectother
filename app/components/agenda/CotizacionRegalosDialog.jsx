"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader, Plus, Trash2, Check, X } from "lucide-react";
import { toast } from "sonner";

export default function CotizacionRegalosDialog({
  open,
  onOpenChange,
  cotizacion,
  onRegalosUpdated,
}) {
  const [regalos, setRegalos] = useState([]);
  const [cotizacionRegalos, setCotizacionRegalos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedRegalos, setSelectedRegalos] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState("agregar");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ✅ Estados para descuento total
  const [descuentoTotal, setDescuentoTotal] = useState(0);
  const [descuentoInput, setDescuentoInput] = useState(0);
  const [isSavingDescuento, setIsSavingDescuento] = useState(false);
  const [descuentoError, setDescuentoError] = useState(null);
  const [isEditingDescuento, setIsEditingDescuento] = useState(false);

  // ✅ Cargar datos cuando se abre el dialog
  useEffect(() => {
    if (!open || !cotizacion) {
      setSelectedRegalos([]);
      return;
    }

    loadData();
  }, [open, cotizacion]);

  async function loadData() {
    try {
      setLoading(true);

      // Cargar regalos disponibles
      const resRegalos = await fetch("/api/regalos-disponibles", {
        cache: "no-store",
      });
      if (resRegalos.ok) {
        const data = await resRegalos.json();
        setRegalos(Array.isArray(data) ? data : []);
      }

      // Cargar regalos de la cotización
      const resCotizacion = await fetch(
        `/api/cotizaciones-regalos/by-cotizacion/${cotizacion.id}`,
        { cache: "no-store" }
      );
      if (resCotizacion.ok) {
        const data = await resCotizacion.json();
        const formateados = Array.isArray(data)
          ? data.map((regalo) => ({
              ...regalo,
              cantidad: Number(regalo.cantidad),
              precio_unitario: Number(regalo.precio_unitario),
              subtotal: Number(regalo.subtotal),
              descuento_porcentaje: regalo.descuento_porcentaje
                ? Number(regalo.descuento_porcentaje)
                : 0,
              descuento_monto: regalo.descuento_monto
                ? Number(regalo.descuento_monto)
                : 0,
              total: Number(regalo.total),
            }))
          : [];
        setCotizacionRegalos(formateados);

        if (formateados.length > 0) {
          setActiveTab("ver");
        }
      }

      // ✅ Cargar descuento total de regalos
      const resDescuento = await fetch(
        `/api/cotizacionesagenda/${cotizacion.id}/descuento-regalos`,
        { cache: "no-store" }
      );
      if (resDescuento.ok) {
        const data = await resDescuento.json();
        setDescuentoTotal(data.descuento_total_regalos || 0);
        setDescuentoInput(data.descuento_total_regalos || 0);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  // ✅ Guardar descuento total con autoguardado
  async function guardarDescuentoTotal(valor) {
    try {
      setIsSavingDescuento(true);
      setDescuentoError(null);

      // Validar valor
      if (valor < 0) {
        setDescuentoError("El descuento no puede ser negativo");
        return;
      }

      const res = await fetch(
        `/api/cotizacionesagenda/${cotizacion.id}/descuento-regalos`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            descuento_total_regalos: parseFloat(valor),
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error guardando descuento");
      }

      const data = await res.json();
      setDescuentoTotal(data.descuento_total_regalos);
      setDescuentoInput(data.descuento_total_regalos);
      setIsEditingDescuento(false);
      toast.success("Descuento guardado");
    } catch (error) {
      console.error(error);
      setDescuentoError(error.message);
      toast.error("Error: " + error.message);
    } finally {
      setIsSavingDescuento(false);
    }
  }

  // ✅ Calcular totales
  const calculateTotals = (regalo) => {
    const precio = parseFloat(regalo.precio_venta || regalo.precio_compra) || 0;
    const cantidad = regalo.cantidad || 1;
    const subtotal = precio * cantidad;

    let descuento = 0;
    if (regalo.descuento_porcentaje) {
      descuento = subtotal * (parseFloat(regalo.descuento_porcentaje) / 100);
    } else if (regalo.descuento_monto) {
      descuento = parseFloat(regalo.descuento_monto);
    }

    const total = subtotal - descuento;

    return {
      subtotal: subtotal.toFixed(2),
      descuento: descuento.toFixed(2),
      total: total.toFixed(2),
    };
  };

  // ✅ Agrupar por moneda
  const agruparPorMoneda = (items) => {
    const grupos = {};

    items.forEach((regalo) => {
      const monedaCodigo = regalo.moneda_codigo || "SIN_MONEDA";

      if (!grupos[monedaCodigo]) {
        grupos[monedaCodigo] = {
          simbolo: regalo.moneda_simbolo,
          codigo: monedaCodigo,
          subtotal: 0,
          descuento: 0,
          total: 0,
          regalos: [],
        };
      }

      grupos[monedaCodigo].subtotal += regalo.subtotal || 0;
      grupos[monedaCodigo].descuento += regalo.descuento_monto || 0;
      grupos[monedaCodigo].total += regalo.total || 0;
      grupos[monedaCodigo].regalos.push(regalo);
    });

    return Object.values(grupos);
  };

  // ✅ Agregar regalos
  async function handleAgregarRegalos() {
    if (selectedRegalos.length === 0) {
      toast.warning("Selecciona al menos un regalo");
      return;
    }

    setSaving(true);
    try {
      const promises = selectedRegalos.map((regalo) =>
        fetch(`/api/cotizaciones-regalos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cotizacion_id: cotizacion.id,
            regalo_id: regalo.id,
            cantidad: regalo.cantidad || 1,
            descuento_porcentaje: regalo.descuento_porcentaje || null,
            descuento_monto: regalo.descuento_monto || null,
            notas: regalo.notas || null,
          }),
        })
      );

      const responses = await Promise.all(promises);
      const allOk = responses.every((r) => r.ok);

      if (!allOk) {
        throw new Error("Error agregando algunos regalos");
      }

      toast.success(`${selectedRegalos.length} regalo(s) agregado(s)`);
      setSelectedRegalos([]);
      await loadData();
      setActiveTab("ver");
      onRegalosUpdated?.();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error agregando regalos");
    } finally {
      setSaving(false);
    }
  }

  // ✅ Eliminar regalo con AlertDialog
  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/cotizaciones-regalos/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Error eliminando regalo");

      toast.success("Regalo eliminado");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await loadData();
      onRegalosUpdated?.();
    } catch (error) {
      console.error(error);
      toast.error("Error eliminando regalo");
    } finally {
      setSaving(false);
    }
  }

  const gruposMonedaActual = agruparPorMoneda(cotizacionRegalos);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Gestionar Regalos - Cotización Q-{String(cotizacion?.id).padStart(6, "0")}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* ✅ SECCIÓN DESCUENTO TOTAL DE REGALOS */}
              <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-lg border-2 border-pink-200">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Descuento Total de Regalos
                    </label>
                    {isEditingDescuento ? (
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={descuentoInput}
                            onChange={(e) => {
                              setDescuentoInput(e.target.value);
                              setDescuentoError(null);
                            }}
                            placeholder="0.00"
                            className={`text-sm font-semibold ${
                              descuentoError ? "border-red-500" : ""
                            }`}
                            disabled={isSavingDescuento}
                          />
                        </div>
                        <button
                          onClick={() => guardarDescuentoTotal(descuentoInput)}
                          disabled={isSavingDescuento}
                          className="p-2 rounded bg-green-500 hover:bg-green-600 text-white disabled:opacity-50 transition-colors"
                          title="Guardar"
                        >
                          {isSavingDescuento ? (
                            <Loader className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check size={16} />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setIsEditingDescuento(false);
                            setDescuentoInput(descuentoTotal);
                            setDescuentoError(null);
                          }}
                          disabled={isSavingDescuento}
                          className="p-2 rounded bg-red-500 hover:bg-red-600 text-white disabled:opacity-50 transition-colors"
                          title="Cancelar"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <p className="text-lg font-bold text-pink-600">
                          ${descuentoTotal.toFixed(2)}
                        </p>
                        <button
                          onClick={() => {
                            setIsEditingDescuento(true);
                            setDescuentoInput(descuentoTotal);
                          }}
                          className="text-xs px-3 py-1 rounded bg-pink-500 hover:bg-pink-600 text-white transition-colors"
                        >
                          Editar
                        </button>
                      </div>
                    )}
                    {descuentoError && (
                      <p className="text-xs text-red-600 mt-1">{descuentoError}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* ✅ TABS */}
              <div className="flex gap-2 border-b">
                <button
                  onClick={() => setActiveTab("ver")}
                  className={`px-4 py-2 font-medium text-sm transition-colors ${
                    activeTab === "ver"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Ver Regalos ({cotizacionRegalos.length})
                </button>
                <button
                  onClick={() => setActiveTab("agregar")}
                  className={`px-4 py-2 font-medium text-sm transition-colors ${
                    activeTab === "agregar"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Agregar Regalos
                </button>
              </div>

              {/* ✅ TAB: VER REGALOS */}
              {activeTab === "ver" ? (
                <div className="space-y-6">
                  {cotizacionRegalos.length === 0 ? (
                    <div className="flex justify-center items-center py-12">
                      <p className="text-gray-500">No hay regalos en esta cotización</p>
                    </div>
                  ) : (
                    <>
                      {/* Tablas por Moneda */}
                      {gruposMonedaActual.map((grupo) => (
                        <div key={grupo.codigo} className="space-y-4">
                          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                            <h3 className="font-semibold text-blue-900">
                              Resumen en {grupo.simbolo} ({grupo.codigo})
                            </h3>
                          </div>

                          <div className="border rounded-lg overflow-x-auto">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="bg-gray-100 border-b">
                                  <th className="text-left p-3 font-semibold">Descripción</th>
                                  <th className="text-left p-3 font-semibold">Lote</th>
                                  <th className="text-center p-3 font-semibold">Tienda</th>
                                  <th className="text-right p-3 font-semibold">Cantidad</th>
                                  <th className="text-right p-3 font-semibold">Unitario</th>
                                  <th className="text-right p-3 font-semibold">Subtotal</th>
                                  <th className="text-right p-3 font-semibold">Descuento</th>
                                  <th className="text-right p-3 font-semibold">Total</th>
                                  <th className="text-center p-3 font-semibold">Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {grupo.regalos.map((regalo) => (
                                  <tr
                                    key={regalo.id}
                                    className="border-b hover:bg-gray-50 transition-colors"
                                  >
                                    <td className="p-3">{regalo.detalle}</td>
                                    <td className="p-3 text-gray-600">{regalo.lote}</td>
                                    <td className="p-3 text-center">
                                      <span
                                        className={`text-xs font-semibold px-2 py-1 rounded ${
                                          regalo.regalo_tienda
                                            ? "bg-green-100 text-green-800"
                                            : "bg-gray-100 text-gray-800"
                                        }`}
                                      >
                                        {regalo.regalo_tienda ? "✓ Sí" : "No"}
                                      </span>
                                    </td>
                                    <td className="text-right p-3">{regalo.cantidad}</td>
                                    <td className="text-right p-3">
                                      {regalo.precio_unitario.toFixed(2)} {regalo.moneda_simbolo}
                                    </td>
                                    <td className="text-right p-3 font-medium">
                                      {regalo.subtotal.toFixed(2)}
                                    </td>
                                    <td className="text-right p-3">
                                      {regalo.descuento_monto > 0 ? (
                                        <div className="text-xs">
                                          {regalo.descuento_porcentaje > 0 && (
                                            <p className="text-gray-500">
                                              {regalo.descuento_porcentaje}%
                                            </p>
                                          )}
                                          <p className="font-medium text-red-600">
                                            -{regalo.descuento_monto.toFixed(2)}
                                          </p>
                                        </div>
                                      ) : (
                                        "-"
                                      )}
                                    </td>
                                    <td className="text-right p-3 font-bold text-blue-600">
                                      {regalo.total.toFixed(2)}
                                    </td>
                                    <td className="text-center p-3">
                                      <button
                                        onClick={() => {
                                          setDeleteDialogOpen(true);
                                          setDeleteTarget(regalo);
                                        }}
                                        disabled={saving}
                                        className="text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
                                        title="Eliminar"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>

                          {/* Totales por Moneda */}
                          <div className="space-y-2 p-4 bg-gray-50 rounded-lg ml-auto w-96 border-l-4 border-blue-500">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Subtotal:</span>
                              <span className="font-medium">
                                {grupo.subtotal.toFixed(2)} {grupo.simbolo}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Descuentos:</span>
                              <span className="font-medium text-red-600">
                                -{grupo.descuento.toFixed(2)} {grupo.simbolo}
                              </span>
                            </div>
                            <div className="border-t pt-2 flex justify-between">
                              <span className="font-bold text-gray-900">Total:</span>
                              <span className="font-bold text-lg text-blue-600">
                                {grupo.total.toFixed(2)} {grupo.simbolo}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}

                      {/* Resumen General */}
                      {gruposMonedaActual.length > 1 && (
                        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border-2 border-orange-300">
                          <h3 className="font-bold text-lg text-orange-900 mb-3">
                            Resumen General (Múltiples Monedas)
                          </h3>
                          <div className="space-y-2">
                            {gruposMonedaActual.map((grupo) => (
                              <div
                                key={grupo.codigo}
                                className="flex justify-between items-center p-2 bg-white rounded border border-orange-200"
                              >
                                <div>
                                  <p className="font-semibold text-gray-900">{grupo.codigo}</p>
                                  <p className="text-xs text-gray-600">{grupo.simbolo}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-gray-600">
                                    Subtotal: {grupo.subtotal.toFixed(2)}
                                  </p>
                                  <p className="text-sm text-red-600">
                                    Desc: -{grupo.descuento.toFixed(2)}
                                  </p>
                                  <p className="text-base font-bold text-blue-600">
                                    Total: {grupo.total.toFixed(2)}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 p-3 bg-orange-100 rounded text-sm text-orange-900">
                            <p className="font-semibold">⚠️ Nota:</p>
                            <p>Esta cotización contiene múltiples monedas. Los totales se muestran separados.</p>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : (
                /* ✅ TAB: AGREGAR REGALOS */
                <div className="space-y-4">
                  {regalos.length === 0 ? (
                    <div className="flex justify-center items-center py-8">
                      <p className="text-gray-500">
                        No hay regalos disponibles
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="border rounded-lg overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b">
                              <th className="text-left p-3 w-8">✓</th>
                              <th className="text-left p-3 min-w-[200px]">Detalle</th>
                              <th className="text-left p-3 min-w-[100px]">Lote</th>
                              <th className="text-center p-3 min-w-[80px]">Tienda</th>
                              <th className="text-right p-3 min-w-[100px]">Precio Unit.</th>
                              <th className="text-center p-3 min-w-[80px]">Cant.</th>
                              <th className="text-right p-3 min-w-[100px]">Subtotal</th>
                              <th className="text-center p-3 min-w-[120px]">Descuento</th>
                              <th className="text-right p-3 min-w-[100px]">Total</th>
                              <th className="text-center p-3 w-8">⋯</th>
                            </tr>
                          </thead>
                          <tbody>
                            {regalos.map((regalo) => {
                              const isSelected = selectedRegalos.some(
                                (r) => r.id === regalo.id
                              );
                              const selectedItem = selectedRegalos.find(
                                (r) => r.id === regalo.id
                              );
                              const totals = selectedItem
                                ? calculateTotals(selectedItem)
                                : null;
                              const isExpanded = expandedId === regalo.id;

                              return (
                                <tr
                                  key={`row-${regalo.id}`}
                                  className={`border-b transition-colors ${
                                    isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                                  }`}
                                >
                                  <td className="p-3">
                                    <input
                                      type="checkbox"
                                      checked={isSelected}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setSelectedRegalos([
                                            ...selectedRegalos,
                                            {
                                              ...regalo,
                                              cantidad: 1,
                                              descuento_tipo: "porcentaje",
                                              descuento_porcentaje: null,
                                              descuento_monto: null,
                                              notas: null,
                                            },
                                          ]);
                                        } else {
                                          setSelectedRegalos(
                                            selectedRegalos.filter(
                                              (r) => r.id !== regalo.id
                                            )
                                          );
                                          setExpandedId(null);
                                        }
                                      }}
                                    />
                                  </td>
                                  <td className="p-3 font-medium">{regalo.detalle}</td>
                                  <td className="p-3 text-gray-600">{regalo.lote}</td>
                                  <td className="p-3 text-center">
                                    <span
                                      className={`text-xs font-semibold px-2 py-1 rounded ${
                                        regalo.regalo_tienda
                                          ? "bg-green-100 text-green-800"
                                          : "bg-gray-100 text-gray-800"
                                      }`}
                                    >
                                      {regalo.regalo_tienda ? "✓" : "✗"}
                                    </span>
                                  </td>
                                  <td className="p-3 text-right">
                                    {regalo.simbolo}{" "}
                                    {parseFloat(
                                      regalo.precio_venta || regalo.precio_compra
                                    ).toFixed(2)}
                                  </td>
                                  <td className="p-3">
                                    {isSelected ? (
                                      <Input
                                        type="number"
                                        min="1"
                                        value={selectedItem.cantidad}
                                        onChange={(e) => {
                                          const newQuantity =
                                            parseInt(e.target.value) || 1;
                                          setSelectedRegalos(
                                            selectedRegalos.map((r) =>
                                              r.id === regalo.id
                                                ? { ...r, cantidad: newQuantity }
                                                : r
                                            )
                                          );
                                        }}
                                        className="w-full text-center"
                                      />
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right">
                                    {isSelected && totals ? (
                                      <span className="text-gray-700 font-medium">
                                        {regalo.simbolo} {totals.subtotal}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    {isSelected ? (
                                      <div className="text-xs">
                                        {selectedItem.descuento_porcentaje ? (
                                          <div className="text-blue-600 font-semibold">
                                            {selectedItem.descuento_porcentaje}%
                                          </div>
                                        ) : selectedItem.descuento_monto ? (
                                          <div className="text-blue-600 font-semibold">
                                            {regalo.simbolo}{" "}
                                            {selectedItem.descuento_monto}
                                          </div>
                                        ) : (
                                          <span className="text-gray-400">
                                            Sin desc.
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right">
                                    {isSelected && totals ? (
                                      <span className="text-blue-600 font-bold text-lg">
                                        {regalo.simbolo} {totals.total}
                                      </span>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-center">
                                    {isSelected && (
                                      <button
                                        onClick={() =>
                                          setExpandedId(
                                            isExpanded ? null : regalo.id
                                          )
                                        }
                                        className="text-blue-600 hover:text-blue-700 font-bold"
                                      >
                                        {isExpanded ? "▼" : "▶"}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>

                        {/* Filas Expandidas */}
                        {selectedRegalos.length > 0 && expandedId && (
                          <div className="border-t">
                            {selectedRegalos
                              .filter((r) => r.id === expandedId)
                              .map((selectedItem) => {
                                const regalo = regalos.find(
                                  (r) => r.id === selectedItem.id
                                );
                                const totals = calculateTotals(selectedItem);

                                return (
                                  <div
                                    key={`expanded-${selectedItem.id}`}
                                    className="bg-blue-50 border-b"
                                  >
                                    <div className="p-4 space-y-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Tipo de Descuento */}
                                        <div>
                                          <label className="text-xs font-semibold text-gray-700 block mb-2">
                                            Tipo de Descuento
                                          </label>
                                          <Select
                                            value={
                                              selectedItem.descuento_tipo ||
                                              "porcentaje"
                                            }
                                            onValueChange={(value) => {
                                              setSelectedRegalos(
                                                selectedRegalos.map((r) =>
                                                  r.id === selectedItem.id
                                                    ? {
                                                        ...r,
                                                        descuento_tipo: value,
                                                        descuento_porcentaje: null,
                                                        descuento_monto: null,
                                                      }
                                                    : r
                                                )
                                              );
                                            }}
                                          >
                                            <SelectTrigger className="text-sm">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem
                                                value="porcentaje"
                                                className="text-sm"
                                              >
                                                Por Porcentaje (%)
                                              </SelectItem>
                                              <SelectItem
                                                value="monto"
                                                className="text-sm"
                                              >
                                                Por Monto ({regalo.simbolo})
                                              </SelectItem>
                                              <SelectItem
                                                value="ninguno"
                                                className="text-sm"
                                              >
                                                Sin Descuento
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        {/* Valor de Descuento */}
                                        {selectedItem.descuento_tipo !==
                                          "ninguno" && (
                                          <div>
                                            <label className="text-xs font-semibold text-gray-700 block mb-2">
                                              {selectedItem.descuento_tipo ===
                                              "porcentaje"
                                                ? "Porcentaje (%)"
                                                : `Monto (${regalo.simbolo})`}
                                            </label>
                                            <Input
                                              type="number"
                                              min="0"
                                              max={
                                                selectedItem.descuento_tipo ===
                                                "porcentaje"
                                                  ? "100"
                                                  : undefined
                                              }
                                              step="0.01"
                                              placeholder="0.00"
                                              value={
                                                selectedItem.descuento_tipo ===
                                                "porcentaje"
                                                  ? selectedItem.descuento_porcentaje ||
                                                    ""
                                                  : selectedItem.descuento_monto ||
                                                    ""
                                              }
                                              onChange={(e) => {
                                                const value = e.target.value
                                                  ? parseFloat(e.target.value)
                                                  : null;
                                                setSelectedRegalos(
                                                  selectedRegalos.map((r) =>
                                                    r.id === selectedItem.id
                                                      ? {
                                                          ...r,
                                                          ...(selectedItem.descuento_tipo ===
                                                          "porcentaje"
                                                            ? {
                                                                descuento_porcentaje:
                                                                  value,
                                                                descuento_monto:
                                                                  null,
                                                              }
                                                            : {
                                                                descuento_monto:
                                                                  value,
                                                                descuento_porcentaje:
                                                                  null,
                                                              }),
                                                        }
                                                      : r
                                                  )
                                                );
                                              }}
                                              className="text-sm"
                                            />
                                          </div>
                                        )}
                                      </div>

                                      {/* Notas */}
                                      <div>
                                        <label className="text-xs font-semibold text-gray-700 block mb-2">
                                          Notas
                                        </label>
                                        <Input
                                          type="text"
                                          placeholder="Agregue notas sobre este regalo..."
                                          value={selectedItem.notas || ""}
                                          onChange={(e) => {
                                            setSelectedRegalos(
                                              selectedRegalos.map((r) =>
                                                r.id === selectedItem.id
                                                  ? {
                                                      ...r,
                                                      notas: e.target.value,
                                                    }
                                                  : r
                                              )
                                            );
                                          }}
                                          className="text-sm"
                                        />
                                      </div>

                                      {/* Resumen */}
                                      {totals && (
                                        <div className="grid grid-cols-3 gap-3 p-3 bg-white rounded border-2 border-blue-200">
                                          <div className="text-center">
                                            <p className="text-xs text-gray-600 font-medium">
                                              Subtotal
                                            </p>
                                            <p className="text-base font-bold text-gray-900">
                                              {regalo.simbolo}{" "}
                                              {totals.subtotal}
                                            </p>
                                          </div>
                                          <div className="text-center">
                                            <p className="text-xs text-gray-600 font-medium">
                                              Descuento
                                            </p>
                                            <p className="text-base font-bold text-red-600">
                                              -{regalo.simbolo}{" "}
                                              {totals.descuento}
                                            </p>
                                          </div>
                                          <div className="text-center">
                                            <p className="text-xs text-gray-600 font-medium">
                                              Total
                                            </p>
                                            <p className="text-base font-bold text-blue-600">
                                              {regalo.simbolo}{" "}
                                              {totals.total}
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                        </div>
                        )}
                      </div>

                      {selectedRegalos.length > 0 && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <p className="font-bold text-blue-900 mb-2">
                            ✓ {selectedRegalos.length} regalo(s) seleccionado(s)
                          </p>
                          <div className="space-y-1">
                            {selectedRegalos.map((regalo) => {
                              const totals = calculateTotals(regalo);
                              return (
                                <p key={regalo.id} className="text-sm text-blue-700">
                                  • <strong>{regalo.detalle}</strong> x{regalo.cantidad}{" "}
                                  =
                                  <span className="font-bold text-blue-600 ml-1">
                                    {regalo.simbolo} {totals.total}
                                  </span>
                                  {regalo.descuento_porcentaje && (
                                    <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                      {regalo.descuento_porcentaje}% desc
                                    </span>
                                  )}
                                  {regalo.descuento_monto && (
                                    <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                      {regalo.simbolo} {regalo.descuento_monto} desc
                                    </span>
                                  )}
                                </p>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* ✅ FOOTER */}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={saving}
                >
                  Cerrar
                </Button>
                {activeTab === "agregar" && (
                  <Button
                    onClick={handleAgregarRegalos}
                    disabled={saving || selectedRegalos.length === 0}
                    className="gap-2"
                  >
                    <Plus size={14} />
                    {saving
                      ? "Agregando..."
                      : `Agregar ${selectedRegalos.length} Regalo(s)`}
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* ✅ ALERT DIALOG PARA CONFIRMAR ELIMINACIÓN */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminar Regalo</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar el regalo{" "}
              <strong>{deleteTarget?.detalle}</strong>? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <DialogFooter>
            <AlertDialogCancel disabled={saving}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? "Eliminando..." : "Eliminar"}
            </AlertDialogAction>
          </DialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}