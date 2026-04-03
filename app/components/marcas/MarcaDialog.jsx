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

import { AlertCircle, Upload, Image as ImageIcon, Loader2 } from "lucide-react";

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

  const canSave = !isView && (form.name || "").trim().length > 0;

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl w-full overflow-hidden">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-center gap-2">
              <ImageIcon size={24} className="text-blue-600" />
              <div>
                <DialogTitle className="text-xl">
                  {isView ? "Ver marca" : isEdit ? "Editar marca" : "Nueva marca"}
                </DialogTitle>
                <DialogDescription>
                  {isView ? "Solo lectura" : "Complete la información de la marca"}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit}>
            <div className="space-y-6 py-4">

              {/* Sección 1: Información Básica */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
                  Información General
                </h3>

                {/* Nombre */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-1">
                    Nombre de la marca
                    <span className="text-red-500">*</span>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle size={14} className="text-gray-400 cursor-help" />
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
                    className={`h-9 ${errors.name ? "border-red-500" : ""}`}
                  />
                  {errors.name && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle size={12} /> {errors.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Sección 2: Logo/Imagen */}
              <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">2</span>
                  Logo de la marca
                </h3>

                <p className="text-sm text-gray-600">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button type="button" className="text-blue-600 hover:underline flex items-center gap-1">
                        <AlertCircle size={14} />
                        Información sobre la imagen
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      <div className="text-sm space-y-1">
                        <p>• Formatos: JPG, PNG, WebP</p>
                        <p>• Tamaño máximo: 5MB</p>
                        <p>• Recomendado: Cuadrado (1:1)</p>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </p>

                {/* Dos opciones: URL o Upload */}
                <div className="space-y-4">
                  
                  {/* Opción 1: URL */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-sm">
                      <span>URL de imagen</span>
                      <span className="text-gray-500 text-xs">(Opcional)</span>
                    </Label>
                    <Input
                      disabled={isView}
                      value={form.image_url || ""}
                      onChange={(e) => {
                        update("image_url", e.target.value);
                        setPreview(e.target.value);
                      }}
                      placeholder="https://ejemplo.com/logo.png"
                      className="h-9"
                    />
                    <p className="text-xs text-gray-600">
                      Pega la URL completa de la imagen
                    </p>
                  </div>

                  {/* Opción 2: Upload */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1 text-sm">
                      <Upload size={14} />
                      Subir archivo
                      <span className="text-gray-500 text-xs">(Opcional)</span>
                    </Label>
                    <Input
                      disabled={isView || uploading}
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleFileUpload(e.target.files?.[0])}
                      className="h-9 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    {uploading && (
                      <div className="flex items-center gap-2 text-sm text-blue-600">
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
                  <div className="pt-2">
                    <p className="text-sm font-medium text-gray-700 mb-2">Vista previa:</p>
                    <div className="flex items-center justify-center">
                      {preview ? (
                        <div className="relative">
                          <img
                            src={preview}
                            alt="preview"
                            className="h-32 w-32 rounded-lg object-cover border-2 border-slate-300 shadow-sm"
                          />
                          {uploading && (
                            <div className="absolute inset-0 bg-black/30 rounded-lg flex items-center justify-center">
                              <Loader2 size={24} className="text-white animate-spin" />
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="h-32 w-32 rounded-lg border-2 border-dashed border-slate-300 bg-slate-100 flex flex-col items-center justify-center text-gray-500">
                          <ImageIcon size={32} className="text-gray-400 mb-1" />
                          <p className="text-xs text-center">Sin imagen</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Resumen */}
              {form.name && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm">
                    <span className="font-semibold text-green-900">Resumen:</span>
                    <br />
                    <span className="text-green-800">
                      {form.name}
                      {preview && " - Con logo"}
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
                      className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
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