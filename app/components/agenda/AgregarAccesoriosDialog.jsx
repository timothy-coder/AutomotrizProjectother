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

export default function CotizacionAccesoriosDialog({
  open,
  onOpenChange,
  cotizacion,
  marcaId,
  modeloId,
  onAccesoriosUpdated,
}) {
  const [accesorios, setAccesorios] = useState([]);
  const [cotizacionAcsesorios, setCotizacionAcsesorios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedAccesorios, setSelectedAccesorios] = useState([]);
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
      setSelectedAccesorios([]);
      return;
    }

    loadData();
  }, [open, cotizacion, marcaId, modeloId]);

  async function loadData() {
    try {
      setLoading(true);
      
      // Cargar accesorios disponibles
      if (marcaId && modeloId) {
        const resAccesorios = await fetch(
          `/api/accesorios-disponibles?marca_id=${marcaId}&modelo_id=${modeloId}`,
          { cache: "no-store" }
        );
        if (resAccesorios.ok) {
          const data = await resAccesorios.json();
          setAccesorios(Array.isArray(data) ? data : []);
        }
      }

      // Cargar accesorios de la cotización
      const resCotizacion = await fetch(
        `/api/cotizaciones-accesorios/by-cotizacion/${cotizacion.id}`,
        { cache: "no-store" }
      );
      if (resCotizacion.ok) {
        const data = await resCotizacion.json();
        const formateados = Array.isArray(data)
          ? data.map((acc) => ({
              ...acc,
              cantidad: Number(acc.cantidad),
              precio_unitario: Number(acc.precio_unitario),
              subtotal: Number(acc.subtotal),
              descuento_porcentaje: acc.descuento_porcentaje ? Number(acc.descuento_porcentaje) : 0,
              descuento_monto: acc.descuento_monto ? Number(acc.descuento_monto) : 0,
              total: Number(acc.total),
            }))
          : [];
        setCotizacionAcsesorios(formateados);
        
        if (formateados.length > 0) {
          setActiveTab("ver");
        }
      }

      // ✅ Cargar descuento total de accesorios
      const resDescuento = await fetch(
        `/api/cotizacionesagenda/${cotizacion.id}/descuento-accesorios`,
        { cache: "no-store" }
      );
      if (resDescuento.ok) {
        const data = await resDescuento.json();
        setDescuentoTotal(data.descuento_total_accesorios || 0);
        setDescuentoInput(data.descuento_total_accesorios || 0);
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
        `/api/cotizacionesagenda/${cotizacion.id}/descuento-accesorios`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            descuento_total_accesorios: parseFloat(valor),
          }),
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error guardando descuento");
      }

      const data = await res.json();
      setDescuentoTotal(data.descuento_total_accesorios);
      setDescuentoInput(data.descuento_total_accesorios);
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
  const calculateTotals = (accesorio) => {
    const precio = parseFloat(accesorio.precio) || 0;
    const cantidad = accesorio.cantidad || 1;
    const subtotal = precio * cantidad;

    let descuento = 0;
    if (accesorio.descuento_porcentaje) {
      descuento = subtotal * (parseFloat(accesorio.descuento_porcentaje) / 100);
    } else if (accesorio.descuento_monto) {
      descuento = parseFloat(accesorio.descuento_monto);
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

    items.forEach((acc) => {
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

  // ✅ Agregar accesorios
  async function handleAgregarAccesorios() {
    if (selectedAccesorios.length === 0) {
      toast.warning("Selecciona al menos un accesorio");
      return;
    }

    setSaving(true);
    try {
      const promises = selectedAccesorios.map((accesorio) =>
        fetch(`/api/cotizaciones-accesorios`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cotizacion_id: cotizacion.id,
            accesorio_id: accesorio.id,
            cantidad: accesorio.cantidad || 1,
            descuento_porcentaje: accesorio.descuento_porcentaje || null,
            descuento_monto: accesorio.descuento_monto || null,
            notas: accesorio.notas || null,
          }),
        })
      );

      const responses = await Promise.all(promises);
      const allOk = responses.every((r) => r.ok);

      if (!allOk) {
        throw new Error("Error agregando algunos accesorios");
      }

      toast.success(`${selectedAccesorios.length} accesorio(s) agregado(s)`);
      setSelectedAccesorios([]);
      await loadData();
      setActiveTab("ver");
      onAccesoriosUpdated?.();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error agregando accesorios");
    } finally {
      setSaving(false);
    }
  }

  // ✅ Eliminar accesorio con AlertDialog
  async function handleConfirmDelete() {
    if (!deleteTarget) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/cotizaciones-accesorios/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error("Error eliminando accesorio");

      toast.success("Accesorio eliminado");
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await loadData();
      onAccesoriosUpdated?.();
    } catch (error) {
      console.error(error);
      toast.error("Error eliminando accesorio");
    } finally {
      setSaving(false);
    }
  }

  const gruposMonedaActual = agruparPorMoneda(cotizacionAcsesorios);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Gestionar Accesorios - Cotización Q-{String(cotizacion?.id).padStart(6, "0")}
            </DialogTitle>
          </DialogHeader>

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <>
              {/* ✅ SECCIÓN DESCUENTO TOTAL DE ACCESORIOS */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border-2 border-blue-200">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-gray-700 block mb-1">
                      Descuento Total de Accesorios
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
                        <p className="text-lg font-bold text-blue-600">
                          ${descuentoTotal.toFixed(2)}
                        </p>
                        <button
                          onClick={() => {
                            setIsEditingDescuento(true);
                            setDescuentoInput(descuentoTotal);
                          }}
                          className="text-xs px-3 py-1 rounded bg-blue-500 hover:bg-blue-600 text-white transition-colors"
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
                  Ver Accesorios ({cotizacionAcsesorios.length})
                </button>
                <button
                  onClick={() => setActiveTab("agregar")}
                  className={`px-4 py-2 font-medium text-sm transition-colors ${
                    activeTab === "agregar"
                      ? "text-blue-600 border-b-2 border-blue-600"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Agregar Accesorios
                </button>
              </div>

              {/* ✅ TAB: VER ACCESORIOS */}
              {activeTab === "ver" ? (
                <div className="space-y-6">
                  {cotizacionAcsesorios.length === 0 ? (
                    <div className="flex justify-center items-center py-12">
                      <p className="text-gray-500">No hay accesorios en esta cotización</p>
                    </div>
                  ) : (
                    <>
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
                                  <th className="text-left p-3 font-semibold">N° Parte</th>
                                  <th className="text-right p-3 font-semibold">Cantidad</th>
                                  <th className="text-right p-3 font-semibold">Unitario</th>
                                  <th className="text-right p-3 font-semibold">Subtotal</th>
                                  <th className="text-right p-3 font-semibold">Descuento</th>
                                  <th className="text-right p-3 font-semibold">Total</th>
                                  <th className="text-center p-3 font-semibold">Acciones</th>
                                </tr>
                              </thead>
                              <tbody>
                                {grupo.accesorios.map((acc) => (
                                  <tr
                                    key={acc.id}
                                    className="border-b hover:bg-gray-50 transition-colors"
                                  >
                                    <td className="p-3">{acc.detalle}</td>
                                    <td className="p-3 text-gray-600">{acc.numero_parte}</td>
                                    <td className="text-right p-3">{acc.cantidad}</td>
                                    <td className="text-right p-3">
                                      {acc.precio_unitario.toFixed(2)} {acc.moneda_simbolo}
                                    </td>
                                    <td className="text-right p-3 font-medium">
                                      {acc.subtotal.toFixed(2)}
                                    </td>
                                    <td className="text-right p-3">
                                      {acc.descuento_monto > 0 ? (
                                        <div className="text-xs">
                                          {acc.descuento_porcentaje > 0 && (
                                            <p className="text-gray-500">{acc.descuento_porcentaje}%</p>
                                          )}
                                          <p className="font-medium text-red-600">
                                            -{acc.descuento_monto.toFixed(2)}
                                          </p>
                                        </div>
                                      ) : (
                                        "-"
                                      )}
                                    </td>
                                    <td className="text-right p-3 font-bold text-blue-600">
                                      {acc.total.toFixed(2)}
                                    </td>
                                    <td className="text-center p-3">
                                      <button
                                        onClick={() => {
                                          setDeleteDialogOpen(true);
                                          setDeleteTarget(acc);
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
                /* ✅ TAB: AGREGAR ACCESORIOS */
                <div className="space-y-4">
                  {accesorios.length === 0 ? (
                    <div className="flex justify-center items-center py-8">
                      <p className="text-gray-500">
                        No hay accesorios disponibles para esta marca y modelo
                      </p>
                    </div>
                  ) : (
                    <>
                      <div className="text-sm text-gray-600">
                        <p>
                          <strong>Marca:</strong> {accesorios[0]?.marca_nombre || "N/A"}
                        </p>
                        <p>
                          <strong>Modelo:</strong> {accesorios[0]?.modelo_nombre || "N/A"}
                        </p>
                      </div>

                      <div className="border rounded-lg overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 border-b">
                              <th className="text-left p-3 w-8">✓</th>
                              <th className="text-left p-3 min-w-[200px]">Detalle</th>
                              <th className="text-left p-3 min-w-[120px]">N° Parte</th>
                              <th className="text-right p-3 min-w-[100px]">Precio Unit.</th>
                              <th className="text-center p-3 min-w-[80px]">Cant.</th>
                              <th className="text-right p-3 min-w-[100px]">Subtotal</th>
                              <th className="text-center p-3 min-w-[120px]">Descuento</th>
                              <th className="text-right p-3 min-w-[100px]">Total</th>
                              <th className="text-center p-3 w-8">⋯</th>
                            </tr>
                          </thead>
                          <tbody>
                            {accesorios.map((accesorio) => {
                              const isSelected = selectedAccesorios.some(
                                (a) => a.id === accesorio.id
                              );
                              const selectedItem = selectedAccesorios.find(
                                (a) => a.id === accesorio.id
                              );
                              const totals = selectedItem ? calculateTotals(selectedItem) : null;
                              const isExpanded = expandedId === accesorio.id;

                              return (
                                <tr
                                  key={`row-${accesorio.id}`}
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
                                          setSelectedAccesorios([
                                            ...selectedAccesorios,
                                            {
                                              ...accesorio,
                                              cantidad: 1,
                                              descuento_tipo: "porcentaje",
                                              descuento_porcentaje: null,
                                              descuento_monto: null,
                                              notas: null,
                                            },
                                          ]);
                                        } else {
                                          setSelectedAccesorios(
                                            selectedAccesorios.filter(
                                              (a) => a.id !== accesorio.id
                                            )
                                          );
                                          setExpandedId(null);
                                        }
                                      }}
                                    />
                                  </td>
                                  <td className="p-3 font-medium">{accesorio.detalle}</td>
                                  <td className="p-3 text-gray-600">
                                    {accesorio.numero_parte}
                                  </td>
                                  <td className="p-3 text-right">
                                    {accesorio.simbolo} {parseFloat(accesorio.precio).toFixed(2)}
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
                                          setSelectedAccesorios(
                                            selectedAccesorios.map((a) =>
                                              a.id === accesorio.id
                                                ? { ...a, cantidad: newQuantity }
                                                : a
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
                                        {accesorio.simbolo} {totals.subtotal}
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
                                            {accesorio.simbolo} {selectedItem.descuento_monto}
                                          </div>
                                        ) : (
                                          <span className="text-gray-400">Sin desc.</span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="text-gray-400">-</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right">
                                    {isSelected && totals ? (
                                      <span className="text-blue-600 font-bold text-lg">
                                        {accesorio.simbolo} {totals.total}
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
                                            isExpanded ? null : accesorio.id
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
                        {selectedAccesorios.length > 0 && expandedId && (
                          <div className="border-t">
                            {selectedAccesorios
                              .filter((acc) => acc.id === expandedId)
                              .map((selectedItem) => {
                                const accesorio = accesorios.find(
                                  (a) => a.id === selectedItem.id
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
                                            value={selectedItem.descuento_tipo || "porcentaje"}
                                            onValueChange={(value) => {
                                              setSelectedAccesorios(
                                                selectedAccesorios.map((a) =>
                                                  a.id === selectedItem.id
                                                    ? {
                                                        ...a,
                                                        descuento_tipo: value,
                                                        descuento_porcentaje: null,
                                                        descuento_monto: null,
                                                      }
                                                    : a
                                                )
                                              );
                                            }}
                                          >
                                            <SelectTrigger className="text-sm">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="porcentaje" className="text-sm">
                                                Por Porcentaje (%)
                                              </SelectItem>
                                              <SelectItem value="monto" className="text-sm">
                                                Por Monto ({accesorio.simbolo})
                                              </SelectItem>
                                              <SelectItem value="ninguno" className="text-sm">
                                                Sin Descuento
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        {/* Valor de Descuento */}
                                        {selectedItem.descuento_tipo !== "ninguno" && (
                                          <div>
                                            <label className="text-xs font-semibold text-gray-700 block mb-2">
                                              {selectedItem.descuento_tipo === "porcentaje"
                                                ? "Porcentaje (%)"
                                                : `Monto (${accesorio.simbolo})`}
                                            </label>
                                            <Input
                                              type="number"
                                              min="0"
                                              max={selectedItem.descuento_tipo === "porcentaje" ? "100" : undefined}
                                              step="0.01"
                                              placeholder="0.00"
                                              value={
                                                selectedItem.descuento_tipo === "porcentaje"
                                                  ? selectedItem.descuento_porcentaje || ""
                                                  : selectedItem.descuento_monto || ""
                                              }
                                              onChange={(e) => {
                                                const value = e.target.value
                                                  ? parseFloat(e.target.value)
                                                  : null;
                                                setSelectedAccesorios(
                                                  selectedAccesorios.map((a) =>
                                                    a.id === selectedItem.id
                                                      ? {
                                                          ...a,
                                                          ...(selectedItem.descuento_tipo === "porcentaje"
                                                            ? {
                                                                descuento_porcentaje: value,
                                                                descuento_monto: null,
                                                              }
                                                            : {
                                                                descuento_monto: value,
                                                                descuento_porcentaje: null,
                                                              }),
                                                        }
                                                      : a
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
                                          placeholder="Agregue notas sobre este accesorio..."
                                          value={selectedItem.notas || ""}
                                          onChange={(e) => {
                                            setSelectedAccesorios(
                                              selectedAccesorios.map((a) =>
                                                a.id === selectedItem.id
                                                  ? { ...a, notas: e.target.value }
                                                  : a
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
                                              {accesorio.simbolo} {totals.subtotal}
                                            </p>
                                          </div>
                                          <div className="text-center">
                                            <p className="text-xs text-gray-600 font-medium">
                                              Descuento
                                            </p>
                                            <p className="text-base font-bold text-red-600">
                                              -{accesorio.simbolo} {totals.descuento}
                                            </p>
                                          </div>
                                          <div className="text-center">
                                            <p className="text-xs text-gray-600 font-medium">Total</p>
                                            <p className="text-base font-bold text-blue-600">
                                              {accesorio.simbolo} {totals.total}
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

                      {selectedAccesorios.length > 0 && (
                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                          <p className="font-bold text-blue-900 mb-2">
                            ✓ {selectedAccesorios.length} accesorio(s) seleccionado(s)
                          </p>
                          <div className="space-y-1">
                            {selectedAccesorios.map((acc) => {
                              const totals = calculateTotals(acc);
                              return (
                                <p key={acc.id} className="text-sm text-blue-700">
                                  • <strong>{acc.detalle}</strong> x{acc.cantidad} =
                                  <span className="font-bold text-blue-600 ml-1">
                                    {acc.simbolo} {totals.total}
                                  </span>
                                  {acc.descuento_porcentaje && (
                                    <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                      {acc.descuento_porcentaje}% desc
                                    </span>
                                  )}
                                  {acc.descuento_monto && (
                                    <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
                                      {acc.simbolo} {acc.descuento_monto} desc
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
                    onClick={handleAgregarAccesorios}
                    disabled={saving || selectedAccesorios.length === 0}
                    className="gap-2"
                  >
                    <Plus size={14} />
                    {saving ? "Agregando..." : `Agregar ${selectedAccesorios.length} Accesorio(s)`}
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
            <AlertDialogTitle>Eliminar Accesorio</AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar el accesorio{" "}
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