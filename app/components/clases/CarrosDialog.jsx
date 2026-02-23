"use client";

import { useEffect, useMemo, useState } from "react";

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
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

export default function CarrosDialog({
  open,
  onOpenChange,
  mode, // "create" | "edit" | "view"
  carro, // objeto a editar/ver (opcional)
  marcas = [],
  modelos = [],
  defaultClaseId = "",
  onSave,
}) {
  const isEdit = mode === "edit";
  const isView = mode === "view";

  const marcasSorted = useMemo(() => {
    return [...(marcas || [])].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }, [marcas]);

  const [form, setForm] = useState({
    marca_id: "",
    modelo_id: "",
    year: "",
    version: "",
    clase_id: defaultClaseId ? String(defaultClaseId) : "",
  });

  const modelosByMarca = useMemo(() => {
    const marcaId = Number(form.marca_id || 0);
    return (modelos || [])
      .filter((m) => Number(m.marca_id) === marcaId)
      .sort((a, b) => (a.name || "").localeCompare(b.name || ""));
  }, [modelos, form.marca_id]);

  useEffect(() => {
    if (carro) {
      setForm({
        id: carro.id,
        marca_id: carro.marca_id != null ? String(carro.marca_id) : "",
        modelo_id: carro.modelo_id != null ? String(carro.modelo_id) : "",
        year: carro.year != null ? String(carro.year) : "",
        version: carro.version || "",
        clase_id:
          carro.clase_id != null
            ? String(carro.clase_id)
            : defaultClaseId
            ? String(defaultClaseId)
            : "",
      });
    } else {
      setForm({
        marca_id: "",
        modelo_id: "",
        year: "",
        version: "",
        clase_id: defaultClaseId ? String(defaultClaseId) : "",
      });
    }
  }, [carro, defaultClaseId]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function onChangeMarca(v) {
    setForm((f) => ({ ...f, marca_id: v, modelo_id: "" }));
  }

  function save() {
    if (isView) return;

    const payload = {
      ...form,
      marca_id: Number(form.marca_id),
      modelo_id: Number(form.modelo_id),
      clase_id: Number(form.clase_id),
      year: form.year === "" ? null : Number(form.year),
      version: (form.version || "").trim() || null,
    };

    onSave?.(payload);
  }

  const canSave =
    !!form.clase_id &&
    !!form.marca_id &&
    !!form.modelo_id &&
    String(form.year || "").trim() !== "" &&
    !Number.isNaN(Number(form.year));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isView ? "Ver carro" : isEdit ? "Editar carro" : "Nuevo carro"}
          </DialogTitle>
          <DialogDescription>
            Selecciona marca/modelo y completa año/versión.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label>Marca</Label>
            <Select
              value={String(form.marca_id || "")}
              onValueChange={onChangeMarca}
              disabled={isView}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione" />
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
            <Label>Modelo</Label>
            <Select
              value={String(form.modelo_id || "")}
              onValueChange={(v) => update("modelo_id", v)}
              disabled={isView || !form.marca_id}
            >
              <SelectTrigger>
                <SelectValue
                  placeholder={
                    !form.marca_id ? "Primero seleccione marca" : "Seleccione"
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {modelosByMarca.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Año</Label>
            <Input
              type="number"
              value={form.year || ""}
              onChange={(e) => update("year", e.target.value)}
              disabled={isView}
              placeholder="Ej: 2020"
            />
          </div>

          <div>
            <Label>Versión</Label>
            <Input
              value={form.version || ""}
              onChange={(e) => update("version", e.target.value)}
              disabled={isView}
              placeholder="Ej: Full / Base / Sport..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isView ? "Cerrar" : "Cancelar"}
          </Button>

          {!isView && (
            <Button onClick={save} disabled={!canSave}>
              Guardar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}