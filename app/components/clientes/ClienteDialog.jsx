"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
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

import { AlertCircle, Loader2 } from "lucide-react";

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
  const [isSaving, setIsSaving] = useState(false);

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

    // Validar email
    if (!form.email.trim()) {
      newErrors.email = "Email requerido";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        newErrors.email = "Email inválido";
      }
    }

    // Validar celular
    if (!form.celular.trim()) {
      newErrors.celular = "Celular requerido";
    } else if (!/^\d{7,15}$/.test(form.celular.trim())) {
      newErrors.celular = "Celular debe contener entre 7 y 15 dígitos";
    }

    if (!form.identificacion_fiscal.trim()) {
      newErrors.identificacion_fiscal = "N° Documento requerido";
    } else {
      // Validar formato según tipo
      if (form.tipo_identificacion === "DNI") {
        if (!/^\d{8}$/.test(form.identificacion_fiscal.trim())) {
          newErrors.identificacion_fiscal = "DNI debe contener 8 dígitos";
        }
      } else if (form.tipo_identificacion === "RUC") {
        if (!/^\d{11}$/.test(form.identificacion_fiscal.trim())) {
          newErrors.identificacion_fiscal = "RUC debe contener 11 dígitos";
        }
      }
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

  async function handleSave() {
    if (!validateForm()) return;

    setIsSaving(true);

    try {
      const payload = {
        nombre: form.nombre.trim(),
        apellido: form.apellido.trim(),
        email: form.email.trim(),
        celular: form.celular.trim(),
        tipo_identificacion: form.tipo_identificacion,
        identificacion_fiscal: form.identificacion_fiscal.trim(),
        nombre_comercial: form.tipo_identificacion === "RUC"
          ? form.nombre_comercial.trim()
          : null,
      };

      // ✅ Llamar a onSave si viene del padre
      if (onSave) {
        await onSave(payload);
      } else {
        // ✅ O hacer POST si no viene onSave
        const response = await fetch("/api/clientes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await response.json();

        if (!response.ok) {
          // ✅ Manejar errores específicos del servidor
          if (response.status === 409) {
            // Duplicado
            const fieldMap = {
              identificacion_fiscal: "identificacion_fiscal",
              email: "email",
              celular: "celular",
            };

            const errorField = fieldMap[data.field] || data.field;
            setErrors((p) => ({ ...p, [errorField]: data.message }));
            toast.error(data.message);
          } else {
            toast.error(data.message || "Error al guardar cliente");
          }
          setIsSaving(false);
          return;
        }

        toast.success(data.message || "Cliente guardado exitosamente");
        onOpenChange(false);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar cliente");
    } finally {
      setIsSaving(false);
    }
  }

  // Campos requeridos para crear
  const isFormValid =
    form.nombre.trim() &&
    form.apellido.trim() &&
    form.email.trim() &&
    form.celular.trim() &&
    form.identificacion_fiscal.trim() &&
    (form.tipo_identificacion !== "RUC" || form.nombre_comercial.trim()) &&
    Object.keys(errors).length === 0;

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl">

          <DialogHeader>
            <DialogTitle className="text-[#5d16ec]">
              {isEdit ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-2">

            {/* Nombre */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-[#5d16ec]">
                Nombre
                <span className="text-red-500">*</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle size={14} className="text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Nombre del cliente
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                value={form.nombre}
                onChange={(e) => updateField("nombre", e.target.value)}
                placeholder="Ingrese nombre"
                className={errors.nombre ? "border-red-500 focus:ring-red-500" : ""}
                disabled={isSaving}
              />
              {errors.nombre && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.nombre}
                </p>
              )}
            </div>

            {/* Apellido */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-[#5d16ec]">
                Apellido
                <span className="text-red-500">*</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle size={14} className="text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Apellido del cliente
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                value={form.apellido}
                onChange={(e) => updateField("apellido", e.target.value)}
                placeholder="Ingrese apellido"
                className={errors.apellido ? "border-red-500 focus:ring-red-500" : ""}
                disabled={isSaving}
              />
              {errors.apellido && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.apellido}
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-[#5d16ec]">
                Email
                <span className="text-red-500">*</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle size={14} className="text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Email del cliente (no puede repetirse)
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => updateField("email", e.target.value)}
                placeholder="correo@ejemplo.com"
                className={errors.email ? "border-red-500 focus:ring-red-500" : ""}
                disabled={isSaving}
              />
              {errors.email && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.email}
                </p>
              )}
            </div>

            {/* Celular */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-[#5d16ec]">
                Celular
                <span className="text-red-500">*</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle size={14} className="text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Número de celular (7 a 15 dígitos, no puede repetirse)
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                value={form.celular}
                onChange={(e) => updateField("celular", e.target.value)}
                placeholder="999999999"
                className={errors.celular ? "border-red-500 focus:ring-red-500" : ""}
                disabled={isSaving}
              />
              {errors.celular && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.celular}
                </p>
              )}
            </div>

            {/* Tipo Identificación */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-[#5d16ec]">
                Tipo identificación
                <span className="text-red-500">*</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle size={14} className="text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Tipo de identificación del cliente
                  </TooltipContent>
                </Tooltip>
              </Label>

              <Select
                value={form.tipo_identificacion}
                onValueChange={(v) => updateField("tipo_identificacion", v)}
                disabled={isSaving}
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
                  <SelectItem value="PASAPORTE">
                    <span className="flex items-center gap-2">
                      PASAPORTE
                    </span>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Identificación Fiscal */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-[#5d16ec]">
                Documento  de Identidad
                <span className="text-red-500">*</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <AlertCircle size={14} className="text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {form.tipo_identificacion === "RUC"
                      ? "RUC: 11 dígitos (no puede repetirse)"
                      : "DNI: 8 dígitos (no puede repetirse)"
                    }
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Input
                value={form.identificacion_fiscal}
                onChange={(e) => updateField("identificacion_fiscal", e.target.value)}
                placeholder={
                  form.tipo_identificacion === "RUC"
                    ? "20123456789"
                    : form.tipo_identificacion === "DNI"
                      ? "12345678"
                      : "A123456789"
                }
                className={errors.identificacion_fiscal ? "border-red-500 focus:ring-red-500" : ""}
                disabled={isSaving}
                maxLength={
                  form.tipo_identificacion === "RUC"
                    ? 11
                    : form.tipo_identificacion === "DNI"
                      ? 8
                      : 20
                }
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
                <Label className="flex items-center gap-1 text-[#5d16ec]">
                  Nombre Comercial
                  <span className="text-red-500">*</span>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <AlertCircle size={14} className="text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Nombre comercial del cliente
                    </TooltipContent>
                  </Tooltip>
                </Label>
                <Input
                  value={form.nombre_comercial}
                  onChange={(e) => updateField("nombre_comercial", e.target.value)}
                  placeholder="Ingrese nombre comercial"
                  className={errors.nombre_comercial ? "border-red-500 focus:ring-red-500" : ""}
                  disabled={isSaving}
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
              disabled={isSaving}
            >
              Cancelar
            </Button>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={handleSave}
                  disabled={!isFormValid || isSaving}
                  className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving && <Loader2 size={16} className="animate-spin" />}
                  {isSaving ? "Guardando..." : "Guardar"}
                </Button>
              </TooltipTrigger>
              {!isFormValid && !isSaving && (
                <TooltipContent side="top">
                  Completa todos los campos requeridos correctamente
                </TooltipContent>
              )}
            </Tooltip>
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}