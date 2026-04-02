"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, Package, Tag, Calendar, CheckCircle } from "lucide-react";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";
const NONE_VALUE = "__none__";

function normalizeAniosToText(anios) {
  if (anios == null) return "";
  if (typeof anios === "string") {
    try { return normalizeAniosToText(JSON.parse(anios)); } catch { return ""; }
  }
  if (typeof anios === "number") return String(anios);
  if (Array.isArray(anios)) return anios.join(",");
  if (typeof anios === "object") return JSON.stringify(anios);
  return "";
}

function parseAniosInput(value) {
  const v = (value || "").trim();
  if (!v) return null;

  const parts = v.split(",").map((x) => x.trim()).filter(Boolean);
  const years = parts.map((x) => Number(x)).filter((n) => Number.isFinite(n));

  if (years.length === 0) return null;
  if (years.length === 1) return years[0];
  return years;
}

export default function ModeloDialog({
  open,
  onOpenChange,
  mode,
  modelo,
  marcas = [],
  clases = [],
  defaultMarcaId,
  defaultClaseId,
  onSave,
}) {
  const isEdit = mode === "edit";

  const marcasSorted = useMemo(() => {
    return [...(marcas || [])].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }, [marcas]);

  const clasesSorted = useMemo(() => {
    return [...(clases || [])].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }, [clases]);

  const [form, setForm] = useState({
    name: "",
    marca_id: defaultMarcaId || "",
    clase_id: defaultClaseId ? String(defaultClaseId) : NONE_VALUE,
    anios_text: "",
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (modelo) {
      setForm({
        id: modelo.id,
        name: modelo.name || "",
        marca_id: Number(modelo.marca_id) || defaultMarcaId || "",
        clase_id:
          modelo.clase_id != null
            ? String(modelo.clase_id)
            : (defaultClaseId ? String(defaultClaseId) : NONE_VALUE),
        anios_text: normalizeAniosToText(modelo.anios),
      });
    } else {
      setForm({
        name: "",
        marca_id: defaultMarcaId || "",
        clase_id: defaultClaseId ? String(defaultClaseId) : NONE_VALUE,
        anios_text: "",
      });
    }
    setErrors({});
  }, [modelo, defaultMarcaId, defaultClaseId, open]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }

  function validateForm() {
    const newErrors = {};

    if (!form.marca_id) {
      newErrors.marca_id = "Selecciona una marca";
    }
    if (!form.name || String(form.name).trim() === "") {
      newErrors.name = "El nombre del modelo es requerido";
    }

    if (form.anios_text.trim()) {
      const parsed = parseAniosInput(form.anios_text);
      if (parsed === null) {
        newErrors.anios_text = "Formato de años inválido";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!validateForm()) return;

    const claseValue = form.clase_id === NONE_VALUE ? null : Number(form.clase_id);

    onSave?.({
      id: form.id,
      name: (form.name || "").trim(),
      marca_id: Number(form.marca_id),
      clase_id: claseValue,
      anios: parseAniosInput(form.anios_text),
    });
  }

  const canSave = !!form.marca_id && String(form.name || "").trim() !== "";
  const getMarcaName = () => marcasSorted.find(m => String(m.id) === String(form.marca_id))?.name;
  const getClaseName = () => form.clase_id !== NONE_VALUE ? clasesSorted.find(c => String(c.id) === String(form.clase_id))?.name : null;

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden flex flex-col">
          {/* HEADER */}
          <DialogHeader className="pb-3 sm:pb-4 border-b flex-shrink-0" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${BRAND_PRIMARY}15` }}>
                <Package size={22} style={{ color: BRAND_PRIMARY }} />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base sm:text-xl" style={{ color: BRAND_PRIMARY }}>
                  {isEdit ? "Editar modelo" : "Nuevo modelo"}
                </DialogTitle>
                <DialogDescription style={{ color: BRAND_SECONDARY }} className="text-xs sm:text-sm mt-0.5">
                  Configure los detalles del modelo
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="space-y-3 sm:space-y-4 py-3 sm:py-4 px-3 sm:px-6 overflow-y-auto flex-1">

              {/* Sección 1: Información Básica */}
              <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
                <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                  <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: BRAND_PRIMARY }}>1</span>
                  <span>Información Básica</span>
                </h3>

                {/* Marca */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                    Marca
                    <span className="text-red-500">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle size={14} className="cursor-help opacity-60 flex-shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Selecciona la marca del vehículo
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Select
                    value={String(form.marca_id || "")}
                    onValueChange={(v) => update("marca_id", v)}
                  >
                    <SelectTrigger className={`h-8 sm:h-9 text-xs sm:text-sm border-gray-300 ${errors.marca_id ? "border-red-500" : ""}`}>
                      <SelectValue placeholder="Seleccionar marca" />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      {marcasSorted.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)} className="text-xs sm:text-sm">
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.marca_id && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.marca_id}
                    </p>
                  )}
                </div>

                {/* Nombre del modelo */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                    Nombre del modelo
                    <span className="text-red-500">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle size={14} className="cursor-help opacity-60 flex-shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Ej: Civic, Accord, CR-V
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    value={form.name || ""}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Ej: Nissan Versa"
                    className={`h-8 sm:h-9 text-xs sm:text-sm border-gray-300 ${errors.name ? "border-red-500" : ""}`}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Sección 2: Clasificación */}
              <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
                <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                  <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: BRAND_PRIMARY }}>2</span>
                  <span>Clasificación</span>
                </h3>

                {/* Clase */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_SECONDARY }}>
                    <Tag size={14} className="flex-shrink-0" />
                    Clase
                    <span className="text-gray-500 text-xs font-normal">(Opcional)</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle size={14} className="cursor-help opacity-60 flex-shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        Categoría del vehículo (Sedán, SUV, Camioneta, etc.)
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Select
                    value={String(form.clase_id)}
                    onValueChange={(v) => update("clase_id", v)}
                  >
                    <SelectTrigger className="h-8 sm:h-9 text-xs sm:text-sm border-gray-300">
                      <SelectValue placeholder="Seleccionar clase" />
                    </SelectTrigger>
                    <SelectContent className="max-h-48">
                      <SelectItem value={NONE_VALUE} className="text-xs sm:text-sm">
                        <span style={{ color: BRAND_SECONDARY }}>Sin clase</span>
                      </SelectItem>
                      {clasesSorted.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)} className="text-xs sm:text-sm">
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sección 3: Años */}
              <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
                <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                  <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: BRAND_PRIMARY }}>3</span>
                  <span>Disponibilidad</span>
                </h3>

                {/* Años */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_SECONDARY }}>
                    <Calendar size={14} className="flex-shrink-0" />
                    Años
                    <span className="text-gray-500 text-xs font-normal">(Opcional)</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle size={14} className="cursor-help opacity-60 flex-shrink-0" />
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs max-w-xs">
                        Años de fabricación disponibles separados por coma
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    value={form.anios_text || ""}
                    onChange={(e) => update("anios_text", e.target.value)}
                    placeholder="Ej: 2020, 2021, 2022, 2023"
                    className={`h-8 sm:h-9 text-xs sm:text-sm border-gray-300 ${errors.anios_text ? "border-red-500" : ""}`}
                  />
                  {errors.anios_text && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.anios_text}
                    </p>
                  )}
                  <p className="text-xs" style={{ color: BRAND_SECONDARY }}>
                    💡 Separados por coma (ej: 2020, 2021, 2022)
                  </p>
                </div>
              </div>

              {/* Resumen */}
              {form.marca_id && form.name && (
                <div className="p-2.5 sm:p-3 rounded-lg border-2 transition-all" style={{ backgroundColor: '#10b98110', borderColor: '#10b98140' }}>
                  <p className="text-xs sm:text-sm" style={{ color: '#059669' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle size={16} className="flex-shrink-0" />
                      <span className="font-semibold">Resumen:</span>
                    </div>
                    <span className="block text-xs opacity-90 ml-6 space-y-0.5">
                      <div><strong>{getMarcaName()}</strong> - <strong>{form.name}</strong></div>
                      {getClaseName() && <div>📁 Clase: <strong>{getClaseName()}</strong></div>}
                      {form.anios_text && <div>📅 Años: <strong>{form.anios_text}</strong></div>}
                    </span>
                  </p>
                </div>
              )}

            </div>

            {/* FOOTER */}
            <DialogFooter className="border-t flex-shrink-0 pt-3 sm:pt-4 px-3 sm:px-6 pb-3 sm:pb-4 flex flex-col-reverse sm:flex-row gap-2 justify-end" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-auto"
              >
                Cancelar
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    type="submit" 
                    disabled={!canSave}
                    className="h-8 sm:h-9 text-xs sm:text-sm text-white disabled:opacity-50 transition-all w-full sm:w-auto"
                    style={{ backgroundColor: canSave ? BRAND_PRIMARY : BRAND_SECONDARY }}
                  >
                    {isEdit ? "Actualizar modelo" : "Crear modelo"}
                  </Button>
                </TooltipTrigger>
                {!canSave && (
                  <TooltipContent side="top" className="text-xs">
                    Completa marca y nombre del modelo
                  </TooltipContent>
                )}
              </Tooltip>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}