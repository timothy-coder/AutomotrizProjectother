"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { AlertCircle, Package, Calendar, DollarSign, Package2, CheckCircle } from "lucide-react";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

export default function ProductDialog({
  open,
  onOpenChange,
  mode,
  product,
  onSave,
  onRefresh
}) {

  const isView = mode === "view";
  const isEdit = mode === "edit";

  const [form, setForm] = useState({
    numero_parte: "",
    descripcion: "",
    tipo_inventario_id: "",
    fecha_ingreso: "",
    precio_compra: "",
    precio_venta: "",
  });

  const [stockTotal, setStockTotal] = useState("");
  const [tiposInventario, setTiposInventario] = useState([]);
  const [updating, setUpdating] = useState(false);

  // Cargar tipos de inventario
  useEffect(() => {
    async function loadTipos() {
      try {
        const res = await fetch("/api/tipo-inventario");
        if (res.ok) {
          const data = await res.json();
          setTiposInventario(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Error cargando tipos:", error);
      }
    }
    loadTipos();
  }, []);

  useEffect(() => {

    if (!open) return;

    if (product) {
      setForm({
        numero_parte: product.numero_parte ?? "",
        descripcion: product.descripcion ?? "",
        tipo_inventario_id: product.tipo_inventario_id ? String(product.tipo_inventario_id) : "",
        fecha_ingreso: product.fecha_ingreso?.slice?.(0, 10) ?? "",
        precio_compra: product.precio_compra ?? "",
        precio_venta: product.precio_venta ?? "",
      });
      setStockTotal(String(product.stock_total ?? ""));
    } else {
      setForm({
        numero_parte: "",
        descripcion: "",
        tipo_inventario_id: "",
        fecha_ingreso: "",
        precio_compra: "",
        precio_venta: "",
      });
      setStockTotal("");
    }

  }, [open, product]);

  function updateField(k, v) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function handleUpdateStock() {

    if (!product?.id) return;

    const qty = Number(stockTotal);

    if (!Number.isFinite(qty) || qty < 0) {
      return toast.warning("Cantidad inválida");
    }

    try {
      setUpdating(true);

      const r = await fetch(`/api/productos/${product.id}/add-stock`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stock_total: qty })
      });

      const data = await r.json();

      if (!r.ok) {
        return toast.error(data.message || "Error");
      }

      toast.success("Stock actualizado");

      onRefresh?.();

    } catch {
      toast.error("Error conexión");
    } finally {
      setUpdating(false);
    }
  }

  function handleSave() {

    if (isView) return;

    if (!form.numero_parte?.trim()) {
      return toast.warning("Ingresa el número de parte");
    }

    if (!form.descripcion?.trim()) {
      return toast.warning("Ingresa la descripción");
    }

    onSave?.({
      numero_parte: form.numero_parte?.trim(),
      descripcion: form.descripcion?.trim(),
      tipo_inventario_id: form.tipo_inventario_id ? Number(form.tipo_inventario_id) : null,
      fecha_ingreso: form.fecha_ingreso || null,
      precio_compra: form.precio_compra === "" ? null : Number(form.precio_compra),
      precio_venta: form.precio_venta === "" ? null : Number(form.precio_venta),
    });
  }

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden flex flex-col">

          {/* HEADER */}
          <DialogHeader className="pb-3 sm:pb-4 border-b flex-shrink-0" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${BRAND_PRIMARY}15` }}>
                <Package size={20} style={{ color: BRAND_PRIMARY }} />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base sm:text-xl" style={{ color: BRAND_PRIMARY }}>
                  {isView ? "Ver producto" : isEdit ? "Editar producto" : "Nuevo producto"}
                </DialogTitle>
                <DialogDescription style={{ color: BRAND_SECONDARY }} className="text-xs sm:text-sm">
                  {isView ? "Solo lectura" : "Completa la información y guarda"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 pr-2 space-y-4 sm:space-y-5">

            {/* Sección 1: Información General */}
            <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
              <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: BRAND_PRIMARY }}>1</span>
                <span>Información General</span>
              </h3>

              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                  <Package2 size={14} />
                  Número de parte
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  disabled={isView}
                  value={form.numero_parte}
                  onChange={(e) => updateField("numero_parte", e.target.value)}
                  placeholder="Ej: ABC-12345"
                  className="h-8 sm:h-9 text-xs sm:text-sm border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                  Descripción
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  disabled={isView}
                  value={form.descripcion}
                  onChange={(e) => updateField("descripcion", e.target.value)}
                  placeholder="Descripción del producto"
                  className="h-8 sm:h-9 text-xs sm:text-sm border-gray-300"
                />
              </div>
            </div>

            {/* Sección 2: Categoría y Fecha */}
            <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
              <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: BRAND_PRIMARY }}>2</span>
                <span>Clasificación</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label className="text-xs sm:text-sm font-medium" style={{ color: BRAND_SECONDARY }}>
                    Tipo de inventario
                  </Label>
                  <Select
                    disabled={isView}
                    value={form.tipo_inventario_id}
                    onValueChange={(val) => updateField("tipo_inventario_id", val)}
                  >
                    <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm border-gray-300">
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {tiposInventario.map((tipo) => (
                        <SelectItem key={tipo.id} value={String(tipo.id)} className="text-xs sm:text-sm">
                          {tipo.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_SECONDARY }}>
                    <Calendar size={14} />
                    Fecha ingreso
                  </Label>
                  <Input
                    disabled={isView}
                    type="date"
                    value={form.fecha_ingreso}
                    onChange={(e) => updateField("fecha_ingreso", e.target.value)}
                    className="h-8 sm:h-9 text-xs sm:text-sm border-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* Sección 3: Precios */}
            <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
              <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: BRAND_PRIMARY }}>3</span>
                <span>Precios</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_SECONDARY }}>
                    <DollarSign size={14} />
                    Precio compra
                  </Label>
                  <Input
                    disabled={isView}
                    type="number"
                    step="0.01"
                    value={form.precio_compra ?? ""}
                    onChange={(e) => updateField("precio_compra", e.target.value)}
                    placeholder="0.00"
                    className="h-8 sm:h-9 text-xs sm:text-sm border-gray-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_SECONDARY }}>
                    <DollarSign size={14} />
                    Precio venta
                  </Label>
                  <Input
                    disabled={isView}
                    type="number"
                    step="0.01"
                    value={form.precio_venta ?? ""}
                    onChange={(e) => updateField("precio_venta", e.target.value)}
                    placeholder="0.00"
                    className="h-8 sm:h-9 text-xs sm:text-sm border-gray-300"
                  />
                </div>
              </div>
            </div>

            {/* STOCK INFO */}
            {product && (
              <div className="p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
                <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2 mb-3" style={{ color: BRAND_PRIMARY }}>
                  <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ backgroundColor: BRAND_PRIMARY }}>4</span>
                  <span>Inventario</span>
                </h3>

                {/* Stock display */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-2 sm:p-3 rounded-lg text-center cursor-help" style={{ backgroundColor: `${BRAND_PRIMARY}15` }}>
                        <p className="text-xs" style={{ color: BRAND_SECONDARY }}>Total</p>
                        <p className="text-lg sm:text-xl font-bold" style={{ color: BRAND_PRIMARY }}>
                          {product.stock_total ?? 0}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Stock total en inventario
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-2 sm:p-3 rounded-lg text-center cursor-help" style={{ backgroundColor: '#fef3c710' }}>
                        <p className="text-xs" style={{ color: '#92400e' }}>Usado</p>
                        <p className="text-lg sm:text-xl font-bold" style={{ color: '#b45309' }}>
                          {product.stock_usado ?? 0}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Stock utilizado
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="p-2 sm:p-3 rounded-lg text-center cursor-help" style={{ backgroundColor: '#10b98110' }}>
                        <p className="text-xs" style={{ color: '#059669' }}>Disponible</p>
                        <p className="text-lg sm:text-xl font-bold" style={{ color: '#059669' }}>
                          {product.stock_disponible ?? 0}
                        </p>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Stock disponible
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Update stock section */}
                {isEdit && (
                  <div className="space-y-2 pt-3 border-t" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
                    <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                      <CheckCircle size={14} />
                      Actualizar stock total
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        value={stockTotal}
                        onChange={(e) => setStockTotal(e.target.value)}
                        placeholder="Cantidad total"
                        className="flex-1 h-8 sm:h-9 text-xs sm:text-sm border-gray-300"
                        min="0"
                      />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={handleUpdateStock}
                            disabled={updating}
                            className="h-8 sm:h-9 text-xs sm:text-sm px-3 text-white whitespace-nowrap"
                            style={{ backgroundColor: BRAND_PRIMARY }}
                          >
                            {updating ? "Actualizando..." : "Actualizar"}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Guardar nuevo stock total
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* FOOTER */}
          <DialogFooter className="border-t flex-shrink-0 pt-3 sm:pt-4 px-3 sm:px-6 pb-3 sm:pb-4 flex flex-col-reverse sm:flex-row gap-2 justify-end" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-auto"
            >
              {isView ? "Cerrar" : "Cancelar"}
            </Button>

            {!isView && (
              <Button
                onClick={handleSave}
                className="h-8 sm:h-9 text-xs sm:text-sm text-white w-full sm:w-auto"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                Guardar
              </Button>
            )}
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}