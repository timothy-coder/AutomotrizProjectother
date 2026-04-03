"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { AlertCircle, MapPin, Wrench, Store, Package, Info } from "lucide-react";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

export default function StockLocationDialog({
  open,
  onOpenChange,
  product,
  row,
  onSaved
}) {

  const isEdit = !!row;

  const [centros, setCentros] = useState([]);
  const [talleres, setTalleres] = useState([]);
  const [mostradores, setMostradores] = useState([]);

  const [centroId, setCentroId] = useState("");
  const [tallerId, setTallerId] = useState("");
  const [mostradorId, setMostradorId] = useState("");
  const [stock, setStock] = useState("");
  const [saving, setSaving] = useState(false);
  
  const [stockAsignado, setStockAsignado] = useState(0);
  const [stockDisponible, setStockDisponible] = useState(0);

  // Calcular stock disponible
  useEffect(() => {
    if (!open || !product?.id) return;

    async function calcularDisponible() {
      try {
        const r = await fetch(`/api/stock_parcial/producto/${product.id}`);
        const ubicaciones = await r.json();
        
        const totalAsignado = ubicaciones.reduce((sum, u) => {
          return sum + Number(u.stock || 0);
        }, 0);

        setStockAsignado(totalAsignado);
        const disponible = (product.stock_total || 0) - totalAsignado;
        
        if (isEdit && row) {
          setStockDisponible(disponible + Number(row.stock || 0));
        } else {
          setStockDisponible(disponible);
        }
      } catch (error) {
        console.error("Error calculando stock disponible:", error);
      }
    }

    calcularDisponible();
  }, [open, product?.id, isEdit, row?.id, row?.stock]);

  // cargar centros
  useEffect(() => {
    if (!open) return;

    fetch("/api/centros")
      .then(r => r.json())
      .then(setCentros);
  }, [open]);

  // cargar dependientes
  useEffect(() => {
    if (!centroId) return;

    fetch(`/api/talleres/bycentro?centro_id=${centroId}`)
      .then(r => r.json())
      .then(setTalleres);

    fetch(`/api/mostradores/bycentro?centro_id=${centroId}`)
      .then(r => r.json())
      .then(setMostradores);

  }, [centroId]);

  // cargar data edición
  useEffect(() => {
    if (!open) return;

    if (row) {
      setCentroId(String(row.centro_id || ""));
      setTallerId(String(row.taller_id || ""));
      setMostradorId(String(row.mostrador_id || ""));
      setStock(String(row.stock || ""));
    } else {
      setCentroId("");
      setTallerId("");
      setMostradorId("");
      setStock("");
    }

  }, [row, open]);

  async function save() {

    try {
      setSaving(true);

      // Validaciones
      if (!centroId) {
        return toast.warning("Centro es obligatorio");
      }

      if (!stock) {
        return toast.warning("Stock requerido");
      }

      const stockNumero = Number(stock);
      
      if (stockNumero > stockDisponible) {
        return toast.error(`Solo hay ${stockDisponible} unidades disponibles para asignar`);
      }

      if (stockNumero <= 0) {
        return toast.warning("El stock debe ser mayor a 0");
      }

      if (tallerId && mostradorId) {
        return toast.warning("Solo puede seleccionar Taller O Mostrador, no ambos");
      }

      if (!tallerId && !mostradorId) {
        return toast.warning("Debe seleccionar un Taller o un Mostrador");
      }

      if (isEdit) {

        await fetch(`/api/stock_parcial/${row.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            centro_id: centroId ? Number(centroId) : null,
            taller_id: tallerId ? Number(tallerId) : null,
            mostrador_id: mostradorId ? Number(mostradorId) : null,
            stock: Number(stock)
          })
        });

      } else {

        await fetch("/api/stock_parcial", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            producto_id: product.id,
            centro_id: centroId ? Number(centroId) : null,
            taller_id: tallerId ? Number(tallerId) : null,
            mostrador_id: mostradorId ? Number(mostradorId) : null,
            stock: Number(stock)
          })
        });

      }

      toast.success("Guardado");
      onSaved?.();
      onOpenChange(false);

    } catch {
      toast.error("Error guardando");
    } finally {
      setSaving(false);
    }
  }

  const totalProducto = product?.stock_total || 0;
  const sinAsignar = totalProducto - stockAsignado;

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden flex flex-col">

          {/* HEADER */}
          <DialogHeader className="pb-3 sm:pb-4 border-b flex-shrink-0" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${BRAND_PRIMARY}15` }}>
                <MapPin size={20} style={{ color: BRAND_PRIMARY }} />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base sm:text-xl" style={{ color: BRAND_PRIMARY }}>
                  {isEdit ? "Editar ubicación" : "Nueva ubicación"}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          {/* CONTENT */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-6 py-3 sm:py-4 space-y-4 sm:space-y-5">

            {/* Sección 1: Ubicación */}
            <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
              <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: BRAND_PRIMARY }}>1</span>
                <span>Ubicación</span>
              </h3>

              {/* Centro */}
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                  <MapPin size={14} />
                  Centro
                  <span className="text-red-500">*</span>
                </Label>
                <Select value={centroId} onValueChange={setCentroId}>
                  <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm border-gray-300">
                    <SelectValue placeholder="Seleccione centro" />
                  </SelectTrigger>
                  <SelectContent>
                    {centros.map(c => (
                      <SelectItem key={c.id} value={String(c.id)} className="text-xs sm:text-sm">
                        {c.nombre}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Taller y Mostrador en grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {/* Taller */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_SECONDARY }}>
                    <Wrench size={14} />
                    Taller
                  </Label>
                  <Select 
                    value={tallerId} 
                    onValueChange={setTallerId}
                    disabled={!centroId}
                  >
                    <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm border-gray-300">
                      <SelectValue placeholder="Seleccione taller" />
                    </SelectTrigger>
                    <SelectContent>
                      {talleres.map(t => (
                        <SelectItem key={t.id} value={String(t.id)} className="text-xs sm:text-sm">
                          {t.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs" style={{ color: BRAND_SECONDARY }}>
                    {tallerId && "✓ Seleccionado"}
                  </p>
                </div>

                {/* Mostrador */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_SECONDARY }}>
                    <Store size={14} />
                    Mostrador
                  </Label>
                  <Select 
                    value={mostradorId} 
                    onValueChange={setMostradorId}
                    disabled={!centroId}
                  >
                    <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm border-gray-300">
                      <SelectValue placeholder="Seleccione mostrador" />
                    </SelectTrigger>
                    <SelectContent>
                      {mostradores.map(m => (
                        <SelectItem key={m.id} value={String(m.id)} className="text-xs sm:text-sm">
                          {m.nombre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs" style={{ color: BRAND_SECONDARY }}>
                    {mostradorId && "✓ Seleccionado"}
                  </p>
                </div>
              </div>

              {/* Info: Solo uno o el otro */}
              <div className="p-2 sm:p-3 rounded-lg border-2 flex gap-2 text-xs" style={{ backgroundColor: '#fef3c710', borderColor: '#fef3c730', color: '#92400e' }}>
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
                <p>Selecciona solo un Taller O un Mostrador, no ambos</p>
              </div>
            </div>

            {/* Sección 2: Stock */}
            <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
              <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: BRAND_PRIMARY }}>2</span>
                <span>Stock</span>
              </h3>

              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                  <Package size={14} />
                  Cantidad a asignar
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="number"
                  value={stock}
                  onChange={e => setStock(e.target.value)}
                  max={stockDisponible}
                  min="0"
                  placeholder="0"
                  className="h-8 sm:h-9 text-xs sm:text-sm border-gray-300"
                />
              </div>
            </div>

            {/* Sección 3: Información de Stock */}
            <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
              <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                <Info size={16} />
                <span>Información de Stock</span>
              </h3>

              {/* Grid de estadísticas */}
              <div className="grid grid-cols-2 sm:grid-cols-2 gap-2 sm:gap-3">
                {/* Total del producto */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-2 sm:p-3 rounded-lg text-center cursor-help" style={{ backgroundColor: `${BRAND_PRIMARY}15` }}>
                      <p className="text-xs" style={{ color: BRAND_SECONDARY }}>Total Producto</p>
                      <p className="text-lg sm:text-xl font-bold" style={{ color: BRAND_PRIMARY }}>
                        {totalProducto}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Stock total disponible en el producto
                  </TooltipContent>
                </Tooltip>

                {/* Asignado */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-2 sm:p-3 rounded-lg text-center cursor-help" style={{ backgroundColor: '#fef3c710' }}>
                      <p className="text-xs" style={{ color: '#92400e' }}>Asignado</p>
                      <p className="text-lg sm:text-xl font-bold" style={{ color: '#b45309' }}>
                        {stockAsignado}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Total asignado a todas las ubicaciones
                  </TooltipContent>
                </Tooltip>

                {/* Sin asignar */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-2 sm:p-3 rounded-lg text-center cursor-help" style={{ backgroundColor: '#10b98110' }}>
                      <p className="text-xs" style={{ color: '#059669' }}>Sin Asignar</p>
                      <p className="text-lg sm:text-xl font-bold" style={{ color: '#059669' }}>
                        {sinAsignar}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Stock disponible para asignar
                  </TooltipContent>
                </Tooltip>

                {/* Máximo para esta ubicación (edit) o Disponible (create) */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="p-2 sm:p-3 rounded-lg text-center cursor-help" style={{ backgroundColor: '#dbeafe' }}>
                      <p className="text-xs text-blue-900">
                        {isEdit ? "Máx. Esta Ubicación" : "Disponible"}
                      </p>
                      <p className="text-lg sm:text-xl font-bold text-blue-600">
                        {stockDisponible}
                      </p>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {isEdit 
                      ? `Máximo que puedes asignar (incluye ${row?.stock || 0} actual)`
                      : "Stock disponible para asignar en esta ubicación"
                    }
                  </TooltipContent>
                </Tooltip>
              </div>

              {/* Nota de edición */}
              {isEdit && (
                <div className="p-2 sm:p-3 rounded-lg border-2 text-xs" style={{ backgroundColor: '#dbeafe', borderColor: '#bfdbfe', color: '#1e40af' }}>
                  <p className="font-medium">
                    ℹ️ Actual: <strong>{row?.stock || 0}</strong> unidades | 
                    Cambios permitidos hasta: <strong>{stockDisponible}</strong> unidades
                  </p>
                </div>
              )}
            </div>

          </div>

          {/* FOOTER */}
          <DialogFooter className="border-t flex-shrink-0 pt-3 sm:pt-4 px-3 sm:px-6 pb-3 sm:pb-4 flex flex-col-reverse sm:flex-row gap-2 justify-end" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
              className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-auto"
            >
              Cancelar
            </Button>

            <Button
              onClick={save}
              disabled={saving}
              className="h-8 sm:h-9 text-xs sm:text-sm text-white w-full sm:w-auto"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}