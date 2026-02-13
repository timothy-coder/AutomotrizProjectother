"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";

import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";

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
  const permEdit = hasPermission(permissions, "configuracion", "edit");

  const [centros, setCentros] = useState([]);
  const [centroId, setCentroId] = useState(null);
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [week, setWeek] = useState({ ...emptyWeek });
  const [loading, setLoading] = useState(false);

  // ================= LOAD CENTROS
  useEffect(() => {
    fetch("/api/centros")
      .then(r => r.json())
      .then(setCentros);
  }, []);

  // ================= LOAD CONFIG CENTRO
  useEffect(() => {

    if (!centroId) return;

    setLoading(true);

    fetch(`/api/horacitas_centro/${centroId}`)
      .then(r => r.json())
      .then(data => {

        if (!data) {
          setSlotMinutes(30);
          setWeek({ ...emptyWeek });
          return;
        }

        setSlotMinutes(data.slot_minutes || 30);
        setWeek(data.week_json || emptyWeek);
      })
      .finally(() => setLoading(false));

  }, [centroId]);

  // ================= SAVE CONFIG
  async function saveConfig() {

    try {

      await fetch("/api/horacitas_centro", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          centro_id: centroId,
          slot_minutes: Number(slotMinutes),
          week_json: week
        })
      });

      toast.success("Horario guardado");

    } catch {
      toast.error("Error al guardar");
    }
  }

  return (
    <Card>

      <CardHeader className="gap-2">

        <CardTitle className="text-base">
          Horario por Centro
        </CardTitle>

        <div className="flex flex-col gap-2 md:flex-row md:justify-between">

          {/* SELECT CENTRO */}
          <div className="grid md:grid-cols-2 gap-3">

            <div className="space-y-1">

              <Label>Centro</Label>

              <Select
                value={centroId ? String(centroId) : ""}
                onValueChange={(v) => setCentroId(Number(v))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione centro" />
                </SelectTrigger>

                <SelectContent>
                  {centros.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

            </div>

            <div className="space-y-1">

              <Label>Duración slot (min)</Label>

              <Input
                type="number"
                min={5}
                max={240}
                value={slotMinutes}
                onChange={(e) => setSlotMinutes(e.target.value)}
              />

            </div>

          </div>

          {/* BOTONES */}
          <div className="flex gap-2">

            <Button
              variant="outline"
              onClick={() => {

                setWeek({
                  lunes: { active: true, start: "08:00", end: "18:00" },
                  martes: { active: true, start: "08:00", end: "18:00" },
                  miercoles: { active: true, start: "08:00", end: "18:00" },
                  jueves: { active: true, start: "08:00", end: "18:00" },
                  viernes: { active: true, start: "08:00", end: "18:00" },
                  sabado: { active: false, start: "", end: "" },
                  domingo: { active: false, start: "", end: "" },
                })

              }}
            >
              Set L-V
            </Button>

            <Button
              variant="outline"
              onClick={() => setWeek({ ...emptyWeek })}
            >
              Desactivar
            </Button>

            {permEdit ? (
              <Button onClick={saveConfig}>
                Guardar
              </Button>
            ) : (
              <Button disabled>
                Sin permiso
              </Button>
            )}

          </div>

        </div>

      </CardHeader>

      {/* ================= BODY */}
      <CardContent className="space-y-3">

        {loading ? (
          <p>Cargando...</p>
        ) : (

          <div className="grid gap-3">

            {DAYS.map(({ key, label }) => {

              const day = week[key] || { active: false, start: "", end: "" };

              return (
                <div key={key} className="border rounded-md p-3">

                  <div className="flex flex-col md:flex-row md:justify-between gap-3">

                    {/* HEADER DIA */}
                    <div className="flex items-center gap-2">

                      <Checkbox
                        checked={day.active}
                        disabled={!permEdit}
                        onCheckedChange={(v) => {

                          const active = !!v;

                          setWeek(p => ({
                            ...p,
                            [key]: {
                              ...p[key],
                              active,
                              ...(active ? { start: "08:00", end: "18:00" } : { start: "", end: "" })
                            }
                          }))

                        }}
                      />

                      <div className="font-medium">{label}</div>

                      <Badge variant={day.active ? "default" : "secondary"}>
                        {day.active ? "Activo" : "Inactivo"}
                      </Badge>

                    </div>

                    {/* HORAS */}
                    {day.active ? (

                      <div className="grid md:grid-cols-2 gap-3 md:w-[350px]">

                        <Input
                          type="time"
                          value={day.start}
                          disabled={!permEdit}
                          onChange={(e) =>
                            setWeek(p => ({
                              ...p,
                              [key]: { ...p[key], start: e.target.value }
                            }))
                          }
                        />

                        <Input
                          type="time"
                          value={day.end}
                          disabled={!permEdit}
                          onChange={(e) =>
                            setWeek(p => ({
                              ...p,
                              [key]: { ...p[key], end: e.target.value }
                            }))
                          }
                        />

                      </div>

                    ) : (
                      <p className="text-muted-foreground">
                        No atiende este día
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
