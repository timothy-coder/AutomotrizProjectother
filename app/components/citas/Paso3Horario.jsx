"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DayPicker } from "react-day-picker";
import { es } from "date-fns/locale";
import "react-day-picker/dist/style.css";

const DAY_KEY = ["sun","mon","tue","wed","thu","fri","sat"];

function parseTimeToMinutes(t) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(min) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}`;
}

function intersectRanges(aStart, aEnd, bStart, bEnd) {
  const start = Math.max(aStart, bStart);
  const end = Math.min(aEnd, bEnd);
  return start < end ? [start, end] : null;
}

export default function Paso3Horario({ onChange }) {

  const [centros, setCentros] = useState([]);
  const [talleres, setTalleres] = useState([]);
  const [asesores, setAsesores] = useState([]);
  const [horarioCentro, setHorarioCentro] = useState(null);

  const [centroId, setCentroId] = useState(null);
  const [tallerId, setTallerId] = useState(null);
  const [asesorId, setAsesorId] = useState("any");

  const [date, setDate] = useState(null);
  const [slot, setSlot] = useState(null);
  const [slots, setSlots] = useState([]);

  /* ================= CARGAS ================= */

  useEffect(() => {
    fetch("/api/centros").then(r => r.json()).then(setCentros);
  }, []);

  useEffect(() => {
    if (!centroId) return;
    fetch(`/api/talleres?centro_id=${centroId}`)
      .then(r => r.json())
      .then(setTalleres);

    fetch(`/api/horacitas_centro/by-centro/${centroId}`)
      .then(r => r.json())
      .then(setHorarioCentro);
  }, [centroId]);

  useEffect(() => {
    fetch("/api/usuarios")
      .then(r => r.json())
      .then(json => {
        const parsed = json.map(a => ({
          ...a,
          work_schedule:
            typeof a.work_schedule === "string"
              ? JSON.parse(a.work_schedule)
              : a.work_schedule
        }));
        setAsesores(parsed);
      });
  }, []);

  /* ================= VALIDAR DÍA ================= */

  const isDayDisabled = (day) => {
    if (!horarioCentro) return true;

    const names = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
    const key = names[day.getDay()];
    const cfg = horarioCentro.week_json?.[key];

    return !cfg?.active;
  };

  /* ================= GENERAR SLOTS ================= */

  useEffect(() => {
    if (!date || !horarioCentro) return;

    const names = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
    const key = names[date.getDay()];
    const cfgCentro = horarioCentro.week_json?.[key];

    if (!cfgCentro?.active) {
      setSlots([]);
      return;
    }

    let start = parseTimeToMinutes(cfgCentro.start);
    let end = parseTimeToMinutes(cfgCentro.end);

    // cruzar con horario del asesor
    if (asesorId !== "any") {
      const asesor = asesores.find(a => Number(a.id) === Number(asesorId));
      if (asesor) {
        const keyEn = DAY_KEY[date.getDay()];
        const cfgAsesor = asesor.work_schedule?.[keyEn];

        if (!cfgAsesor) {
          setSlots([]);
          return;
        }

        const aStart = parseTimeToMinutes(cfgAsesor.start);
        const aEnd = parseTimeToMinutes(cfgAsesor.end);

        const inter = intersectRanges(start, end, aStart, aEnd);
        if (!inter) {
          setSlots([]);
          return;
        }

        start = inter[0];
        end = inter[1];
      }
    }

    const arr = [];
    const step = horarioCentro.slot_minutes || 30;

    for (let t = start; t + step <= end; t += step) {
      arr.push({
        start: minutesToTime(t),
        end: minutesToTime(t + step)
      });
    }

    setSlots(arr);
    setSlot(null);

  }, [date, horarioCentro, asesorId]);

  /* ================= EMITIR ================= */

  useEffect(() => {
    if (!slot || !date) return;

    const day = date.toISOString().slice(0,10);

    onChange({
      centro_id: centroId,
      taller_id: tallerId,
      asesor_id: asesorId === "any" ? null : asesorId,
      start: `${day} ${slot.start}:00`,
      end: `${day} ${slot.end}:00`
    });

  }, [slot]);

  /* ================= UI ================= */

  return (
    <Card>
      <CardHeader className="font-semibold text-lg">
        PASO 3 — Fecha y hora
      </CardHeader>

      <CardContent className="space-y-6">

        {/* CENTRO */}
        <Select onValueChange={v => setCentroId(Number(v))}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccione un centro" />
          </SelectTrigger>
          <SelectContent>
            {centros.map(c => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* TALLER */}
        {centroId && (
          <Select onValueChange={v => setTallerId(Number(v))}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione un taller" />
            </SelectTrigger>
            <SelectContent>
              {talleres.map(t => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        <div className="grid md:grid-cols-2 gap-6">

          {/* CALENDARIO */}
          <div className="border rounded-xl p-3 shadow-sm">
            <DayPicker
              mode="single"
              selected={date}
              onSelect={setDate}
              locale={es}
              fromDate={new Date()}
              disabled={isDayDisabled}
              className="mx-auto"
            />
          </div>

          {/* DERECHA */}
          <div className="space-y-4">

            <Select value={asesorId} onValueChange={setAsesorId}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccione asesor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Cualquier asesor</SelectItem>
                {asesores.map(a => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.fullname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {slots.length > 0 && (
              <div>
                <div className="font-medium mb-2">Horas disponibles</div>
                <div className="flex flex-wrap gap-2">
                  {slots.map(s => (
                    <Button
                      key={s.start}
                      type="button"
                      variant={slot?.start === s.start ? "default" : "outline"}
                      onClick={() => setSlot(s)}
                    >
                      {s.start}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {slots.length === 0 && date && (
              <div className="text-sm text-muted-foreground">
                No hay horarios disponibles.
              </div>
            )}

          </div>
        </div>
      </CardContent>
    </Card>
  );
}
