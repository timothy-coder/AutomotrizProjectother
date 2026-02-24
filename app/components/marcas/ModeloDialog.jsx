"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem
} from "@/components/ui/select";

const NONE_VALUE = "__none__";

function normalizeAniosToText(anios) {
  if (anios == null) return "";
  if (typeof anios === "string") {
    try { return normalizeAniosToText(JSON.parse(anios)); } catch { return ""; }
  }
  if (typeof anios === "number") return String(anios);
  if (Array.isArray(anios)) return anios.join(",");
  if (typeof anios === "object") return JSON.stringify(anios);
  return "";
}

function parseAniosInput(value) {
  const v = (value || "").trim();
  if (!v) return null;

  const parts = v.split(",").map((x) => x.trim()).filter(Boolean);
  const years = parts.map((x) => Number(x)).filter((n) => Number.isFinite(n));

  if (years.length === 0) return null;
  if (years.length === 1) return years[0];
  return years;
}

export default function ModeloDialog({
  open,
  onOpenChange,
  mode, // "create" | "edit"
  modelo,
  marcas = [],
  clases = [],
  defaultMarcaId,
  defaultClaseId,
  onSave,
}) {
  const isEdit = mode === "edit";

  const marcasSorted = useMemo(() => {
    return [...(marcas || [])].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }, [marcas]);

  const clasesSorted = useMemo(() => {
    return [...(clases || [])].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }, [clases]);

  const [form, setForm] = useState({
    name: "",
    marca_id: defaultMarcaId || "",
    clase_id: defaultClaseId ? String(defaultClaseId) : NONE_VALUE,
    anios_text: "",
  });

  useEffect(() => {
    if (modelo) {
      setForm({
        id: modelo.id,
        name: modelo.name || "",
        marca_id: Number(modelo.marca_id) || defaultMarcaId || "",
        clase_id:
          modelo.clase_id != null
            ? String(modelo.clase_id)
            : (defaultClaseId ? String(defaultClaseId) : NONE_VALUE),
        anios_text: normalizeAniosToText(modelo.anios),
      });
    } else {
      setForm({
        name: "",
        marca_id: defaultMarcaId || "",
        clase_id: defaultClaseId ? String(defaultClaseId) : NONE_VALUE,
        anios_text: "",
      });
    }
  }, [modelo, defaultMarcaId, defaultClaseId]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    e.stopPropagation();

    const claseValue = form.clase_id === NONE_VALUE ? null : Number(form.clase_id);

    onSave?.({
      id: form.id,
      name: (form.name || "").trim(),
      marca_id: Number(form.marca_id),
      clase_id: claseValue,
      anios: parseAniosInput(form.anios_text),
    });
  }

  const canSave = !!form.marca_id && String(form.name || "").trim() !== "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Editar modelo" : "Nuevo modelo"}</DialogTitle>
          <DialogDescription>
            Selecciona marca/clase, escribe el nombre y (opcional) años.
          </DialogDescription>
        </DialogHeader>

        {/* ✅ Enter = Guardar */}
        <form onSubmit={handleSubmit}>
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
              <Label>Clase</Label>
              <Select
                value={String(form.clase_id)}
                onValueChange={(v) => update("clase_id", v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar clase (opcional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE_VALUE}>Sin clase</SelectItem>
                  {clasesSorted.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.name}
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

            <div>
              <Label>Años</Label>
              <Input
                value={form.anios_text || ""}
                onChange={(e) => update("anios_text", e.target.value)}
                placeholder="Ej: 2020,2021,2022"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Puedes escribir años separados por coma.
              </p>
            </div>
          </div>

          <DialogFooter className="mt-6">
            {/* ✅ no submit */}
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>

            <Button type="submit" disabled={!canSave}>
              Guardar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}