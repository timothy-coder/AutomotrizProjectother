"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DayPicker } from "react-day-picker";
import { es } from "date-fns/locale";
import { 
  Building2,
  Clock,
  User,
  Calendar,
  Info,
  AlertCircle,
  CheckCircle,
  Loader
} from "lucide-react";
import "react-day-picker/dist/style.css";

export default function Paso3Horario({
  onChange,
  allowedCentros = [],
  allowedTalleres = [],
  initialValue = null,
}) {
  const [centros, setCentros] = useState([]);
  const [talleres, setTalleres] = useState([]);
  const [asesores, setAsesores] = useState([]);

  const [centroId, setCentroId] = useState(null);
  const [tallerId, setTallerId] = useState(null);
  const [asesorId, setAsesorId] = useState("any");

  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [slots, setSlots] = useState([]);

  const [horario, setHorario] = useState(null);
  const [loadingHorario, setLoadingHorario] = useState(false);
  const [loadingTalleres, setLoadingTalleres] = useState(false);

  const initialAppliedRef = useRef(false);

  const parseTime = (t) => {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const minutesToTime = (m) =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  const DAY_ES = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
  const DAY_EN = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

  function parseDateFromValue(value) {
    if (!value) return null;
    const normalized = String(value).replace(" ", "T");
    const d = new Date(normalized);
    return Number.isNaN(d.getTime()) ? null : d;
  }

  function parseHourMinute(value) {
    if (!value) return null;
    const d = parseDateFromValue(value);
    if (!d) return null;
    const hh = String(d.getHours()).padStart(2, "0");
    const mm = String(d.getMinutes()).padStart(2, "0");
    return `${hh}:${mm}`;
  }

  const allowedCentrosSet = useMemo(
    () => new Set((allowedCentros || []).map(Number)),
    [allowedCentros]
  );

  const allowedTalleresSet = useMemo(
    () => new Set((allowedTalleres || []).map(Number)),
    [allowedTalleres]
  );

  // cargar centros y filtrar por scope
  useEffect(() => {
    fetch("/api/centros", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];

        const filtrados =
          allowedCentrosSet.size > 0
            ? lista.filter((c) => allowedCentrosSet.has(Number(c.id)))
            : [];

        setCentros(filtrados);

        // si hay initialValue, priorizarlo
        if (
          initialValue?.centro_id &&
          filtrados.some((c) => Number(c.id) === Number(initialValue.centro_id))
        ) {
          setCentroId(Number(initialValue.centro_id));
          return;
        }

        setCentroId((prev) => {
          if (prev && filtrados.some((c) => Number(c.id) === Number(prev))) {
            return prev;
          }
          return filtrados.length > 0 ? Number(filtrados[0].id) : null;
        });
      })
      .catch((e) => {
        console.log(e);
        setCentros([]);
        setCentroId(null);
      });
  }, [allowedCentrosSet, initialValue?.centro_id]);

  // cargar talleres cuando cambia centro y filtrar por scope
  useEffect(() => {
    if (!centroId) {
      setTalleres([]);
      setTallerId(null);
      setDate(null);
      setSlot(null);
      setSlots([]);
      return;
    }

    setLoadingTalleres(true);
    setTalleres([]);
    setTallerId(null);
    setDate(null);
    setSlot(null);
    setSlots([]);

    fetch(`/api/talleres/bycentro?centro_id=${centroId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];

        const filtrados =
          allowedTalleresSet.size > 0
            ? lista.filter((t) => allowedTalleresSet.has(Number(t.id)))
            : [];

        setTalleres(filtrados);

        if (
          initialValue?.taller_id &&
          filtrados.some((t) => Number(t.id) === Number(initialValue.taller_id))
        ) {
          setTallerId(Number(initialValue.taller_id));
          setLoadingTalleres(false);
          return;
        }

        if (filtrados.length > 0) {
          setTallerId(Number(filtrados[0].id));
        } else {
          setTallerId(null);
        }

        setLoadingTalleres(false);
      })
      .catch((e) => {
        console.log(e);
        setTalleres([]);
        setTallerId(null);
        setLoadingTalleres(false);
      });
  }, [centroId, allowedTalleresSet, initialValue?.taller_id]);

  // cargar asesores
  useEffect(() => {
    fetch("/api/usuarios", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const validos = (Array.isArray(data) ? data : []).filter(
          (u) => u.is_active && u.work_schedule
        );
        setAsesores(validos);
      })
      .catch((e) => {
        console.log(e);
        setAsesores([]);
      });
  }, []);

  // cargar horario del centro
  useEffect(() => {
    if (!centroId) {
      setHorario(null);
      return;
    }

    setLoadingHorario(true);

    fetch(`/api/horacitas_centro/by-centro/${centroId}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        console.log("✅ Horario cargado:", data);
        setHorario(data);
        setLoadingHorario(false);
      })
      .catch((e) => {
        console.error("❌ Error cargando horario:", e);
        setHorario(null);
        setLoadingHorario(false);
      });
  }, [centroId]);

  const isDayDisabled = (day) => {
    if (!horario?.week_json) return true;

    const key = DAY_ES[day.getDay()];
    const cfg = horario.week_json[key];

    if (!cfg?.active) return true;

    const todayMid = new Date();
    todayMid.setHours(0, 0, 0, 0);

    return day < todayMid;
  };

  // aplicar initialValue una sola vez cuando ya exista data suficiente
  useEffect(() => {
    if (initialAppliedRef.current) return;
    if (!initialValue) return;
    if (!centroId || !tallerId) return;

    const initialDate = parseDateFromValue(initialValue.start);
    const initialStart = parseHourMinute(initialValue.start);
    const initialEnd = parseHourMinute(initialValue.end);

    if (initialValue.asesor_id) {
      setAsesorId(String(initialValue.asesor_id));
    } else {
      setAsesorId("any");
    }

    if (initialDate) {
      setDate(initialDate);
    }

    if (initialStart && initialEnd) {
      setSlot({
        start: initialStart,
        end: initialEnd,
      });
    }

    initialAppliedRef.current = true;
  }, [initialValue, centroId, tallerId]);

  // generar slots
  useEffect(() => {
    if (!date || !horario || !tallerId) {
      setSlots([]);
      return;
    }

    const key = DAY_ES[date.getDay()];
    const cfgCentro = horario.week_json?.[key];

    if (!cfgCentro?.active) {
      setSlots([]);
      return;
    }

    let start = parseTime(cfgCentro.start);
    let end = parseTime(cfgCentro.end);

    if (asesorId !== "any") {
      const asesor = asesores.find((a) => String(a.id) === asesorId);

      if (asesor?.work_schedule) {
        try {
          const schedule =
            typeof asesor.work_schedule === "string"
              ? JSON.parse(asesor.work_schedule)
              : asesor.work_schedule;

          const keyEn = DAY_EN[date.getDay()];
          const cfgAsesor = schedule?.[keyEn];

          if (!cfgAsesor) {
            setSlots([]);
            return;
          }

          const aStart = parseTime(cfgAsesor.start);
          const aEnd = parseTime(cfgAsesor.end);

          start = Math.max(start, aStart);
          end = Math.min(end, aEnd);
        } catch (e) {
          console.error("Error parseando horario asesor:", e);
          setSlots([]);
          return;
        }
      }
    }

    const arr = [];
    const now = new Date();

    for (let m = start; m < end; m += horario.slot_minutes) {
      const slotDate = new Date(date);
      slotDate.setHours(Math.floor(m / 60), m % 60, 0, 0);

      const isInitialSlot =
        initialValue &&
        parseDateFromValue(initialValue.start)?.toDateString() === date.toDateString() &&
        parseHourMinute(initialValue.start) === minutesToTime(m);

      if (slotDate < now && !isInitialSlot) continue;

      arr.push({
        start: minutesToTime(m),
        end: minutesToTime(m + horario.slot_minutes),
      });
    }

    console.log(`📅 Slots generados para ${date.toDateString()}:`, arr);
    setSlots(arr);
  }, [date, asesorId, horario, tallerId, asesores, initialValue]);

  // asegurar que el slot inicial exista en la lista si no entró por timing
  useEffect(() => {
    if (!initialValue || !date || !slot) return;

    const initialStart = parseHourMinute(initialValue.start);
    const alreadyExists = slots.some((s) => s.start === initialStart);

    if (!alreadyExists && initialStart === slot.start) {
      setSlots((prev) => {
        const next = [...prev, slot];
        next.sort((a, b) => a.start.localeCompare(b.start));
        return next;
      });
    }
  }, [slots, initialValue, date, slot]);

  // emitir selección final
  useEffect(() => {
    if (!slot || !date || !centroId || !tallerId) return;

    const day = date.toISOString().slice(0, 10);

    onChange({
      centro_id: centroId,
      taller_id: tallerId,
      asesor_id: asesorId === "any" ? null : Number(asesorId),
      start: `${day} ${slot.start}:00`,
      end: `${day} ${slot.end}:00`,
    });
  }, [slot, date, centroId, tallerId, asesorId, onChange]);

  // Determinar estado de completitud
  const isComplete = centroId && tallerId && date && slot;

  return (
    <TooltipProvider>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-purple-50 border-b">
          <div className="flex items-center gap-2">
            <Clock size={24} className="text-purple-600" />
            <div>
              <h2 className="font-semibold text-lg text-slate-900">Fecha y hora</h2>
              <p className="text-xs text-gray-600 mt-1">Paso 3 - Elige cuándo deseas agendar la cita</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">

          {/* FILTROS SUPERIORES */}
          <div className="space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              Selecciona ubicación y asesor
            </h3>

            <div className="grid md:grid-cols-3 gap-3">
              
              {/* CENTRO */}
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Building2 size={16} className="text-purple-600" />
                  <label className="text-sm font-semibold text-slate-900">Centro</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Selecciona el centro de servicio donde deseas la cita
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={centroId ? String(centroId) : ""}
                  onValueChange={(v) => {
                    initialAppliedRef.current = false;
                    setCentroId(Number(v));
                  }}
                  disabled={centros.length === 0}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                  <SelectContent>
                    {centros.length > 0 ? (
                      centros.map((c) => (
                        <SelectItem key={c.id} value={String(c.id)}>
                          {c.nombre || c.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__sin_centros" disabled>
                        No tienes centros asignados
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* TALLER */}
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <Building2 size={16} className="text-purple-600" />
                  <label className="text-sm font-semibold text-slate-900">Taller</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Selecciona el taller específico dentro del centro
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  key={`taller-${centroId || "none"}`}
                  value={tallerId ? String(tallerId) : ""}
                  onValueChange={(v) => {
                    initialAppliedRef.current = false;
                    setTallerId(Number(v));
                    setDate(null);
                    setSlot(null);
                    setSlots([]);
                  }}
                  disabled={!centroId || talleres.length === 0 || loadingTalleres}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue 
                      placeholder={loadingTalleres ? "Cargando talleres..." : "Seleccione"} 
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {talleres.length > 0 ? (
                      talleres.map((t) => (
                        <SelectItem key={t.id} value={String(t.id)}>
                          {t.nombre || t.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="__sin_taller" disabled>
                        {loadingTalleres ? "Cargando..." : "No tienes talleres asignados"}
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* ASESOR */}
              <div className="space-y-2">
                <div className="flex items-center gap-1">
                  <User size={16} className="text-purple-600" />
                  <label className="text-sm font-semibold text-slate-900">Asesor</label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info size={14} className="text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Selecciona un asesor específico o "Cualquier asesor" disponible
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Select
                  value={asesorId}
                  onValueChange={(v) => {
                    initialAppliedRef.current = false;
                    setAsesorId(v);
                    setSlot(null);
                  }}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Cualquier asesor</SelectItem>
                    {asesores.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.fullname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* CALENDARIO Y HORARIOS */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              Selecciona fecha y hora
            </h3>

            {!centroId || !tallerId ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
                <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  Selecciona primero el centro y taller para ver horarios disponibles
                </p>
              </div>
            ) : loadingHorario ? (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
                <Loader size={16} className="text-blue-600 flex-shrink-0 mt-0.5 animate-spin" />
                <p className="text-sm text-blue-700">
                  Cargando horarios disponibles...
                </p>
              </div>
            ) : !horario || !horario.week_json ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-amber-700">
                  No se encontró horario configurado para el centro seleccionado
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-6">
                
                {/* CALENDARIO */}
                <div className="border rounded-xl p-4 shadow-sm bg-white">
                  <div className="mb-4 text-sm font-semibold text-slate-900 flex items-center gap-1">
                    <Calendar size={16} className="text-purple-600" />
                    Selecciona una fecha
                  </div>
                  <DayPicker
                    mode="single"
                    selected={date}
                    onSelect={(d) => {
                      initialAppliedRef.current = false;
                      setDate(d);
                      setSlot(null);
                    }}
                    locale={es}
                    fromDate={new Date()}
                    disabled={isDayDisabled}
                    className="mx-auto"
                  />
                </div>

                {/* HORAS */}
                <div className="space-y-4">
                  <div className="text-sm font-semibold text-slate-900 flex items-center gap-1">
                    <Clock size={16} className="text-purple-600" />
                    Horarios disponibles
                  </div>

                  {date && slots.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-xs text-slate-600">
                        {new Intl.DateTimeFormat('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(date)}
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {slots.map((s) => {
                          const isSelected = slot?.start === s.start;
                          return (
                            <Tooltip key={s.start}>
                              <TooltipTrigger asChild>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant={isSelected ? "default" : "outline"}
                                  onClick={() => setSlot(s)}
                                  className={`font-semibold ${
                                    isSelected
                                      ? "bg-purple-600 hover:bg-purple-700"
                                      : "hover:border-purple-300"
                                  }`}
                                >
                                  {isSelected && <CheckCircle size={14} className="mr-1" />}
                                  {s.start}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {s.start} - {s.end}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {date && slots.length === 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-2">
                      <AlertCircle size={16} className="text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-amber-900">
                          Sin horarios disponibles
                        </p>
                        <p className="text-xs text-amber-700">
                          El taller no tiene disponibilidad en la fecha seleccionada
                        </p>
                      </div>
                    </div>
                  )}

                  {!date && (
                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center">
                      <p className="text-sm text-slate-600">
                        Selecciona una fecha para ver los horarios disponibles
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* RESUMEN */}
          {isComplete && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex gap-2">
              <CheckCircle size={18} className="text-green-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-900">
                  Cita completamente configurada
                </p>
                <p className="text-xs text-green-700 mt-1">
                  {centros.find(c => c.id === centroId)?.nombre} • 
                  {" " + talleres.find(t => t.id === tallerId)?.nombre} • 
                  {" " + (asesorId === "any" ? "Cualquier asesor" : asesores.find(a => a.id === Number(asesorId))?.fullname)}
                </p>
              </div>
            </div>
          )}

        </CardContent>
      </Card>
    </TooltipProvider>
  );
}