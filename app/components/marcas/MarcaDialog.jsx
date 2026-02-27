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

export default function MarcaDialog({ open, onOpenChange, mode, marca, onSave }) {
  const isView = mode === "view";
  const isEdit = mode === "edit";

  const [form, setForm] = useState({
    name: "",
    image_url: "",
  });

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
  }, [marca]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleFileUpload(file) {
    if (!file) return;

    // preview rápido
    setPreview(URL.createObjectURL(file));

    try {
      setUploading(true);
      const fd = new FormData();
      fd.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data?.message || "Error upload");

      update("image_url", data.url);
      setPreview(data.url);
    } catch {
      // si falla, mantenemos preview local
    } finally {
      setUploading(false);
    }
  }

  function handleSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    if (isView) return;

    onSave?.({
      ...form,
      name: (form.name || "").trim(),
      image_url: (form.image_url || "").trim() || null,
    });
  }

  const canSave = !isView && (form.name || "").trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isView ? "Ver marca" : isEdit ? "Editar marca" : "Nueva marca"}
          </DialogTitle>
          <DialogDescription>
            {isView ? "Solo lectura." : "Completa la información y guarda."}
          </DialogDescription>
        </DialogHeader>

        {/* ✅ Enter = Guardar */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mt-2">
            <div>
              <Label>Nombre</Label>
              <Input
                disabled={isView}
                value={form.name || ""}
                onChange={(e) => update("name", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Imagen (upload o URL)</Label>

              <div className="flex flex-col md:flex-row gap-3 min-w-0">
                <div className="flex-1">
                  <Input
                    disabled={isView}
                    value={form.image_url || ""}
                    onChange={(e) => {
                      update("image_url", e.target.value);
                      setPreview(e.target.value);
                    }}
                    className="w-full truncate"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Puedes pegar una URL o subir un archivo.
                  </p>
                </div>

                <div className="w-full md:w-40">
                  <Input
                    disabled={isView}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e.target.files?.[0])}
                  />
                  {uploading && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Subiendo...
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                {preview ? (
                  <img
                    src={preview}
                    alt="preview"
                    className="h-14 w-14 rounded-md object-cover border"
                  />
                ) : (
                  <div className="h-14 w-14 rounded-md border grid place-items-center text-xs text-muted-foreground">
                    N/A
                  </div>
                )}

              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            {/* ✅ importante: NO submit */}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {isView ? "Cerrar" : "Cancelar"}
            </Button>

            {!isView && (
              <Button type="submit" disabled={!canSave}>
                Guardar
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}