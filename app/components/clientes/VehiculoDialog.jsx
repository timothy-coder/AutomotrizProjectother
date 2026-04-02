"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { toast } from "sonner";
import { Car, AlertCircle } from "lucide-react";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

export default function VehiculoDialog({
  open,
  mode,
  vehiculo,
  onSave,
  onOpenChange
}) {

  const isEdit = mode === "edit";

  const [form, setForm] = useState({
    placas: "",
    vin: "",
    marca_id: "",
    modelo_id: "",
    anio: "",
    color: "",
    kilometraje: "",
    fecha_ultima_visita: ""
  });

  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [loadingMarcas, setLoadingMarcas] = useState(false);
  const [loadingModelos, setLoadingModelos] = useState(false);

  // ✅ LOAD MARCAS
  useEffect(() => {
    setLoadingMarcas(true);
    fetch("/api/marcas")
      .then(r => r.json())
      .then(setMarcas)
      .catch(() => {
        toast.error("Error cargando marcas");
        setMarcas([]);
      })
      .finally(() => setLoadingMarcas(false));
  }, []);

  // ✅ LOAD MODELOS
  useEffect(() => {
    if (!form.marca_id) {
      setModelos([]);
      return;
    }

    setLoadingModelos(true);
    fetch(`/api/modelos?marca_id=${form.marca_id}`)
      .then(r => r.json())
      .then(setModelos)
      .catch(() => {
        toast.error("Error cargando modelos");
        setModelos([]);
      })
      .finally(() => setLoadingModelos(false));

  }, [form.marca_id]);

  // ✅ RESET FORM
  useEffect(() => {

    if (!open) return;

    if (vehiculo) {

      setForm({
        placas: vehiculo.placas || "",
        vin: vehiculo.vin || "",
        marca_id: vehiculo.marca_id ? String(vehiculo.marca_id) : "",
        modelo_id: vehiculo.modelo_id ? String(vehiculo.modelo_id) : "",
        anio: vehiculo.anio || "",
        color: vehiculo.color || "",
        kilometraje: vehiculo.kilometraje || "",
        fecha_ultima_visita: vehiculo.fecha_ultima_visita?.slice?.(0, 10) || ""
      });

    } else {

      setForm({
        placas: "",
        vin: "",
        marca_id: "",
        modelo_id: "",
        anio: "",
        color: "",
        kilometraje: "",
        fecha_ultima_visita: ""
      });
    }

  }, [vehiculo, open]);

  // ✅ UPDATE FIELD
  function update(k, v) {
    setForm(p => ({ ...p, [k]: v }));
  }

  // ✅ SAVE
  function handleSave() {

    if (!form.placas && !form.vin) {
      return toast.warning("Ingrese placas o VIN");
    }

    onSave?.({
      placas: form.placas?.trim() || null,
      vin: form.vin?.trim() || null,
      marca_id: form.marca_id ? Number(form.marca_id) : null,
      modelo_id: form.modelo_id ? Number(form.modelo_id) : null,
      anio: form.anio ? Number(form.anio) : null,
      color: form.color?.trim() || null,
      kilometraje: form.kilometraje ? Number(form.kilometraje) : null,
      fecha_ultima_visita: form.fecha_ultima_visita?.trim() || null
    });
  }

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl bg-white rounded-lg">

          {/* HEADER */}
          <DialogHeader className="pb-4 border-b" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${BRAND_PRIMARY}15` }}>
                <Car size={24} style={{ color: BRAND_PRIMARY }} />
              </div>
              <div>
                <DialogTitle className="text-xl" style={{ color: BRAND_PRIMARY }}>
                  {isEdit ? "Editar Vehículo" : "Nuevo Vehículo"}
                </DialogTitle>
                <p className="text-xs mt-1" style={{ color: BRAND_SECONDARY }}>
                  {isEdit ? "Actualiza los datos del vehículo" : "Ingresa los datos del nuevo vehículo"}
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* CONTENT */}
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto pr-2">

            {/* ROW 1: PLACAS Y VIN */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                  Placas
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle size={14} className="cursor-help opacity-60" />
                    </TooltipTrigger>
                    <TooltipContent side="top">Placa del vehículo</TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  placeholder="Ej: ABC-123"
                  value={form.placas}
                  onChange={e => update("placas", e.target.value)}
                  className="h-9 border-gray-300"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-1 text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                  VIN
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle size={14} className="cursor-help opacity-60" />
                    </TooltipTrigger>
                    <TooltipContent side="top">Número de identificación del vehículo</TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  placeholder="Ej: WVWZZZ3CZ9E123456"
                  value={form.vin}
                  onChange={e => update("vin", e.target.value)}
                  className="h-9 border-gray-300"
                />
              </div>
            </div>

            {/* ROW 2: MARCA Y MODELO */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                  Marca
                </Label>
                <Select
                  value={form.marca_id}
                  onValueChange={(v) => {
                    update("marca_id", v);
                    update("modelo_id", "");
                  }}
                  disabled={loadingMarcas}
                >
                  <SelectTrigger className="h-9 border-gray-300">
                    <SelectValue placeholder={loadingMarcas ? "Cargando..." : "Selecciona una marca"} />
                  </SelectTrigger>

                  <SelectContent>
                    {marcas.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        No hay marcas disponibles
                      </SelectItem>
                    ) : (
                      marcas.map(m => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                  Modelo
                </Label>
                <Select
                  value={form.modelo_id}
                  onValueChange={(v) => update("modelo_id", v)}
                  disabled={!form.marca_id || loadingModelos}
                >
                  <SelectTrigger className="h-9 border-gray-300">
                    <SelectValue placeholder={
                      !form.marca_id 
                        ? "Selecciona una marca" 
                        : loadingModelos 
                        ? "Cargando..." 
                        : "Selecciona un modelo"
                    } />
                  </SelectTrigger>

                  <SelectContent>
                    {modelos.length === 0 ? (
                      <SelectItem value="empty" disabled>
                        No hay modelos disponibles
                      </SelectItem>
                    ) : (
                      modelos.map(m => (
                        <SelectItem key={m.id} value={String(m.id)}>
                          {m.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* ROW 3: AÑO Y COLOR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                  Año
                </Label>
                <Input
                  type="number"
                  placeholder="Ej: 2022"
                  value={form.anio}
                  onChange={e => update("anio", e.target.value)}
                  className="h-9 border-gray-300"
                  min={1990}
                  max={new Date().getFullYear() + 1}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                  Color
                </Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Ej: Blanco"
                    value={form.color}
                    onChange={e => update("color", e.target.value)}
                    className="flex-1 h-9 border-gray-300"
                  />
                  <Input
                    type="color"
                    value={form.color || "#ffffff"}
                    onChange={e => {
                      // Si el usuario selecciona un color, intentar obtener el nombre
                      update("color", e.target.value);
                    }}
                    className="h-9 w-12 border-gray-300 cursor-pointer"
                  />
                </div>
              </div>
            </div>

            {/* ROW 4: KILOMETRAJE Y FECHA */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                  Kilometraje
                </Label>
                <Input
                  type="number"
                  placeholder="Ej: 45000"
                  value={form.kilometraje}
                  onChange={e => update("kilometraje", e.target.value)}
                  className="h-9 border-gray-300"
                  min={0}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                  Última visita al taller
                </Label>
                <Input
                  type="date"
                  value={form.fecha_ultima_visita}
                  onChange={e => update("fecha_ultima_visita", e.target.value)}
                  className="h-9 border-gray-300"
                />
              </div>
            </div>

            {/* INFO BOX */}
            <div className="p-3 rounded-lg border-2 mt-4" style={{ backgroundColor: `${BRAND_PRIMARY}10`, borderColor: `${BRAND_PRIMARY}30` }}>
              <p className="text-xs" style={{ color: BRAND_SECONDARY }}>
                <span className="font-medium" style={{ color: BRAND_PRIMARY }}>Nota:</span> Los campos <span className="font-medium">Placas o VIN</span> son obligatorios
              </p>
            </div>

          </div>

          {/* FOOTER */}
          <DialogFooter className="border-t pt-4 mt-4 flex gap-2 justify-end">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-9"
            >
              Cancelar
            </Button>

            <Button 
              onClick={handleSave}
              className="text-white h-9"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              {isEdit ? "Actualizar" : "Crear"} Vehículo
            </Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}