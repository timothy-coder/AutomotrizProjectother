"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, Plus, Trash2, Calendar, CheckCircle } from "lucide-react";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

const EMPTY_FORM = {
  id: null,
  modelo_id: "",
  marca_id: "",
  kilometraje: "",
  meses: "",
  años: [],
};

const EMPTY_RANGE = {
  start: "",
  end: "",
  opStart: "<=",
  opEnd: "<=",
};

function parseAnios(value) {
  if (!value) return [];

  if (Array.isArray(value)) {
    return value.map(String).filter(Boolean);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map(String).filter(Boolean);
      }
    } catch {
      // sigue normal
    }

    return value
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
  }

  return [];
}

function rangesFromAnios(anios) {
  const arr = parseAnios(anios);

  if (!arr.length) return [{ ...EMPTY_RANGE }];

  return arr.map((item) => {
    const [start = "", end = ""] = String(item).split("-");
    return {
      start,
      end,
      opStart: "<=",
      opEnd: "<=",
    };
  });
}

const AlgoritmoVisitaDialog = ({
  open,
  onOpenChange,
  mode,
  record,
  marcas = [],
  onSave,
}) => {
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [modelos, setModelos] = useState([]);
  const [isAll, setIsAll] = useState(false);
  const [yearRanges, setYearRanges] = useState([{ ...EMPTY_RANGE }]);
  const [loadingModelos, setLoadingModelos] = useState(false);
  const [errors, setErrors] = useState({});

  const fetchModelos = async (marcaId) => {
    if (!marcaId) {
      setModelos([]);
      return;
    }

    try {
      setLoadingModelos(true);
      const response = await fetch(`/api/modelos?marca_id=${marcaId}`, {
        cache: "no-store",
      });
      const data = await response.json();
      setModelos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error cargando modelos", error);
      setModelos([]);
    } finally {
      setLoadingModelos(false);
    }
  };

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && record) {
      const parsedAnios = parseAnios(record.años);
      const appliesAll =
        parsedAnios.length === 1 && String(parsedAnios[0]) === "0001-9999";

      const normalized = {
        id: record.id ?? null,
        modelo_id: record.modelo_id ? String(record.modelo_id) : "",
        marca_id: record.marca_id ? String(record.marca_id) : "",
        kilometraje:
          record.kilometraje !== null && record.kilometraje !== undefined
            ? String(record.kilometraje)
            : "",
        meses:
          record.meses !== null && record.meses !== undefined
            ? String(record.meses)
            : "",
        años: parsedAnios,
      };

      setFormData(normalized);
      setIsAll(appliesAll);
      setYearRanges(
        appliesAll ? [{ ...EMPTY_RANGE }] : rangesFromAnios(parsedAnios)
      );

      if (record.marca_id) {
        fetchModelos(record.marca_id);
      } else {
        setModelos([]);
      }
    } else {
      setFormData(EMPTY_FORM);
      setModelos([]);
      setIsAll(false);
      setYearRanges([{ ...EMPTY_RANGE }]);
    }
    setErrors({});
  }, [open, mode, record]);

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
    if (errors[e.target.name]) {
      setErrors((prev) => ({ ...prev, [e.target.name]: "" }));
    }
  };

  const handleSelectChange = (name, value) => {
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "marca_id" ? { modelo_id: "" } : {}),
    }));

    if (name === "marca_id") {
      fetchModelos(value);
    }
  };

  const handleSwitchChange = (checked) => {
    setIsAll(!!checked);

    if (!checked && yearRanges.length === 0) {
      setYearRanges([{ ...EMPTY_RANGE }]);
    }
  };

  const handleAddColumn = () => {
    setYearRanges((prev) => [...prev, { ...EMPTY_RANGE }]);
  };

  const handleRemoveColumn = (index) => {
    setYearRanges((prev) => {
      if (prev.length === 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleYearChange = (index, field, value) => {
    setYearRanges((prev) =>
      prev.map((range, i) =>
        i === index ? { ...range, [field]: value } : range
      )
    );
  };

  const handleOperatorStartChange = (index, value) => {
    setYearRanges((prev) =>
      prev.map((range, i) =>
        i === index ? { ...range, opStart: value } : range
      )
    );
  };

  const handleOperatorEndChange = (index, value) => {
    setYearRanges((prev) =>
      prev.map((range, i) =>
        i === index ? { ...range, opEnd: value } : range
      )
    );
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.marca_id) newErrors.marca_id = "Selecciona una marca";
    if (!formData.modelo_id) newErrors.modelo_id = "Selecciona un modelo";
    if (!formData.kilometraje) newErrors.kilometraje = "Ingresa el kilometraje";
    if (!formData.meses) newErrors.meses = "Ingresa los meses";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    let ranges = [];

    if (isAll) {
      ranges = ["0001-9999"];
    } else {
      ranges = yearRanges.map((range) => {
        const validStart = range.start || "0001";
        const validEnd = range.end || "9999";
        return `${validStart}-${validEnd}`;
      });
    }

    onSave({
      id: formData.id,
      modelo_id: formData.modelo_id,
      marca_id: formData.marca_id,
      kilometraje: formData.kilometraje,
      meses: formData.meses,
      años: ranges,
    });

    onOpenChange(false);
  };

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl w-full max-h-[90vh] bg-white rounded-lg overflow-hidden flex flex-col">
          {/* HEADER */}
          <DialogHeader className="pb-3 sm:pb-4 border-b flex-shrink-0" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="p-1.5 sm:p-2 rounded-lg flex-shrink-0" style={{ backgroundColor: `${BRAND_PRIMARY}15` }}>
                <Calendar size={22} style={{ color: BRAND_PRIMARY }} />
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="text-base sm:text-xl" style={{ color: BRAND_PRIMARY }}>
                  {mode === "edit" ? "Editar Algoritmo de Visita" : "Nuevo Algoritmo de Visita"}
                </DialogTitle>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="space-y-3 sm:space-y-4 py-3 sm:py-4 px-3 sm:px-6 overflow-y-auto flex-1">

              {/* Sección 1: Vehículo */}
              <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
                <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                  <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: BRAND_PRIMARY }}>1</span>
                  <span>Vehículo</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
                      value={formData.marca_id}
                      onValueChange={(value) => handleSelectChange("marca_id", value)}
                    >
                      <SelectTrigger className={`h-8 sm:h-9 text-xs sm:text-sm border-gray-300 ${errors.marca_id ? "border-red-500" : ""}`}>
                        <SelectValue placeholder="Seleccionar marca" />
                      </SelectTrigger>
                      <SelectContent className="max-h-48">
                        {marcas.map((marca) => (
                          <SelectItem key={marca.id} value={String(marca.id)} className="text-xs sm:text-sm">
                            {marca.name}
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

                  {/* Modelo */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                      Modelo
                      <span className="text-red-500">*</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle size={14} className="cursor-help opacity-60 flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Selecciona el modelo del vehículo
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Select
                      value={formData.modelo_id}
                      onValueChange={(value) =>
                        handleSelectChange("modelo_id", value)
                      }
                      disabled={!formData.marca_id || loadingModelos}
                    >
                      <SelectTrigger className={`h-8 sm:h-9 text-xs sm:text-sm border-gray-300 ${errors.modelo_id ? "border-red-500" : ""}`}>
                        <SelectValue
                          placeholder={
                            loadingModelos
                              ? "Cargando..."
                              : "Seleccionar modelo"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-48">
                        {modelos.map((modelo) => (
                          <SelectItem key={modelo.id} value={String(modelo.id)} className="text-xs sm:text-sm">
                            {modelo.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.modelo_id && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.modelo_id}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección 2: Mantenimiento */}
              <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
                <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                  <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: BRAND_PRIMARY }}>2</span>
                  <span>Intervalo de Mantenimiento</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  {/* Kilometraje */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_SECONDARY }}>
                      Kilometraje
                      <span className="text-red-500">*</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle size={14} className="cursor-help opacity-60 flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Cada cuántos km se recomienda mantenimiento
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      type="number"
                      name="kilometraje"
                      value={formData.kilometraje}
                      onChange={handleChange}
                      placeholder="Ej: 10000"
                      min="0"
                      className={`h-8 sm:h-9 text-xs sm:text-sm border-gray-300 ${errors.kilometraje ? "border-red-500" : ""}`}
                    />
                    {errors.kilometraje && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.kilometraje}
                      </p>
                    )}
                  </div>

                  {/* Meses */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-xs sm:text-sm font-medium" style={{ color: BRAND_SECONDARY }}>
                      Meses
                      <span className="text-red-500">*</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle size={14} className="cursor-help opacity-60 flex-shrink-0" />
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs">
                          Cada cuántos meses se recomienda mantenimiento
                        </TooltipContent>
                      </Tooltip>
                    </Label>
                    <Input
                      type="number"
                      name="meses"
                      value={formData.meses}
                      onChange={handleChange}
                      placeholder="Ej: 12"
                      min="0"
                      className={`h-8 sm:h-9 text-xs sm:text-sm border-gray-300 ${errors.meses ? "border-red-500" : ""}`}
                    />
                    {errors.meses && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.meses}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Sección 3: Años */}
              <div className="space-y-3 p-3 sm:p-4 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
                <h3 className="font-semibold text-sm sm:text-base flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                  <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold flex-shrink-0" style={{ backgroundColor: BRAND_PRIMARY }}>3</span>
                  <span>Rango de Años</span>
                </h3>

                <div className="space-y-3">
                  {/* Switch - Aplica todos */}
                  <div className="flex items-center gap-2 sm:gap-3 p-2.5 sm:p-3 rounded-lg border-2 transition-all" style={{ borderColor: `${BRAND_PRIMARY}30`, backgroundColor: `${BRAND_PRIMARY}05` }}>
                    <Switch 
                      checked={isAll} 
                      onCheckedChange={handleSwitchChange}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-xs sm:text-sm" style={{ color: BRAND_PRIMARY }}>
                        Aplica a todos los años
                      </p>
                      <p className="text-xs" style={{ color: BRAND_SECONDARY }}>
                        Si está activado, ignora los rangos específicos
                      </p>
                    </div>
                  </div>

                  {/* Rangos específicos */}
                  {!isAll && (
                    <div className="space-y-3">
                      <p className="text-xs sm:text-sm" style={{ color: BRAND_SECONDARY }}>
                        Define los rangos de años para aplicar este algoritmo:
                      </p>

                      {yearRanges.map((range, index) => (
                        <div 
                          key={index} 
                          className="p-2.5 sm:p-3 rounded-lg border-2 space-y-2 transition-all"
                          style={{ borderColor: `${BRAND_PRIMARY}40`, backgroundColor: `${BRAND_PRIMARY}05` }}
                        >
                          <div className="flex items-center gap-2 text-xs font-semibold mb-2" style={{ color: BRAND_PRIMARY }}>
                            <span className="w-5 h-5 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: BRAND_PRIMARY }}>
                              {index + 1}
                            </span>
                            Rango {index + 1}
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5 sm:gap-2">
                            {/* Desde */}
                            <div className="space-y-1">
                              <label className="text-xs" style={{ color: BRAND_SECONDARY }}>Desde</label>
                              <Input
                                type="number"
                                value={range.start}
                                onChange={(e) =>
                                  handleYearChange(index, "start", e.target.value)
                                }
                                placeholder="0001"
                                min="0001"
                                max="9999"
                                className="h-7 sm:h-8 text-xs border-gray-300"
                              />
                            </div>

                            {/* Operador inicio */}
                            <div className="space-y-1">
                              <label className="text-xs" style={{ color: BRAND_SECONDARY }}>Op</label>
                              <Select
                                value={range.opStart}
                                onValueChange={(value) =>
                                  handleOperatorStartChange(index, value)
                                }
                              >
                                <SelectTrigger className="h-7 sm:h-8 text-xs border-gray-300">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="<=" className="text-xs">≤</SelectItem>
                                  <SelectItem value="<" className="text-xs">&lt;</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Año */}
                            <div className="space-y-1">
                              <label className="text-xs" style={{ color: BRAND_SECONDARY }}>Año</label>
                              <div className="h-7 sm:h-8 flex items-center justify-center bg-gray-100 rounded border border-gray-300 text-xs font-medium" style={{ color: BRAND_SECONDARY }}>
                                Año
                              </div>
                            </div>

                            {/* Operador fin */}
                            <div className="space-y-1">
                              <label className="text-xs" style={{ color: BRAND_SECONDARY }}>Op</label>
                              <Select
                                value={range.opEnd}
                                onValueChange={(value) =>
                                  handleOperatorEndChange(index, value)
                                }
                              >
                                <SelectTrigger className="h-7 sm:h-8 text-xs border-gray-300">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="<=" className="text-xs">≤</SelectItem>
                                  <SelectItem value=">" className="text-xs">&gt;</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Hasta */}
                            <div className="space-y-1">
                              <label className="text-xs" style={{ color: BRAND_SECONDARY }}>Hasta</label>
                              <Input
                                type="number"
                                value={range.end}
                                onChange={(e) =>
                                  handleYearChange(index, "end", e.target.value)
                                }
                                placeholder="9999"
                                min="0001"
                                max="9999"
                                className="h-7 sm:h-8 text-xs border-gray-300"
                              />
                            </div>
                          </div>

                          {/* Botones acciones */}
                          <div className="flex gap-1 sm:gap-2 justify-end pt-1 sm:pt-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="h-7 sm:h-8 px-2 sm:px-3 hover:bg-red-100 hover:text-red-700"
                                  onClick={() => handleRemoveColumn(index)}
                                  disabled={yearRanges.length === 1}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">Eliminar rango</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="h-7 sm:h-8 px-2 sm:px-3 text-white"
                                  style={{ backgroundColor: BRAND_PRIMARY }}
                                  onClick={handleAddColumn}
                                >
                                  <Plus size={14} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">Agregar rango</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Resumen */}
              {formData.marca_id && formData.modelo_id && (
                <div className="p-2.5 sm:p-3 rounded-lg border-2 transition-all" style={{ backgroundColor: '#10b98110', borderColor: '#10b98140' }}>
                  <p className="text-xs sm:text-sm" style={{ color: '#059669' }}>
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle size={16} className="flex-shrink-0" />
                      <span className="font-semibold">Resumen:</span>
                    </div>
                    <span className="block text-xs opacity-90 ml-6">
                      {marcas.find(m => String(m.id) === formData.marca_id)?.name} - {modelos.find(m => String(m.id) === formData.modelo_id)?.name}<br/>
                      📋 Intervalo: <strong>{formData.kilometraje} km / {formData.meses} meses</strong><br/>
                      {isAll ? "📅 Aplica a todos los años" : `📅 ${yearRanges.length} rango(s) definido(s)`}
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
              <Button 
                type="submit"
                className="h-8 sm:h-9 text-xs sm:text-sm text-white w-full sm:w-auto"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                Guardar Algoritmo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
};

export default AlgoritmoVisitaDialog;