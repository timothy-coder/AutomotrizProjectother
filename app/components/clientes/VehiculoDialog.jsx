"use client";

import { useEffect, useState } from "react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";

import { Input } from "@/components/ui/input";

import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";

import { toast } from "sonner";

export default function VehiculoDialog({
  open,
  mode,
  vehiculo,
  onSave,
  onOpenChange
}) {

  const isEdit = mode === "edit";

  const [form, setForm] = useState({
    placas: "",
    vin: "",
    marca_id: "",
    modelo_id: "",
    anio: "",
    color: "",
    kilometraje: "",
    fecha_ultima_visita: ""
  });

  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);

  // ---------------- LOAD MARCAS ----------------

  useEffect(() => {
    fetch("/api/marcas")
      .then(r => r.json())
      .then(setMarcas)
      .catch(() => toast.error("Error cargando marcas"));
  }, []);

  // ---------------- LOAD MODELOS ----------------

  useEffect(() => {
    if (!form.marca_id) {
      setModelos([]);
      return;
    }

    fetch(`/api/modelos?marca_id=${form.marca_id}`)
      .then(r => r.json())
      .then(setModelos)
      .catch(() => toast.error("Error cargando modelos"));

  }, [form.marca_id]);

  // ---------------- RESET FORM ----------------

  useEffect(() => {

    if (!open) return;

    if (vehiculo) {

      setForm({
        placas: vehiculo.placas || "",
        vin: vehiculo.vin || "",
        marca_id: vehiculo.marca_id ? String(vehiculo.marca_id) : "",
        modelo_id: vehiculo.modelo_id ? String(vehiculo.modelo_id) : "",
        anio: vehiculo.anio || "",
        color: vehiculo.color || "",
        kilometraje: vehiculo.kilometraje || "",
        fecha_ultima_visita: vehiculo.fecha_ultima_visita?.slice?.(0, 10) || ""
      });

    } else {

      setForm({
        placas: "",
        vin: "",
        marca_id: "",
        modelo_id: "",
        anio: "",
        color: "",
        kilometraje: "",
        fecha_ultima_visita: ""
      });
    }

  }, [vehiculo, open]);

  // ---------------- UPDATE FIELD ----------------

  function update(k, v) {
    setForm(p => ({ ...p, [k]: v }));
  }

  // ---------------- SAVE ----------------

  function handleSave() {

    if (!form.placas && !form.vin) {
      return toast.warning("Ingrese placas o VIN");
    }

    onSave?.({
      placas: form.placas?.trim() || null,
      vin: form.vin?.trim() || null,
      marca_id: form.marca_id ? Number(form.marca_id) : null,
      modelo_id: form.modelo_id ? Number(form.modelo_id) : null,
      anio: form.anio ? Number(form.anio) : null,
      color: form.color?.trim() || null,
      kilometraje: form.kilometraje ? Number(form.kilometraje) : null,
      fecha_ultima_visita: form.fecha_ultima_visita?.trim() || null
    });
  }

  // ---------------- UI ----------------

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">

        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Vehículo" : "Nuevo Vehículo"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">

          <Input
            placeholder="Placas"
            value={form.placas}
            onChange={e => update("placas", e.target.value)}
          />

          <Input
            placeholder="VIN"
            value={form.vin}
            onChange={e => update("vin", e.target.value)}
          />

          {/* MARCA */}
          <Select
            value={form.marca_id}
            onValueChange={(v) => {
              update("marca_id", v);
              update("modelo_id", "");
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Marca" />
            </SelectTrigger>

            <SelectContent>
              {marcas.map(m => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* MODELO */}
          <Select
            value={form.modelo_id}
            onValueChange={(v) => update("modelo_id", v)}
            disabled={!form.marca_id}
          >
            <SelectTrigger>
              <SelectValue placeholder="Modelo" />
            </SelectTrigger>

            <SelectContent>
              {modelos.map(m => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="number"
            placeholder="Año"
            value={form.anio}
            onChange={e => update("anio", e.target.value)}
          />

          <Input
            placeholder="Color"
            value={form.color}
            onChange={e => update("color", e.target.value)}
          />

          <Input
            type="number"
            placeholder="Kilometraje"
            value={form.kilometraje}
            onChange={e => update("kilometraje", e.target.value)}
          />

          <div className="space-y-1">
            <label className="text-sm text-muted-foreground">Fecha de última visita al taller</label>
            <Input
              type="date"
              value={form.fecha_ultima_visita}
              onChange={e => update("fecha_ultima_visita", e.target.value)}
            />
          </div>

        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>

          <Button onClick={handleSave}>
            Guardar
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
