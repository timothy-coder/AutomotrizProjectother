"use client";

import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";

export default function TipoActividadDialog({
  open,
  onOpenChange,
  mode,
  item,
  onSave,
}) {

  const isView = mode === "view";
  const isEdit = mode === "edit";

  const [form, setForm] = useState({
    name: "",
    tipo: 1,
    is_active: true,
  });

  useEffect(() => {
    if (item) {
      setForm({
        id: item.id,
        name: item.name || "",
        tipo: Number(item.tipo) || 1,
        is_active: item.is_active ?? true,
      });
    }
  }, [item]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>

        <DialogHeader>
          <DialogTitle>
            {isView ? "Ver" : isEdit ? "Editar" : "Nuevo"} tipo actividad
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 mt-4">

          <div>
            <Label>Nombre</Label>
            <Input
              disabled={isView}
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>

          <div>
            <Label>Tipo</Label>
            <Select
              disabled={isView}
              value={String(form.tipo)}
              onValueChange={(v) => update("tipo", Number(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="1">Planchado y Pintura</SelectItem>
                <SelectItem value="2">Taller</SelectItem>
              </SelectContent>
            </Select>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isView ? "Cerrar" : "Cancelar"}
          </Button>

          {!isView && (
            <Button onClick={() => onSave(form)}>
              Guardar
            </Button>
          )}
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
