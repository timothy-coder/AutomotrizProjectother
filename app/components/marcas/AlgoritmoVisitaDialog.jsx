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
import { AlertCircle, Plus, Trash2, Calendar } from "lucide-react";

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
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center gap-2">
              <Calendar className="text-blue-600" size={24} />
              <DialogTitle className="text-xl">
                {mode === "edit" ? "Editar Algoritmo de Visita" : "Nuevo Algoritmo de Visita"}
              </DialogTitle>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-5 py-4">

              {/* Sección 1: Vehículo */}
              <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                  Vehículo
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Marca */}
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1">
                      Marca
                      <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.marca_id}
                      onValueChange={(value) => handleSelectChange("marca_id", value)}
                    >
                      <SelectTrigger className={errors.marca_id ? "border-red-500" : ""}>
                        <SelectValue placeholder="Seleccionar marca" />
                      </SelectTrigger>
                      <SelectContent>
                        {marcas.map((marca) => (
                          <SelectItem key={marca.id} value={String(marca.id)}>
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
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1">
                      Modelo
                      <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={formData.modelo_id}
                      onValueChange={(value) =>
                        handleSelectChange("modelo_id", value)
                      }
                      disabled={!formData.marca_id || loadingModelos}
                    >
                      <SelectTrigger className={errors.modelo_id ? "border-red-500" : ""}>
                        <SelectValue
                          placeholder={
                            loadingModelos
                              ? "Cargando..."
                              : "Seleccionar modelo"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {modelos.map((modelo) => (
                          <SelectItem key={modelo.id} value={String(modelo.id)}>
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
              <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                  Intervalo de Mantenimiento
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Kilometraje */}
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1">
                      Kilometraje
                      <span className="text-red-500">*</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle size={14} className="text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top">
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
                      className={errors.kilometraje ? "border-red-500" : ""}
                    />
                    {errors.kilometraje && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.kilometraje}
                      </p>
                    )}
                  </div>

                  {/* Meses */}
                  <div className="space-y-1">
                    <Label className="flex items-center gap-1">
                      Meses
                      <span className="text-red-500">*</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <AlertCircle size={14} className="text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top">
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
                      className={errors.meses ? "border-red-500" : ""}
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
              <div className="space-y-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">3</span>
                  Rango de Años
                </h3>

                <div className="space-y-3">
                  {/* Switch - Aplica todos */}
                  <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-slate-200">
                    <Switch 
                      checked={isAll} 
                      onCheckedChange={handleSwitchChange}
                      className="data-[state=checked]:bg-blue-600"
                    />
                    <div className="flex-1">
                      <p className="font-medium text-sm text-slate-900">
                        Aplica a todos los años
                      </p>
                      <p className="text-xs text-gray-600">
                        Si está activado, ignora los rangos específicos
                      </p>
                    </div>
                  </div>

                  {/* Rangos específicos */}
                  {!isAll && (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600">
                        Define los rangos de años para aplicar este algoritmo:
                      </p>

                      {yearRanges.map((range, index) => (
                        <div 
                          key={index} 
                          className="p-3 bg-white rounded-lg border border-slate-200 space-y-2"
                        >
                          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 mb-2">
                            <span className="w-5 h-5 rounded-full bg-slate-300 flex items-center justify-center">
                              {index + 1}
                            </span>
                            Rango {index + 1}
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                            {/* Desde */}
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Desde</label>
                              <Input
                                type="number"
                                value={range.start}
                                onChange={(e) =>
                                  handleYearChange(index, "start", e.target.value)
                                }
                                placeholder="0001"
                                min="0001"
                                max="9999"
                                className="text-sm"
                              />
                            </div>

                            {/* Operador inicio */}
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Op</label>
                              <Select
                                value={range.opStart}
                                onValueChange={(value) =>
                                  handleOperatorStartChange(index, value)
                                }
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="<=">≤</SelectItem>
                                  <SelectItem value="<">&lt;</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Año */}
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Año</label>
                              <div className="h-9 flex items-center justify-center bg-slate-100 rounded border border-slate-300 text-sm font-medium text-gray-700">
                                Año
                              </div>
                            </div>

                            {/* Operador fin */}
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Op</label>
                              <Select
                                value={range.opEnd}
                                onValueChange={(value) =>
                                  handleOperatorEndChange(index, value)
                                }
                              >
                                <SelectTrigger className="text-sm">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="<=">≤</SelectItem>
                                  <SelectItem value=">">&gt;</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Hasta */}
                            <div>
                              <label className="text-xs text-gray-600 block mb-1">Hasta</label>
                              <Input
                                type="number"
                                value={range.end}
                                onChange={(e) =>
                                  handleYearChange(index, "end", e.target.value)
                                }
                                placeholder="9999"
                                min="0001"
                                max="9999"
                                className="text-sm"
                              />
                            </div>
                          </div>

                          {/* Botones acciones */}
                          <div className="flex gap-2 justify-end pt-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  className="hover:bg-red-100 hover:text-red-700"
                                  onClick={() => handleRemoveColumn(index)}
                                  disabled={yearRanges.length === 1}
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Eliminar rango</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="bg-green-600 hover:bg-green-700 text-white"
                                  onClick={handleAddColumn}
                                >
                                  <Plus size={14} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Agregar rango</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>

            <DialogFooter className="border-t pt-4 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button 
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white"
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