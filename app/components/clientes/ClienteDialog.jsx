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
import { Textarea } from "@/components/ui/textarea";

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
    fecha_nacimiento: "",
    ocupacion: "",
    domicilio: "",
    departamento_id: "",
    provincia_id: "",
    distrito_id: "",
    nombreconyugue: "",
    dniconyugue: "",
  });

  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [departamentos, setDepartamentos] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [distritos, setDistritos] = useState([]);
  
  // ✅ Estados filtrados
  const [provinciasFiltradas, setProvinciasFiltradas] = useState([]);
  const [distritosFiltrados, setDistritosFiltrados] = useState([]);

  // ✅ FUNCIÓN PARA FORMATEAR FECHA
  function formatDateForInput(dateString) {
    if (!dateString) return "";
    
    try {
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
        return dateString;
      }
      
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.error("Error formateando fecha:", e);
      return "";
    }
  }

  // Cargar datos ubicaciones
  useEffect(() => {
    loadUbicaciones();
  }, []);

  async function loadUbicaciones() {
    try {
      const [depRes, provRes, distRes] = await Promise.all([
        fetch("/api/departamentos", { cache: "no-store" }),
        fetch("/api/provincias", { cache: "no-store" }),
        fetch("/api/distritos", { cache: "no-store" }),
      ]);

      if (depRes.ok) setDepartamentos(await depRes.json());
      if (provRes.ok) setProvincias(await provRes.json());
      if (distRes.ok) setDistritos(await distRes.json());
    } catch (error) {
      console.error("Error cargando ubicaciones:", error);
    }
  }

  // ✅ EFECTO PARA FILTRAR PROVINCIAS CUANDO CAMBIA DEPARTAMENTO
  useEffect(() => {
    if (form.departamento_id) {
      const deptId = parseInt(form.departamento_id);
      const provsFiltradas = provincias.filter(
        (prov) => prov.departamento_id === deptId
      );
      setProvinciasFiltradas(provsFiltradas);
      
      // Limpiar provincia e distrito si no están en las nuevas opciones
      if (form.provincia_id) {
        const provinciaActual = provsFiltradas.find(
          (p) => p.id === parseInt(form.provincia_id)
        );
        if (!provinciaActual) {
          setForm((prev) => ({
            ...prev,
            provincia_id: "",
            distrito_id: "",
          }));
          setDistritosFiltrados([]);
        }
      }
    } else {
      setProvinciasFiltradas([]);
      setForm((prev) => ({
        ...prev,
        provincia_id: "",
        distrito_id: "",
      }));
      setDistritosFiltrados([]);
    }
  }, [form.departamento_id, provincias]);

  // ✅ EFECTO PARA FILTRAR DISTRITOS CUANDO CAMBIA PROVINCIA
  useEffect(() => {
    if (form.provincia_id) {
      const provId = parseInt(form.provincia_id);
      const distFiltrados = distritos.filter(
        (dist) => dist.provincia_id === provId
      );
      setDistritosFiltrados(distFiltrados);
      
      // Limpiar distrito si no está en las nuevas opciones
      if (form.distrito_id) {
        const distritoActual = distFiltrados.find(
          (d) => d.id === parseInt(form.distrito_id)
        );
        if (!distritoActual) {
          setForm((prev) => ({
            ...prev,
            distrito_id: "",
          }));
        }
      }
    } else {
      setDistritosFiltrados([]);
      setForm((prev) => ({
        ...prev,
        distrito_id: "",
      }));
    }
  }, [form.provincia_id, distritos]);

  // Cargar datos cuando edita
  useEffect(() => {
    if (!open) return;

    if (cliente) {
      let celularFormato = cliente.celular ?? "";
      if (celularFormato.startsWith("51")) {
        celularFormato = celularFormato.slice(2);
      }

      const fechaNacimiento = formatDateForInput(cliente.fecha_nacimiento);

      setForm({
        nombre: cliente.nombre ?? "",
        apellido: cliente.apellido ?? "",
        email: cliente.email ?? "",
        celular: celularFormato,
        tipo_identificacion: cliente.tipo_identificacion ?? "DNI",
        identificacion_fiscal: cliente.identificacion_fiscal ?? "",
        nombre_comercial: cliente.nombre_comercial ?? "",
        fecha_nacimiento: fechaNacimiento,
        ocupacion: cliente.ocupacion ?? "",
        domicilio: cliente.domicilio ?? "",
        departamento_id: cliente.departamento_id ? cliente.departamento_id.toString() : "",
        provincia_id: cliente.provincia_id ? cliente.provincia_id.toString() : "",
        distrito_id: cliente.distrito_id ? cliente.distrito_id.toString() : "",
        nombreconyugue: cliente.nombreconyugue ?? "",
        dniconyugue: cliente.dniconyugue ?? "",
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
        fecha_nacimiento: "",
        ocupacion: "",
        domicilio: "",
        departamento_id: "",
        provincia_id: "",
        distrito_id: "",
        nombreconyugue: "",
        dniconyugue: "",
      });
    }
    setErrors({});
  }, [open, cliente]);

  function updateField(key, value) {
    if (key === "celular") {
      value = value.replace(/\D/g, "");
      value = value.slice(0, 9);
    }

    setForm((p) => ({ ...p, [key]: value }));
    if (errors[key]) {
      setErrors((p) => ({ ...p, [key]: "" }));
    }
  }

  function validateForm() {
    const newErrors = {};

    if (!form.nombre.trim()) {
      newErrors.nombre = "Nombre requerido";
    }
    if (!form.apellido.trim()) {
      newErrors.apellido = "Apellido requerido";
    }

    if (!form.email.trim()) {
      newErrors.email = "Email requerido";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email.trim())) {
        newErrors.email = "Email inválido";
      }
    }

    if (!form.celular.trim()) {
      newErrors.celular = "Celular requerido";
    } else if (!/^\d{9}$/.test(form.celular.trim())) {
      newErrors.celular = "Celular debe contener exactamente 9 dígitos";
    }

    if (!form.identificacion_fiscal.trim()) {
      newErrors.identificacion_fiscal = "N° Documento requerido";
    } else {
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
        celular: "51" + form.celular.trim(),
        tipo_identificacion: form.tipo_identificacion,
        identificacion_fiscal: form.identificacion_fiscal.trim(),
        nombre_comercial: form.tipo_identificacion === "RUC"
          ? form.nombre_comercial.trim()
          : null,
        fecha_nacimiento: form.fecha_nacimiento ? form.fecha_nacimiento : null,
        ocupacion: form.ocupacion.trim() || null,
        domicilio: form.domicilio.trim() || null,
        departamento_id: form.departamento_id ? parseInt(form.departamento_id) : null,
        provincia_id: form.provincia_id ? parseInt(form.provincia_id) : null,
        distrito_id: form.distrito_id ? parseInt(form.distrito_id) : null,
        nombreconyugue: form.nombreconyugue.trim() || null,
        dniconyugue: form.dniconyugue.trim() || null,
      };

      if (onSave) {
        await onSave(payload);
      } else {
        const response = await fetch(
          isEdit ? `/api/clientes/${cliente.id}` : "/api/clientes",
          {
            method: isEdit ? "PUT" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        const data = await response.json();

        if (!response.ok) {
          if (response.status === 409) {
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-[#5d16ec]">
              {isEdit ? "Editar Cliente" : "Nuevo Cliente"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[70vh] overflow-y-auto pr-2">
            {/* ========== SECCIÓN INFORMACIÓN BÁSICA ========== */}
            <div className="md:col-span-2 border-b pb-3 mb-2">
              <h3 className="text-sm font-bold text-[#5d16ec]">Información Básica</h3>
            </div>

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
                    Número de celular (9 dígitos, no puede repetirse)
                  </TooltipContent>
                </Tooltip>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-2 rounded">
                  +51
                </span>
                <Input
                  value={form.celular}
                  onChange={(e) => updateField("celular", e.target.value)}
                  placeholder="999999999"
                  className={errors.celular ? "border-red-500 focus:ring-red-500" : ""}
                  disabled={isSaving}
                  maxLength="9"
                  inputMode="numeric"
                />
              </div>
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
                  <SelectItem value="DNI">DNI - Documento Nacional</SelectItem>
                  <SelectItem value="RUC">RUC - Razón Social</SelectItem>
                  <SelectItem value="PASAPORTE">PASAPORTE</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Identificación Fiscal */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-[#5d16ec]">
                Documento de Identidad
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

            {/* ========== SECCIÓN INFORMACIÓN PERSONAL ========== */}
            <div className="md:col-span-2 border-b pb-3 mb-2 mt-4">
              <h3 className="text-sm font-bold text-[#5d16ec]">Información Personal</h3>
            </div>

            {/* Fecha de Nacimiento */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-[#5d16ec]">
                Fecha de Nacimiento
              </Label>
              <Input
                type="date"
                value={form.fecha_nacimiento}
                onChange={(e) => updateField("fecha_nacimiento", e.target.value)}
                disabled={isSaving}
              />
            </div>

            {/* Ocupación */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-[#5d16ec]">
                Ocupación
              </Label>
              <Input
                value={form.ocupacion}
                onChange={(e) => updateField("ocupacion", e.target.value)}
                placeholder="Ej: Ingeniero, Vendedor, etc."
                disabled={isSaving}
              />
            </div>

            {/* Domicilio */}
            <div className="space-y-1 md:col-span-2">
              <Label className="flex items-center gap-1 text-[#5d16ec]">
                Domicilio
              </Label>
              <Textarea
                value={form.domicilio}
                onChange={(e) => updateField("domicilio", e.target.value)}
                placeholder="Ingrese dirección completa"
                disabled={isSaving}
                rows={2}
              />
            </div>

            {/* ========== SECCIÓN UBICACIÓN ========== */}
            <div className="md:col-span-2 border-b pb-3 mb-2 mt-4">
              <h3 className="text-sm font-bold text-[#5d16ec]">Ubicación</h3>
            </div>

            {/* ✅ DEPARTAMENTO */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-[#5d16ec]">
                Departamento
              </Label>
              <Select
                value={form.departamento_id}
                onValueChange={(v) => updateField("departamento_id", v)}
                disabled={isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione departamento" />
                </SelectTrigger>
                <SelectContent>
                  {departamentos.map((dep) => (
                    <SelectItem key={dep.id} value={dep.id.toString()}>
                      {dep.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

                        {/* ✅ PROVINCIA - FILTRADA POR DEPARTAMENTO */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-[#5d16ec]">
                Provincia
                {!form.departamento_id && <span className="text-gray-500 text-xs">(Selecciona departamento primero)</span>}
              </Label>
              <Select
                value={form.provincia_id}
                onValueChange={(v) => updateField("provincia_id", v)}
                disabled={!form.departamento_id || isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione provincia" />
                </SelectTrigger>
                <SelectContent>
                  {provinciasFiltradas.length > 0 ? (
                    provinciasFiltradas.map((prov) => (
                      <SelectItem key={prov.id} value={prov.id.toString()}>
                        {prov.nombre}
                      </SelectItem>
                    ))
                  ) : null}
                </SelectContent>
              </Select>
            </div>

            {/* ✅ DISTRITO - FILTRADO POR PROVINCIA */}
            <div className="space-y-1 md:col-span-2">
              <Label className="flex items-center gap-1 text-[#5d16ec]">
                Distrito
                {!form.provincia_id && <span className="text-gray-500 text-xs">(Selecciona provincia primero)</span>}
              </Label>
              <Select
                value={form.distrito_id}
                onValueChange={(v) => updateField("distrito_id", v)}
                disabled={!form.provincia_id || isSaving}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione distrito" />
                </SelectTrigger>
                <SelectContent>
                  {distritosFiltrados.length > 0 ? (
                    distritosFiltrados.map((dist) => (
                      <SelectItem key={dist.id} value={dist.id.toString()}>
                        {dist.nombre}
                      </SelectItem>
                    ))
                  ) : null}
                </SelectContent>
              </Select>
            </div>

            {/* ========== SECCIÓN CÓNYUGE ========== */}
            <div className="md:col-span-2 border-b pb-3 mb-2 mt-4">
              <h3 className="text-sm font-bold text-[#5d16ec]">Información del Cónyuge (Opcional)</h3>
            </div>

            {/* Nombre Cónyuge */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-[#5d16ec]">
                Nombre del Cónyuge
              </Label>
              <Input
                value={form.nombreconyugue}
                onChange={(e) => updateField("nombreconyugue", e.target.value)}
                placeholder="Nombre completo"
                disabled={isSaving}
              />
            </div>

            {/* DNI Cónyuge */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1 text-[#5d16ec]">
                DNI del Cónyuge
              </Label>
              <Input
                value={form.dniconyugue}
                onChange={(e) => updateField("dniconyugue", e.target.value)}
                placeholder="12345678"
                disabled={isSaving}
                maxLength="8"
              />
            </div>
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