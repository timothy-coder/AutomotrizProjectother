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
import { AlertCircle, Package, Tag, Calendar } from "lucide-react";

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
    // Limpiar error del campo
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

    // Validar años si se proporcionan
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

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center gap-2">
              <Package size={24} className="text-blue-600" />
              <div>
                <DialogTitle className="text-xl">
                  {isEdit ? "Editar modelo" : "Nuevo modelo"}
                </DialogTitle>
                <DialogDescription>
                  Configure los detalles del modelo de vehículo
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-5 py-4">

              {/* Sección 1: Información Básica */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                  Información Básica
                </h3>

                {/* Marca */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Marca
                    <span className="text-red-500">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle size={14} className="text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Selecciona la marca del vehículo
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Select
                    value={String(form.marca_id || "")}
                    onValueChange={(v) => update("marca_id", v)}
                  >
                    <SelectTrigger className={errors.marca_id ? "border-red-500" : ""}>
                      <SelectValue placeholder="Seleccionar marca" />
                    </SelectTrigger>
                    <SelectContent>
                      {marcasSorted.map((m) => (
                        <SelectItem key={m.id} value={String(m.id)}>
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
                  <Label className="flex items-center gap-1">
                    Nombre del modelo
                    <span className="text-red-500">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle size={14} className="text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Ej: Civic, Accord, CR-V
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    value={form.name || ""}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Ej: Nissan Versa"
                    className={`h-9 ${errors.name ? "border-red-500" : ""}`}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Sección 2: Clasificación */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                  Clasificación
                </h3>

                {/* Clase */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Clase
                    <span className="text-gray-500 text-xs">(Opcional)</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle size={14} className="text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Categoría del vehículo (Sedán, SUV, Camioneta, etc.)
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Select
                    value={String(form.clase_id)}
                    onValueChange={(v) => update("clase_id", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar clase" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>
                        <span className="text-gray-600">Sin clase</span>
                      </SelectItem>
                      {clasesSorted.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Sección 3: Años */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                  Disponibilidad
                </h3>

                {/* Años */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Años
                    <span className="text-gray-500 text-xs">(Opcional)</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle size={14} className="text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Años de fabricación disponibles separados por coma
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    value={form.anios_text || ""}
                    onChange={(e) => update("anios_text", e.target.value)}
                    placeholder="Ej: 2020, 2021, 2022, 2023"
                    className={`h-9 ${errors.anios_text ? "border-red-500" : ""}`}
                  />
                  {errors.anios_text && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.anios_text}
                    </p>
                  )}
                  <p className="text-xs text-gray-600 flex items-center gap-1">
                    <Calendar size={12} /> Separados por coma (ej: 2020, 2021, 2022)
                  </p>
                </div>
              </div>

              {/* Resumen */}
              {form.marca_id && form.name && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm">
                    <span className="font-semibold text-green-900">Resumen:</span>
                    <br />
                    <span className="text-green-800">
                      {marcasSorted.find(m => String(m.id) === String(form.marca_id))?.name} - {form.name}
                      {form.clase_id !== NONE_VALUE && ` (${clasesSorted.find(c => String(c.id) === String(form.clase_id))?.name})`}
                      {form.anios_text && ` - Años: ${form.anios_text}`}
                    </span>
                  </p>
                </div>
              )}

            </div>

            <DialogFooter className="border-t pt-4 flex gap-2 justify-end">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    type="submit" 
                    disabled={!canSave}
                    className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                  >
                    {isEdit ? "Actualizar modelo" : "Crear modelo"}
                  </Button>
                </TooltipTrigger>
                {!canSave && (
                  <TooltipContent side="top">
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