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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Clock,
  Calendar,
  Settings,
  Save,
  RotateCcw,
  AlertCircle,
  Check,
  X,
} from "lucide-react";

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

export default function AgendaCentroTab() {
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

  // ✅ seleccionar primer centro automáticamente
  useEffect(() => {
    if (!centros.length) return;

    setCentroId((prev) => {
      if (prev != null) return prev;
      return centros[0].id;
    });
  }, [centros]);

  // ✅ cargar configuración del centro
  useEffect(() => {
    if (!centroId) return;

    let cancelled = false;

    async function loadConfig() {
      try {
        setLoading(true);

        const r = await fetch(`/api/agendacitas_centro/by-centro/${centroId}`, {
          cache: "no-store",
        });
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

    return () => {
      cancelled = true;
    };
  }, [centroId]);

  async function saveConfig() {
    if (!centroId) return toast.warning("Seleccione un centro");

    const slot = Number(slotMinutes);
    if (!Number.isFinite(slot) || slot < 5 || slot > 240) {
      return toast.warning("Slot debe estar entre 5 y 240");
    }

    try {
      setLoading(true);

      const r = await fetch(`/api/agendacitas_centro/by-centro/${centroId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slot_minutes: slot,
          week_json: week,
        }),
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok) return toast.error(data.message || "No se pudo guardar");

      toast.success("Horario guardado correctamente");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  // Calcular horas totales por semana
  const totalHours = Object.values(week).reduce((sum, day) => {
    if (!day.active || !day.start || !day.end) return sum;
    const [startH, startM] = day.start.split(":").map(Number);
    const [endH, endM] = day.end.split(":").map(Number);
    const hours = (endH + endM / 60) - (startH + startM / 60);
    return sum + (hours > 0 ? hours : 0);
  }, 0);

  const activeDays = Object.values(week).filter((d) => d.active).length;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* HEADER */}
        <div className="border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Horario de Atención</h2>
              <p className="text-sm text-slate-500 mt-1">
                Configura los horarios disponibles para citas por centro
              </p>
            </div>
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex flex-col gap-4">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Configuración General
              </CardTitle>

              <div className="grid gap-4 md:grid-cols-3 md:gap-6">
                {/* Centro */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="font-semibold text-slate-700">Centro de Atención</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>Selecciona el centro para el cual deseas configurar el horario</TooltipContent>
                    </Tooltip>
                  </div>

                  <Select
                    disabled={!centros.length}
                    value={centroId != null ? String(centroId) : ""}
                    onValueChange={(v) => setCentroId(Number(v) || null)}
                  >
                    <SelectTrigger className="h-10 border-slate-300 focus:border-blue-500">
                      <SelectValue
                        placeholder={
                          centros.length ? "Seleccione un centro" : "(Crea un centro primero)"
                        }
                      />
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

                {/* Slot Duration */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Label className="font-semibold text-slate-700">Duración del Slot</Label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <AlertCircle className="h-4 w-4 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Duración en minutos de cada cita. Rango permitido: 5 a 240 minutos
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={String(slotMinutes)}
                      onChange={(e) => setSlotMinutes(e.target.value)}
                      min={5}
                      max={240}
                      className="border-slate-300 focus:border-blue-500"
                    />
                    <span className="text-sm font-medium text-slate-500">min</span>
                  </div>
                  <p className="text-xs text-slate-500">5 - 240 minutos</p>
                </div>

                {/* Statistics */}
                <div className="space-y-2">
                  <Label className="font-semibold text-slate-700">Resumen</Label>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200">
                      <p className="text-xs text-blue-600 font-medium">Días Activos</p>
                      <p className="text-xl font-bold text-blue-900">{activeDays}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
                      <p className="text-xs text-purple-600 font-medium">Horas/Semana</p>
                      <p className="text-xl font-bold text-purple-900">{totalHours.toFixed(1)}h</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardHeader>

          {/* Quick Actions */}
          <CardContent className="pt-4 pb-4">
            <div className="flex flex-wrap gap-2 justify-end border-t border-slate-100 pt-4">
              <Tooltip>
                <TooltipTrigger asChild>
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
                    className="gap-2"
                  >
                    <Check className="h-4 w-4" />
                    L-V 08:00-18:00
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Establecer horario estándar de lunes a viernes</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setWeek({ ...emptyWeek })}
                    className="gap-2"
                  >
                    <X className="h-4 w-4" />
                    Desactivar todos
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Desactivar todos los días</TooltipContent>
              </Tooltip>

              {permEdit ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={saveConfig}
                      disabled={loading || !centroId}
                      className="gap-2 bg-blue-600 hover:bg-blue-700"
                    >
                      <Save className="h-4 w-4" />
                      {loading ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Guardar configuración de horarios</TooltipContent>
                </Tooltip>
              ) : (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button disabled className="gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Sin permiso
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>No tienes permisos para editar</TooltipContent>
                </Tooltip>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Horarios por día */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100">
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings className="h-5 w-5 text-blue-600" />
              Configuración por Día
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-2">
                  <div className="h-8 w-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin mx-auto"></div>
                  <p className="text-sm text-slate-500">Cargando horarios...</p>
                </div>
              </div>
            ) : (
              <div className="grid gap-3">
                {DAYS.map(({ key, label }) => {
                  const day = week[key] || { active: false, start: "", end: "" };
                  const isActive = !!day.active;

                  return (
                    <div
                      key={key}
                      className={`rounded-lg border-2 p-4 transition-all ${
                        isActive
                          ? "border-blue-200 bg-blue-50"
                          : "border-slate-200 bg-slate-50"
                      }`}
                    >
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        {/* Día y checkbox */}
                        <div className="flex items-center gap-3">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Checkbox
                                checked={isActive}
                                disabled={!permEdit}
                                onCheckedChange={(v) => {
                                  const active = !!v;
                                  setWeek((p) => ({
                                    ...p,
                                    [key]: {
                                      ...(p[key] || { active: false, start: "", end: "" }),
                                      active,
                                      ...(active
                                        ? !p[key]?.start || !p[key]?.end
                                          ? { start: "08:00", end: "18:00" }
                                          : {}
                                        : { start: "", end: "" }),
                                    },
                                  }))
                                }}
                              />
                            </TooltipTrigger>
                            <TooltipContent>
                              {isActive ? "Desactivar día" : "Activar día"}
                            </TooltipContent>
                          </Tooltip>

                          <div className="font-semibold text-slate-900 w-20">{label}</div>

                          <Badge
                            variant={isActive ? "default" : "secondary"}
                            className={`text-xs font-medium ${
                              isActive
                                ? "bg-blue-600 text-white"
                                : "bg-slate-200 text-slate-700"
                            }`}
                          >
                            {isActive ? "Activo" : "Inactivo"}
                          </Badge>
                        </div>

                        {/* Horarios */}
                        {isActive ? (
                          <div className="grid gap-2 md:grid-cols-2 md:gap-3 md:w-[360px]">
                            <div className="space-y-1.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Label className="text-xs font-semibold text-slate-600 cursor-help">
                                    Hora Inicio
                                  </Label>
                                </TooltipTrigger>
                                <TooltipContent>Hora de apertura</TooltipContent>
                              </Tooltip>
                              <Input
                                type="time"
                                value={day.start || ""}
                                disabled={!permEdit}
                                onChange={(e) =>
                                  setWeek((p) => ({
                                    ...p,
                                    [key]: {
                                      ...(p[key] || day),
                                      start: e.target.value,
                                    },
                                  }))
                                }
                                className="border-slate-300 focus:border-blue-500"
                              />
                            </div>

                            <div className="space-y-1.5">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Label className="text-xs font-semibold text-slate-600 cursor-help">
                                    Hora Fin
                                  </Label>
                                </TooltipTrigger>
                                <TooltipContent>Hora de cierre</TooltipContent>
                              </Tooltip>
                              <Input
                                type="time"
                                value={day.end || ""}
                                disabled={!permEdit}
                                onChange={(e) =>
                                  setWeek((p) => ({
                                    ...p,
                                    [key]: {
                                      ...(p[key] || day),
                                      end: e.target.value,
                                    },
                                  }))
                                }
                                className="border-slate-300 focus:border-blue-500"
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm text-slate-500 md:w-[360px] italic">
                            Centro cerrado este día
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

        {/* Info */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Información importante:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>El slot de duración debe estar entre 5 y 240 minutos</li>
                <li>Los cambios se guardarán automáticamente por centro</li>
                <li>Solo los días activos estarán disponibles para citas</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}