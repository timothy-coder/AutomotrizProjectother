"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, Tag } from "lucide-react";

export default function ClaseDialog({ open, onOpenChange, mode, clase, onSave }) {
  const isView = mode === "view";
  const isEdit = mode === "edit";

  const [form, setForm] = useState({ name: "" });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (clase) {
      setForm({
        id: clase.id,
        name: clase.name || "",
      });
    } else {
      setForm({ name: "" });
    }
    setErrors({});
  }, [clase, open]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }

  function validateForm() {
    const newErrors = {};

    if (!form.name || String(form.name).trim() === "") {
      newErrors.name = "El nombre de la clase es requerido";
    } else if (form.name.trim().length < 2) {
      newErrors.name = "El nombre debe tener al menos 2 caracteres";
    } else if (form.name.trim().length > 50) {
      newErrors.name = "El nombre no puede exceder 50 caracteres";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    if (isView) return;

    if (!validateForm()) return;

    onSave?.({
      ...form,
      name: (form.name || "").trim(),
    });
  }

  const canSave = !isView && (form.name || "").trim().length > 0;

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md w-full overflow-hidden">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center gap-2">
              <Tag size={24} className="text-blue-600" />
              <div>
                <DialogTitle className="text-xl">
                  {isView ? "Ver clase" : isEdit ? "Editar clase" : "Nueva clase"}
                </DialogTitle>
                <DialogDescription>
                  {isView ? "Solo lectura" : "Complete la información de la clase"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6 py-4">

              {/* Información sobre clases */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm text-blue-900">
                  <span className="font-semibold">Ejemplos de clases:</span>
                  <br />
                  <span className="text-blue-800 text-xs">
                    Sedán, SUV, Camioneta, Coupe, Hatchback, Minivan, Wagon
                  </span>
                </p>
              </div>

              {/* Campo de nombre */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                  Información
                </h3>

                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Nombre de la clase
                    <span className="text-red-500">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle size={14} className="text-gray-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        <div className="text-sm space-y-1">
                          <p>Ejemplos válidos:</p>
                          <p className="text-xs">• Sedán</p>
                          <p className="text-xs">• SUV</p>
                          <p className="text-xs">• Camioneta</p>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </Label>

                  <Input
                    disabled={isView}
                    value={form.name || ""}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Ej: Sedán, SUV, Hatchback"
                    maxLength={50}
                    className={`h-9 ${errors.name ? "border-red-500 focus:ring-red-500" : ""}`}
                  />

                  {errors.name && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.name}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-600">
                      {form.name?.length || 0} / 50 caracteres
                    </p>
                    {form.name?.trim().length > 0 && (
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-semibold">
                        ✓ Válido
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Resumen */}
              {form.name?.trim() && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm">
                    <span className="font-semibold text-green-900">Resumen:</span>
                    <br />
                    <span className="text-green-800 font-medium">
                      {form.name.trim()}
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
                {isView ? "Cerrar" : "Cancelar"}
              </Button>

              {!isView && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      type="submit"
                      disabled={!canSave}
                      className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isEdit ? "Actualizar clase" : "Crear clase"}
                    </Button>
                  </TooltipTrigger>
                  {!canSave && (
                    <TooltipContent side="top">
                      Ingresa un nombre válido para la clase
                    </TooltipContent>
                  )}
                </Tooltip>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}