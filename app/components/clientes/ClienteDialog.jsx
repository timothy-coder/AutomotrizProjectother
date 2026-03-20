"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { AlertCircle } from "lucide-react";

export default function ClienteDialog({
  open,
  mode,
  cliente,
  onSave,
  onOpenChange,
}) {
  const isEdit = mode === "edit";

  const [form, setForm] = useState({
    nombre: "",
    apellido: "",
    email: "",
    celular: "",
    tipo_identificacion: "DNI",
    identificacion_fiscal: "",
    nombre_comercial: "",
  });

  const [errors, setErrors] = useState({});

  // cargar datos cuando edita
  useEffect(() => {
    if (!open) return;

    if (cliente) {
      setForm({
        nombre: cliente.nombre ?? "",
        apellido: cliente.apellido ?? "",
        email: cliente.email ?? "",
        celular: cliente.celular ?? "",
        tipo_identificacion: cliente.tipo_identificacion ?? "DNI",
        identificacion_fiscal: cliente.identificacion_fiscal ?? "",
        nombre_comercial: cliente.nombre_comercial ?? "",
      });
    } else {
      setForm({
        nombre: "",
        apellido: "",
        email: "",
        celular: "",
        tipo_identificacion: "DNI",
        identificacion_fiscal: "",
        nombre_comercial: "",
      });
    }
    setErrors({});
  }, [open, cliente]);

  function updateField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
    // Limpiar error del campo cuando empieza a escribir
    if (errors[key]) {
      setErrors((p) => ({ ...p, [key]: "" }));
    }
  }

  function validateForm() {
    const newErrors = {};

    // Validaciones comunes
    if (!form.nombre.trim()) {
      newErrors.nombre = "Nombre requerido";
    }
    if (!form.apellido.trim()) {
      newErrors.apellido = "Apellido requerido";
    }
    if (!form.email.trim()) {
      newErrors.email = "Email requerido";
    }
    if (!form.celular.trim()) {
      newErrors.celular = "Celular requerido";
    }
    if (!form.identificacion_fiscal.trim()) {
      newErrors.identificacion_fiscal = "N° Documento requerido";
    }

    // Si es RUC, nombre comercial es obligatorio
    if (form.tipo_identificacion === "RUC") {
      if (!form.nombre_comercial.trim()) {
        newErrors.nombre_comercial = "Nombre comercial requerido para RUC";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSave() {
    if (!validateForm()) return;

    onSave?.({
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      email: form.email.trim(),
      celular: form.celular.trim(),
      tipo_identificacion: form.tipo_identificacion,
      identificacion_fiscal: form.identificacion_fiscal.trim(),
      nombre_comercial: form.tipo_identificacion === "RUC" 
        ? form.nombre_comercial.trim() 
        : null,
    });
  }

  // Campos requeridos para crear
  const isFormValid = 
    form.nombre.trim() &&
    form.apellido.trim() &&
    form.email.trim() &&
    form.celular.trim() &&
    form.identificacion_fiscal.trim() &&
    (form.tipo_identificacion !== "RUC" || form.nombre_comercial.trim());

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">

          <DialogHeader>
            <DialogTitle>
              {isEdit ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-2">

            {/* Nombre */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                Nombre 
                <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.nombre}
                onChange={(e) => updateField("nombre", e.target.value)}
                placeholder="Ingrese nombre"
                className={errors.nombre ? "border-red-500 focus:ring-red-500" : ""}
              />
              {errors.nombre && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.nombre}
                </p>
              )}
            </div>

            {/* Apellido */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                Apellido 
                <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.apellido}
                onChange={(e) => updateField("apellido", e.target.value)}
                placeholder="Ingrese apellido"
                className={errors.apellido ? "border-red-500 focus:ring-red-500" : ""}
              />
              {errors.apellido && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.apellido}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                Email 
                <span className="text-red-500">*</span>
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="correo@ejemplo.com"
                className={errors.email ? "border-red-500 focus:ring-red-500" : ""}
              />
              {errors.email && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.email}
                </p>
              )}
            </div>

            {/* Celular */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                Celular 
                <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.celular}
                onChange={(e) => updateField("celular", e.target.value)}
                placeholder="999999999"
                className={errors.celular ? "border-red-500 focus:ring-red-500" : ""}
              />
              {errors.celular && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.celular}
                </p>
              )}
            </div>

            {/* Tipo Identificación */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                Tipo identificación
                <span className="text-red-500">*</span>
              </Label>

              <Select
                value={form.tipo_identificacion}
                onValueChange={(v) => updateField("tipo_identificacion", v)}
              >
                <SelectTrigger className={errors.tipo_identificacion ? "border-red-500" : ""}>
                  <SelectValue />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="DNI">
                    <span className="flex items-center gap-2">
                      DNI - Documento Nacional
                    </span>
                  </SelectItem>
                  <SelectItem value="RUC">
                    <span className="flex items-center gap-2">
                      RUC - Razón Social
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Identificación Fiscal */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                N° Documento 
                <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.identificacion_fiscal}
                onChange={(e) => updateField("identificacion_fiscal", e.target.value)}
                placeholder={form.tipo_identificacion === "RUC" ? "20123456789" : "12345678"}
                className={errors.identificacion_fiscal ? "border-red-500 focus:ring-red-500" : ""}
              />
              {errors.identificacion_fiscal && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.identificacion_fiscal}
                </p>
              )}
            </div>

            {/* Nombre Comercial - Solo si es RUC */}
            {form.tipo_identificacion === "RUC" && (
              <div className="space-y-1 md:col-span-2">
                <Label className="flex items-center gap-1">
                  Nombre Comercial 
                  <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.nombre_comercial}
                  onChange={(e) => updateField("nombre_comercial", e.target.value)}
                  placeholder="Ingrese nombre comercial"
                  className={errors.nombre_comercial ? "border-red-500 focus:ring-red-500" : ""}
                />
                {errors.nombre_comercial && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle size={12} /> {errors.nombre_comercial}
                  </p>
                )}
              </div>
            )}

          </div>

          <DialogFooter className="mt-6">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleSave}
                  disabled={!isFormValid}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Guardar
                </Button>
              </TooltipTrigger>
              {!isFormValid && (
                <TooltipContent side="top">
                  Completa todos los campos requeridos
                </TooltipContent>
              )}
            </Tooltip>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}