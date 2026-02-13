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
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

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
  });

  // cargar datos cuando edita
  useEffect(() => {
    if (!open) return;

    if (cliente) {
      setForm({
        nombre: cliente.nombre ?? "",
        apellido: cliente.apellido ?? "",
        email: cliente.email ?? "",
        celular: cliente.celular ?? "",
        tipo_identificacion: cliente.tipo_identificacion ?? "DNI",
        identificacion_fiscal: cliente.identificacion_fiscal ?? "",
        nombre_comercial: cliente.nombre_comercial ?? "",
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
      });
    }
  }, [open, cliente]);

  function updateField(key, value) {
    setForm((p) => ({ ...p, [key]: value }));
  }

  function handleSave() {
    if (!form.nombre.trim())
      return alert("Nombre requerido");

    if (!form.apellido.trim())
      return alert("Apellido requerido");

    onSave?.({
      nombre: form.nombre.trim(),
      apellido: form.apellido.trim(),
      email: form.email.trim() || null,
      celular: form.celular.trim() || null,
      tipo_identificacion: form.tipo_identificacion,
      identificacion_fiscal: form.identificacion_fiscal.trim() || null,
      nombre_comercial: form.nombre_comercial.trim() || null,
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">

        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Editar Cliente" : "Nuevo Cliente"}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[65vh] overflow-y-auto pr-2">

          {/* Nombre */}
          <div className="space-y-1">
            <Label>Nombre *</Label>
            <Input
              value={form.nombre}
              onChange={(e) => updateField("nombre", e.target.value)}
            />
          </div>

          {/* Apellido */}
          <div className="space-y-1">
            <Label>Apellido *</Label>
            <Input
              value={form.apellido}
              onChange={(e) => updateField("apellido", e.target.value)}
            />
          </div>

          {/* Email */}
          <div className="space-y-1">
            <Label>Email</Label>
            <Input
              type="email"
              value={form.email}
              onChange={(e) => updateField("email", e.target.value)}
            />
          </div>

          {/* Celular */}
          <div className="space-y-1">
            <Label>Celular</Label>
            <Input
              value={form.celular}
              onChange={(e) => updateField("celular", e.target.value)}
            />
          </div>

          {/* Tipo Identificación */}
          <div className="space-y-1">
            <Label>Tipo identificación</Label>

            <Select
              value={form.tipo_identificacion}
              onValueChange={(v) => updateField("tipo_identificacion", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="DNI">DNI</SelectItem>
                <SelectItem value="RUC">RUC</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Identificación Fiscal */}
          <div className="space-y-1">
            <Label>N° Documento</Label>
            <Input
              value={form.identificacion_fiscal}
              onChange={(e) => updateField("identificacion_fiscal", e.target.value)}
            />
          </div>

          {/* Nombre Comercial */}
          <div className="space-y-1 md:col-span-2">
            <Label>Nombre Comercial</Label>
            <Input
              value={form.nombre_comercial}
              onChange={(e) => updateField("nombre_comercial", e.target.value)}
            />
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
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
