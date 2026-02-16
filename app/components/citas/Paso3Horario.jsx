"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { DayPicker } from "react-day-picker";
import { es } from "date-fns/locale";
import "react-day-picker/dist/style.css";

export default function Paso3Horario({ onChange }) {

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

  const today = new Date();

  // helpers
  const parseTime = t => {
    if (!t) return 0;
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  const minutesToTime = m =>
    `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

  const DAY_ES = ["domingo","lunes","martes","miercoles","jueves","viernes","sabado"];
  const DAY_EN = ["sun","mon","tue","wed","thu","fri","sat"];

  // cargar centros
  useEffect(() => {
    fetch("/api/centros")
      .then(r => r.json())
      .then(setCentros);
  }, []);

  // cargar talleres
  useEffect(() => {
    if (!centroId) return;
    fetch(`/api/talleres?centro_id=${centroId}`)
      .then(r => r.json())
      .then(setTalleres);
  }, [centroId]);

  // cargar asesores (sin filtro por rol)
  useEffect(() => {
    fetch("/api/usuarios")
      .then(r => r.json())
      .then(data => {
        const validos = data.filter(u =>
          u.is_active && u.work_schedule
        );
        setAsesores(validos);
      });
  }, []);

  // cargar horario centro
  useEffect(() => {
    if (!centroId) return;

    fetch(`/api/horacitas_centro/by-centro/${centroId}`)
      .then(r => r.json())
      .then(data => setHorario(data));
  }, [centroId]);

  // deshabilitar días no disponibles
  const isDayDisabled = (day) => {
    if (!horario?.week_json) return true;

    const key = DAY_ES[day.getDay()];
    const cfg = horario.week_json[key];

    if (!cfg?.active) return true;

    const todayMid = new Date();
    todayMid.setHours(0,0,0,0);

    return day < todayMid;
  };

  // generar slots
  useEffect(() => {
    if (!date || !horario || !tallerId) return;

    const key = DAY_ES[date.getDay()];
    const cfgCentro = horario.week_json[key];

    if (!cfgCentro?.active) {
      setSlots([]);
      return;
    }

    let start = parseTime(cfgCentro.start);
    let end = parseTime(cfgCentro.end);

    // cruzar con asesor
    if (asesorId !== "any") {
      const asesor = asesores.find(a => String(a.id) === asesorId);

      if (asesor?.work_schedule) {
        const schedule =
          typeof asesor.work_schedule === "string"
            ? JSON.parse(asesor.work_schedule)
            : asesor.work_schedule;

        const keyEn = DAY_EN[date.getDay()];
        const cfgAsesor = schedule[keyEn];

        if (!cfgAsesor) {
          setSlots([]);
          return;
        }

        const aStart = parseTime(cfgAsesor.start);
        const aEnd = parseTime(cfgAsesor.end);

        start = Math.max(start, aStart);
        end = Math.min(end, aEnd);
      }
    }

    const arr = [];
    const now = new Date();

    for (let m = start; m < end; m += horario.slot_minutes) {

      const slotDate = new Date(date);
      slotDate.setHours(Math.floor(m / 60), m % 60, 0);

      // bloquear horas pasadas
      if (slotDate < now) continue;

      arr.push({
        start: minutesToTime(m),
        end: minutesToTime(m + horario.slot_minutes)
      });
    }

    setSlots(arr);
  }, [date, asesorId, horario, tallerId]);

  // emitir selección
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

  return (
    <Card>
      <CardHeader className="font-semibold">
        PASO 3 — Seleccione fecha y hora
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
          <div className="border rounded-xl p-4 shadow-sm bg-white">
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

            {/* ASESOR */}
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

            {/* HORAS */}
            {slots.length > 0 && (
              <div>
                <div className="font-medium mb-2">Seleccione la hora</div>
                <div className="flex flex-wrap gap-2">
                  {slots.map(s => (
                    <Button
                      key={s.start}
                      type="button"
                      size="sm"
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
              <p className="text-sm text-muted-foreground">
                No hay horarios disponibles
              </p>
            )}
          </div>
        </div>

      </CardContent>
    </Card>
  );
}
