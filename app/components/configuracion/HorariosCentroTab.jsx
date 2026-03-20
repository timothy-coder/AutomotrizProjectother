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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Clock,
  Loader2,
  Info,
  AlertCircle,
  CheckCircle,
  Building2,
  Timer,
  RotateCw,
  Save,
  ArrowRight,
  X,
  CheckSquare,
  Square,
} from "lucide-react";

const DAYS = [
  { key: "lunes", label: "Lunes", icon: Clock },
  { key: "martes", label: "Martes", icon: Clock },
  { key: "miercoles", label: "Miércoles", icon: Clock },
  { key: "jueves", label: "Jueves", icon: Clock },
  { key: "viernes", label: "Viernes", icon: Clock },
  { key: "sabado", label: "Sábado", icon: AlertCircle },
  { key: "domingo", label: "Domingo", icon: AlertCircle },
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

        const r = await fetch(
          `/api/horacitas_centro/by-centro/${centroId}`,
          { cache: "no-store" }
        );
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

      const r = await fetch(
        `/api/horacitas_centro/by-centro/${centroId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            slot_minutes: slot,
            week_json: week,
          }),
        }
      );

      const data = await r.json().catch(() => ({}));

      if (!r.ok) return toast.error(data.message || "No se pudo guardar");

      toast.success("Horario guardado correctamente");
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  const activeDays = Object.values(week).filter((d) => d.active).length;

  return (
    <TooltipProvider>
      <Card className="border-l-4 border-l-blue-500 shadow-lg">
        {/* HEADER */}
        <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b space-y-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-lg shadow-md">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-gray-900">
                Horarios por Centro
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                Configura los horarios de atención para cada centro
              </p>
            </div>
          </div>

          {/* CONTROLES PRINCIPALES */}
          <div className="grid gap-4 md:grid-cols-2 md:gap-6">
            {/* Selector de Centro */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-600" />
                  Centro
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Selecciona el centro para configurar sus horarios
                  </TooltipContent>
                </Tooltip>
              </div>

              <Select
                disabled={!centros.length || loading}
                value={centroId != null ? String(centroId) : ""}
                onValueChange={(v) => setCentroId(Number(v) || null)}
              >
                <SelectTrigger className="h-10 w-full rounded-md border-gray-300 bg-white focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue
                    placeholder={
                      centros.length
                        ? "Seleccione un centro"
                        : "(Crea un centro primero)"
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

            {/* Duración del Slot */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700 flex items-center gap-2">
                  <Timer className="h-4 w-4 text-blue-600" />
                  Duración del Slot
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    Duración en minutos de cada cita (5-240 minutos)
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
                  disabled={!permEdit || loading}
                  className="h-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                  minutos
                </span>
              </div>
              <p className="text-xs text-gray-600">
                Rango permitido: <span className="font-semibold">5 - 240</span>
              </p>
            </div>
          </div>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex flex-wrap gap-2 pt-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    setWeek({
                      lunes: { active: true, start: "08:00", end: "18:00" },
                      martes: { active: true, start: "08:00", end: "18:00" },
                      miercoles: {
                        active: true,
                        start: "08:00",
                        end: "18:00",
                      },
                      jueves: { active: true, start: "08:00", end: "18:00" },
                      viernes: { active: true, start: "08:00", end: "18:00" },
                      sabado: { active: false, start: "", end: "" },
                      domingo: { active: false, start: "", end: "" },
                    })
                  }
                  disabled={!permEdit || loading}
                  className="border-blue-300 text-blue-700 hover:bg-blue-50"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  L-V 08:00-18:00
                </Button>
              </TooltipTrigger>
              <TooltipContent>Configura horario estándar Lunes-Viernes</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setWeek({ ...emptyWeek })}
                  disabled={!permEdit || loading}
                  className="border-red-300 text-red-700 hover:bg-red-50"
                >
                  <X className="h-4 w-4 mr-2" />
                  Desactivar todos
                </Button>
              </TooltipTrigger>
              <TooltipContent>Desactiva todos los días de la semana</TooltipContent>
            </Tooltip>

            {permEdit ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={saveConfig}
                    disabled={loading || !centroId}
                    className="bg-blue-600 hover:bg-blue-700 text-white ml-auto"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-2" />
                        Guardar
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  Guardar cambios de horario para este centro
                </TooltipContent>
              </Tooltip>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button disabled className="ml-auto">
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Sin permiso
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  No tienes permisos para editar configuración
                </TooltipContent>
              </Tooltip>
            )}
          </div>

          {/* INFO DE DÍAS ACTIVOS */}
          {activeDays > 0 && (
            <div className="flex items-center gap-2 p-3 bg-blue-100 border border-blue-300 rounded-lg">
              <CheckCircle className="h-5 w-5 text-blue-600 flex-shrink-0" />
              <span className="text-sm font-medium text-blue-900">
                {activeDays} día{activeDays !== 1 ? "s" : ""} configurado
                {activeDays !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </CardHeader>

        {/* CONTENIDO - DÍAS */}
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="text-sm text-gray-600">Cargando horarios...</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {DAYS.map(({ key, label, icon: IconComponent }) => {
                const day = week[key] || { active: false, start: "", end: "" };
                const isWeekend = key === "sabado" || key === "domingo";

                return (
                  <div
                    key={key}
                    className={`rounded-lg border-2 p-4 transition-all ${
                      day.active
                        ? "border-blue-300 bg-blue-50 shadow-sm"
                        : isWeekend
                          ? "border-orange-200 bg-orange-50"
                          : "border-gray-200 bg-white"
                    }`}
                  >
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      {/* ENCABEZADO DÍA */}
                      <div className="flex items-center gap-3 min-w-[220px]">
                        <Checkbox
                          checked={!!day.active}
                          disabled={!permEdit || loading}
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
                            }));
                          }}
                          className="h-5 w-5 cursor-pointer"
                        />

                        <div className={`p-2 rounded-lg ${
                          day.active
                            ? "bg-blue-600 text-white"
                            : isWeekend
                              ? "bg-orange-400 text-white"
                              : "bg-gray-300 text-white"
                        }`}>
                          <IconComponent className="h-4 w-4" />
                        </div>

                        <div className="flex-1">
                          <div className="font-bold text-gray-900">{label}</div>
                          <Badge
                            variant="outline"
                            className={`mt-1 ${
                              day.active
                                ? "bg-green-100 text-green-700 border-green-300"
                                : isWeekend
                                  ? "bg-orange-100 text-orange-700 border-orange-300"
                                  : "bg-gray-100 text-gray-700 border-gray-300"
                            }`}
                          >
                            {day.active ? (
                              <>
                                <CheckCircle className="h-3 w-3 mr-1" />
                                Activo
                              </>
                            ) : (
                              <>
                                <X className="h-3 w-3 mr-1" />
                                Inactivo
                              </>
                            )}
                          </Badge>
                        </div>
                      </div>

                      {/* HORARIOS */}
                      {day.active ? (
                        <div className="flex items-end gap-2 md:gap-3 md:w-auto">
                          <div className="space-y-1 flex-1 md:flex-none">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Inicio
                                  <Info className="h-3 w-3 text-gray-400" />
                                </Label>
                              </TooltipTrigger>
                              <TooltipContent>
                                Hora de inicio de atención
                              </TooltipContent>
                            </Tooltip>
                            <Input
                              type="time"
                              value={day.start || ""}
                              disabled={!permEdit || loading}
                              onChange={(e) =>
                                setWeek((p) => ({
                                  ...p,
                                  [key]: {
                                    ...(p[key] || day),
                                    start: e.target.value,
                                  },
                                }))
                              }
                              className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500 font-mono text-center"
                            />
                          </div>

                          <div className="text-gray-400 pb-2 flex-shrink-0">
                            <ArrowRight className="h-5 w-5" />
                          </div>

                          <div className="space-y-1 flex-1 md:flex-none">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Label className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  Fin
                                  <Info className="h-3 w-3 text-gray-400" />
                                </Label>
                              </TooltipTrigger>
                              <TooltipContent>
                                Hora de cierre de atención
                              </TooltipContent>
                            </Tooltip>
                            <Input
                              type="time"
                              value={day.end || ""}
                              disabled={!permEdit || loading}
                              onChange={(e) =>
                                setWeek((p) => ({
                                  ...p,
                                  [key]: {
                                    ...(p[key] || day),
                                    end: e.target.value,
                                  },
                                }))
                              }
                              className="h-9 border-gray-300 focus:border-blue-500 focus:ring-blue-500 font-mono text-center"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 md:w-auto md:ml-auto text-gray-600">
                          <AlertCircle className="h-4 w-4 flex-shrink-0" />
                          <span className="text-sm italic">
                            No atiende este día
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* INFO BOX */}
          {!loading && centroId && (
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
              <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700 space-y-1">
                <p className="font-semibold">Información importante:</p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Cada slot de cita tendrá {slotMinutes} minutos de duración</li>
                  <li>Los días inactivos no permitirán programar citas</li>
                  <li>Los cambios se guardan para el centro seleccionado</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}