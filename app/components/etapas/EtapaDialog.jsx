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
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function EtapaDialog({
  open,
  onOpenChange,
  mode,
  etapa,
  onSave,
}) {
  const isView = mode === "view";
  const isEdit = mode === "edit";

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    tipo: 1,
    is_active: true,
  });

  useEffect(() => {
    if (etapa) {
      setForm({
        id: etapa.id,
        nombre: etapa.nombre || "",
        descripcion: etapa.descripcion || "",
        tipo: Number(etapa.tipo) || 1,
        is_active: etapa.is_active ?? true,
      });
    } else {
      setForm({
        nombre: "",
        descripcion: "",
        tipo: 1,
        is_active: true,
      });
    }
  }, [etapa]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!isView) onSave?.(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isView ? "Ver etapa" : isEdit ? "Editar etapa" : "Nueva etapa"}
          </DialogTitle>
        </DialogHeader>

        {/* ✅ form controla submit y evita guardado automático */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 mt-4">
            {/* NOMBRE */}
            <div>
              <Label>Nombre</Label>
              <Input
                disabled={isView}
                value={form.nombre || ""}
                onChange={(e) => update("nombre", e.target.value)}
              />
            </div>

            {/* DESCRIPCIÓN */}
            <div>
              <Label>Descripción</Label>
              <Input
                disabled={isView}
                value={form.descripcion || ""}
                onChange={(e) => update("descripcion", e.target.value)}
              />
            </div>

            {/* TIPO */}
            <div>
              <Label>Tipo</Label>
              <Select
                disabled={isView}
                value={String(form.tipo)}
                onValueChange={(v) => update("tipo", Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>

                <SelectContent>
                  <SelectItem value="1">Planchado y Pintura</SelectItem>
                  <SelectItem value="2">Taller</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="mt-6">
            {/* ✅ importante: type="button" para que NO dispare submit */}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {isView ? "Cerrar" : "Cancelar"}
            </Button>

            {!isView && (
              <Button type="submit">
                Guardar
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}