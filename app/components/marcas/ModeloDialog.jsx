"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

export default function ModeloDialog({
  open,
  onOpenChange,
  mode,
  modelo,
  marcas = [],
  defaultMarcaId,
  onSave,
}) {
  const isEdit = mode === "edit";

  const marcasSorted = useMemo(() => {
    return [...(marcas || [])].sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [marcas]);

  const [form, setForm] = useState({
    name: "",
    marca_id: defaultMarcaId || "",
  });

  useEffect(() => {
    if (modelo) {
      setForm({
        id: modelo.id,
        name: modelo.name || "",
        marca_id: Number(modelo.marca_id) || defaultMarcaId || "",
      });
    } else {
      setForm({
        name: "",
        marca_id: defaultMarcaId || "",
      });
    }
  }, [modelo, defaultMarcaId]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function save() {
    onSave?.({
      ...form,
      marca_id: Number(form.marca_id),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar modelo" : "Nuevo modelo"}</DialogTitle>
          <DialogDescription>
            Selecciona la marca y escribe el nombre.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label>Marca</Label>
            <Select
              value={String(form.marca_id || "")}
              onValueChange={(v) => update("marca_id", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar marca" />
              </SelectTrigger>
              <SelectContent>
                {marcasSorted.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Nombre del modelo</Label>
            <Input
              value={form.name || ""}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={!form.marca_id || !form.name}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
