"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";

export default function TalleresMostradoresTab() {

  const [centros, setCentros] = useState([]);
  const [centroId, setCentroId] = useState("");

  const [tallerNombre, setTallerNombre] = useState("");
  const [mostradorNombre, setMostradorNombre] = useState("");

  useEffect(() => {
    async function loadCentros() {
      try {
        const r = await fetch("/api/centros", { cache: "no-store" });
        const data = await r.json();
        setCentros(Array.isArray(data) ? data : []);
      } catch {
        toast.error("Error cargando centros");
      }
    }
    loadCentros();
  }, []);

  async function crearTaller() {
    if (!centroId) return toast.warning("Seleccione un centro");
    if (!tallerNombre.trim()) return toast.warning("Ingrese nombre de taller");

    try {
      const r = await fetch("/api/talleres", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centro_id: Number(centroId), nombre: tallerNombre.trim() }),
      });

      if (!r.ok) return toast.error("No se pudo crear taller");

      toast.success("Taller creado");
      setTallerNombre("");

    } catch {
      toast.error("Error de conexión");
    }
  }

  async function crearMostrador() {
    if (!centroId) return toast.warning("Seleccione un centro");
    if (!mostradorNombre.trim()) return toast.warning("Ingrese nombre de mostrador");

    try {
      const r = await fetch("/api/mostradores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ centro_id: Number(centroId), nombre: mostradorNombre.trim() }),
      });

      if (!r.ok) return toast.error("No se pudo crear mostrador");

      toast.success("Mostrador creado");
      setMostradorNombre("");

    } catch {
      toast.error("Error de conexión");
    }
  }

  return (
    <div className="space-y-4">

      <div className="space-y-1">
        <Label>Centro</Label>
        <Select value={centroId} onValueChange={setCentroId}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccione centro" />
          </SelectTrigger>
          <SelectContent>
            {centros.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid md:grid-cols-2 gap-4">

        <div className="space-y-2 rounded-md border p-4">
          <Label>Crear Taller</Label>
          <Input
            placeholder="Nombre taller"
            value={tallerNombre}
            onChange={(e) => setTallerNombre(e.target.value)}
          />
          <Button onClick={crearTaller}>Crear Taller</Button>
        </div>

        <div className="space-y-2 rounded-md border p-4">
          <Label>Crear Mostrador</Label>
          <Input
            placeholder="Nombre mostrador"
            value={mostradorNombre}
            onChange={(e) => setMostradorNombre(e.target.value)}
          />
          <Button onClick={crearMostrador}>Crear Mostrador</Button>
        </div>

      </div>

    </div>
  );
}
