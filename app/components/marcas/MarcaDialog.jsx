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

import { AlertCircle, Upload, Image as ImageIcon, Loader2, X } from "lucide-react";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

export default function MarcaDialog({ open, onOpenChange, mode, marca, onSave }) {
  const isView = mode === "view";
  const isEdit = mode === "edit";

  const [form, setForm] = useState({
    name: "",
    image_url: "",
  });

  const [errors, setErrors] = useState({});
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState("");

  useEffect(() => {
    if (marca) {
      setForm({
        id: marca.id,
        name: marca.name || "",
        image_url: marca.image_url || "",
      });
      setPreview(marca.image_url || "");
    } else {
      setForm({ name: "", image_url: "" });
      setPreview("");
    }
    setErrors({});
  }, [marca, open]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: "" }));
    }
  }

  function validateForm() {
    const newErrors = {};

    if (!form.name || String(form.name).trim() === "") {
      newErrors.name = "El nombre de la marca es requerido";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleFileUpload(file) {
    if (!file) return;

    // Validar tipo de archivo
    if (!file.type.startsWith("image/")) {
      setErrors({ file: "Solo se permiten imágenes" });
      return;
    }

    // Validar tamaño (máx 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ file: "La imagen no debe superar 5MB" });
      return;
    }

    // preview rápido
    setPreview(URL.createObjectURL(file));
    setErrors({});

    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || "Error al subir imagen");

      update("image_url", data.url);
      setPreview(data.url);
    } catch (error) {
      setErrors({ file: "Error al subir la imagen" });
      setPreview("");
      setForm((f) => ({ ...f, image_url: "" }));
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    if (isView) return;

    if (!validateForm()) return;

    onSave?.({
      ...form,
      name: (form.name || "").trim(),
      image_url: (form.image_url || "").trim() || null,
    });
  }

  function clearImage() {
    setForm((f) => ({ ...f, image_url: "" }));
    setPreview("");
  }

  const canSave = !isView && (form.name || "").trim().length > 0;

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl w-full overflow-hidden bg-white rounded-lg">
          {/* HEADER */}
          <DialogHeader className="pb-4 border-b" style={{ borderColor: `${BRAND_PRIMARY}20` }}>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg" style={{ backgroundColor: `${BRAND_PRIMARY}15` }}>
                <ImageIcon size={24} style={{ color: BRAND_PRIMARY }} />
              </div>
              <div>
                <DialogTitle className="text-xl" style={{ color: BRAND_PRIMARY }}>
                  {isView ? "Ver marca" : isEdit ? "Editar marca" : "Nueva marca"}
                </DialogTitle>
                <DialogDescription style={{ color: BRAND_SECONDARY }}>
                  {isView ? "Solo lectura" : "Complete la información de la marca"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-5 py-4 max-h-[65vh] overflow-y-auto pr-2">

              {/* Sección 1: Información Básica */}
              <div className="space-y-3 p-4 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
                <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                  <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ backgroundColor: BRAND_PRIMARY }}>1</span>
                  Información General
                </h3>

                {/* Nombre */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1 text-sm font-medium" style={{ color: BRAND_PRIMARY }}>
                    Nombre de la marca
                    <span className="text-red-500">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle size={14} className="cursor-help opacity-60" />
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Ej: Toyota, Honda, BMW, Nissan
                      </TooltipContent>
                    </Tooltip>
                  </Label>
                  <Input
                    disabled={isView}
                    value={form.name || ""}
                    onChange={(e) => update("name", e.target.value)}
                    placeholder="Ingrese el nombre de la marca"
                    className={`h-9 border-gray-300 focus:ring-2 transition-all text-sm ${errors.name ? "border-red-500" : ""}`}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Sección 2: Logo/Imagen */}
              <div className="space-y-3 p-4 rounded-lg border-2 transition-all" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
                <h3 className="font-semibold text-sm flex items-center gap-2" style={{ color: BRAND_PRIMARY }}>
                  <span className="w-6 h-6 rounded-full text-white text-xs flex items-center justify-center font-bold" style={{ backgroundColor: BRAND_PRIMARY }}>2</span>
                  Logo de la marca
                </h3>

                {/* Info */}
                <div className="p-2 rounded-lg bg-white/50 border border-gray-200">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity" style={{ color: BRAND_PRIMARY }}>
                        <AlertCircle size={14} />
                        <span className="font-medium">Ver información de formato</span>
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="text-xs space-y-1">
                        <p className="font-semibold">Formatos aceptados:</p>
                        <p>• JPG, PNG, WebP</p>
                        <p>• Tamaño máximo: 5MB</p>
                        <p>• Recomendado: Cuadrado (1:1)</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* Dos opciones: URL o Upload */}
                <div className="space-y-4">
                  
                  {/* Opción 1: URL */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-sm font-medium" style={{ color: BRAND_SECONDARY }}>
                      URL de imagen
                      <span className="text-gray-500 text-xs font-normal">(Opcional)</span>
                    </Label>
                    <Input
                      disabled={isView}
                      value={form.image_url || ""}
                      onChange={(e) => {
                        update("image_url", e.target.value);
                        setPreview(e.target.value);
                      }}
                      placeholder="https://ejemplo.com/logo.png"
                      className="h-9 border-gray-300 text-sm"
                    />
                    <p className="text-xs" style={{ color: BRAND_SECONDARY }}>
                      Pega la URL completa de la imagen
                    </p>
                  </div>

                  {/* Opción 2: Upload */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-sm font-medium" style={{ color: BRAND_SECONDARY }}>
                      <Upload size={14} />
                      Subir archivo
                      <span className="text-gray-500 text-xs font-normal">(Opcional)</span>
                    </Label>
                    <Input
                      disabled={isView || uploading}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files?.[0])}
                      className="h-9 text-sm file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-semibold file:cursor-pointer transition-all"
                      style={{
                        colorScheme: 'light',
                      }}
                    />
                    {uploading && (
                      <div className="flex items-center gap-2 text-xs font-medium" style={{ color: BRAND_PRIMARY }}>
                        <Loader2 size={14} className="animate-spin" />
                        Subiendo imagen...
                      </div>
                    )}
                    {errors.file && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle size={12} /> {errors.file}
                      </p>
                    )}
                  </div>

                  {/* Preview */}
                  <div className="pt-2 space-y-2">
                    <p className="text-sm font-medium" style={{ color: BRAND_PRIMARY }}>Vista previa:</p>
                    <div className="flex flex-col items-center justify-center gap-3">
                      {preview ? (
                        <div className="relative group">
                          <img
                            src={preview}
                            alt="preview"
                            className="h-40 w-40 rounded-lg object-cover border-2 shadow-md transition-all"
                            style={{ borderColor: `${BRAND_PRIMARY}40` }}
                          />
                          {uploading && (
                            <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                              <Loader2 size={28} className="text-white animate-spin" />
                            </div>
                          )}
                          {!isView && (
                            <button
                              type="button"
                              onClick={clearImage}
                              className="absolute top-1 right-1 p-1 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                              title="Eliminar imagen"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="h-40 w-40 rounded-lg border-2 border-dashed flex flex-col items-center justify-center text-center transition-all" style={{ borderColor: `${BRAND_PRIMARY}40`, backgroundColor: `${BRAND_PRIMARY}05` }}>
                          <ImageIcon size={40} style={{ color: BRAND_SECONDARY, opacity: 0.5 }} className="mb-2" />
                          <p className="text-xs font-medium" style={{ color: BRAND_SECONDARY }}>Sin imagen</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen */}
              {form.name && (
                <div className="p-3 rounded-lg border-2 transition-all" style={{ backgroundColor: `#10b98110`, borderColor: `#10b98140` }}>
                  <p className="text-sm" style={{ color: '#059669' }}>
                    <span className="font-semibold">✓ Resumen:</span>
                    <br />
                    <span className="text-xs opacity-90">
                      {form.name}
                      {preview && " • Con logo"}
                    </span>
                  </p>
                </div>
              )}

            </div>

            {/* FOOTER */}
            <DialogFooter className="border-t pt-4 mt-4 flex gap-2 justify-end">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="h-9"
              >
                {isView ? "Cerrar" : "Cancelar"}
              </Button>

              {!isView && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      type="submit" 
                      disabled={!canSave}
                      className="text-white h-9 disabled:opacity-50 transition-all"
                      style={{ backgroundColor: canSave ? BRAND_PRIMARY : BRAND_SECONDARY }}
                    >
                      {isEdit ? "Actualizar marca" : "Crear marca"}
                    </Button>
                  </TooltipTrigger>
                  {!canSave && (
                    <TooltipContent side="top">
                      Ingresa el nombre de la marca
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