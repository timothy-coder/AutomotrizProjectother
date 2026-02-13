"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const DAYS = [
  { key: "lunes", label: "Lunes" },
  { key: "martes", label: "Martes" },
  { key: "miercoles", label: "Miércoles" },
  { key: "jueves", label: "Jueves" },
  { key: "viernes", label: "Viernes" },
  { key: "sabado", label: "Sábado" },
  { key: "domingo", label: "Domingo" },
];

const emptyWeek = {
  lunes: { active: false, start: "", end: "" },
  martes: { active: false, start: "", end: "" },
  miercoles: { active: false, start: "", end: "" },
  jueves: { active: false, start: "", end: "" },
  viernes: { active: false, start: "", end: "" },
  sabado: { active: false, start: "", end: "" },
  domingo: { active: false, start: "", end: "" },
};

export default function HorariosCentroTab() {

  const { permissions } = useAuth();
  const permEdit = hasPermission(permissions || {}, "configuracion", "edit");

  const [centros, setCentros] = useState([]);
  const [centroId, setCentroId] = useState(null);
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [week, setWeek] = useState({ ...emptyWeek });
  const [loading, setLoading] = useState(false);

  // ✅ cargar centros
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

  // ✅ cargar configuración del centro
  useEffect(() => {
    if (!centroId) return;

    let cancelled = false;

    async function loadConfig() {
      try {
        setLoading(true);

        // ⚠️ aquí asumimos que creaste este endpoint:
        // GET /api/horacitas_centro/by-centro/[centroId]
        const r = await fetch(`/api/horacitas_centro/by-centro/${centroId}`, { cache: "no-store" });
        const data = await r.json();

        if (cancelled) return;

        if (!r.ok || !data) {
          setSlotMinutes(30);
          setWeek({ ...emptyWeek });
          return;
        }

        setSlotMinutes(Number(data.slot_minutes || 30));
        setWeek(data.week_json || { ...emptyWeek });

      } catch {
        if (!cancelled) toast.error("Error cargando horario");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadConfig();

    return () => { cancelled = true; };

  }, [centroId]);

  async function saveConfig() {
    if (!centroId) return toast.warning("Seleccione un centro");

    const slot = Number(slotMinutes);
    if (!Number.isFinite(slot) || slot < 5 || slot > 240) {
      return toast.warning("Slot debe estar entre 5 y 240");
    }

    try {
      setLoading(true);

      // Upsert por centro (recomendado)
      const r = await fetch(`/api/horacitas_centro/by-centro/${centroId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_minutes: slot,
          week_json: week,
        }),
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok) return toast.error(data.message || "No se pudo guardar");

      toast.success("Horario guardado");

    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>

      <CardHeader className="gap-2">
        <CardTitle className="text-base">Horario por Centro</CardTitle>

        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">

          <div className="grid gap-2 md:grid-cols-2 md:gap-3">

            <div className="space-y-1">
              <Label>Centro</Label>

              <Select
                disabled={!centros.length}
                value={centroId != null ? String(centroId) : ""}
                onValueChange={(v) => setCentroId(Number(v) || null)}
              >
                <SelectTrigger className="h-10 w-full rounded-md border bg-background px-3 text-sm">
                  <SelectValue placeholder={centros.length ? "Seleccione un centro" : "(Crea un centro primero)"} />
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

            <div className="space-y-1">
              <Label>Duración del slot (minutos)</Label>
              <Input
                type="number"
                value={String(slotMinutes)}
                onChange={(e) => setSlotMinutes(e.target.value)}
                min={5}
                max={240}
              />
              <p className="text-xs text-muted-foreground">
                Rango permitido: 5 a 240.
              </p>
            </div>

          </div>

          <div className="flex flex-wrap gap-2">

            <Button
              type="button"
              variant="outline"
              onClick={() =>
                setWeek({
                  lunes: { active: true, start: "08:00", end: "18:00" },
                  martes: { active: true, start: "08:00", end: "18:00" },
                  miercoles: { active: true, start: "08:00", end: "18:00" },
                  jueves: { active: true, start: "08:00", end: "18:00" },
                  viernes: { active: true, start: "08:00", end: "18:00" },
                  sabado: { active: false, start: "", end: "" },
                  domingo: { active: false, start: "", end: "" },
                })
              }
            >
              Set L-V 08:00–18:00
            </Button>

            <Button type="button" variant="outline" onClick={() => setWeek({ ...emptyWeek })}>
              Desactivar todos
            </Button>

            {permEdit ? (
              <Button onClick={saveConfig} disabled={loading || !centroId}>
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            ) : (
              <Button disabled>Sin permiso</Button>
            )}

          </div>

        </div>
      </CardHeader>

      <CardContent className="space-y-3">

        {loading ? (
          <p className="text-sm text-muted-foreground">Cargando...</p>
        ) : (
          <div className="grid gap-3">
            {DAYS.map(({ key, label }) => {

              const day = week[key] || { active: false, start: "", end: "" };

              return (
                <div key={key} className="rounded-md border p-3">

                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">

                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={!!day.active}
                        disabled={!permEdit}
                        onCheckedChange={(v) => {
                          const active = !!v;
                          setWeek((p) => ({
                            ...p,
                            [key]: {
                              ...(p[key] || { active: false, start: "", end: "" }),
                              active,
                              ...(active
                                ? (!p[key]?.start || !p[key]?.end)
                                  ? { start: "08:00", end: "18:00" }
                                  : {}
                                : { start: "", end: "" }),
                            },
                          }))
                        }}
                      />

                      <div className="font-medium">{label}</div>

                      <Badge variant={day.active ? "default" : "secondary"}>
                        {day.active ? "Activo" : "Inactivo"}
                      </Badge>
                    </div>

                    {day.active ? (
                      <div className="grid gap-2 md:grid-cols-2 md:gap-3 md:w-[380px]">

                        <div className="space-y-1">
                          <Label className="text-xs">Inicio</Label>
                          <Input
                            type="time"
                            value={day.start || ""}
                            disabled={!permEdit}
                            onChange={(e) =>
                              setWeek((p) => ({
                                ...p,
                                [key]: { ...(p[key] || day), start: e.target.value },
                              }))
                            }
                          />
                        </div>

                        <div className="space-y-1">
                          <Label className="text-xs">Fin</Label>
                          <Input
                            type="time"
                            value={day.end || ""}
                            disabled={!permEdit}
                            onChange={(e) =>
                              setWeek((p) => ({
                                ...p,
                                [key]: { ...(p[key] || day), end: e.target.value },
                              }))
                            }
                          />
                        </div>

                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground md:w-[380px]">
                        No atiende este día.
                      </p>
                    )}

                  </div>
                </div>
              );
            })}
          </div>
        )}

      </CardContent>

    </Card>
  );
}
