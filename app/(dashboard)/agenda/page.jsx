"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  format,
  addWeeks,
  subWeeks,
  startOfWeek,
  addDays,
} from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";

import OportunidadDialog from "@/app/components/oportunidades/OportunidadDialog";
import { useUserScope } from "@/hooks/useUserScope";

export default function AgendaPage() {
  const menuRef = useRef(null);

  const {
    centros: userCentros,
    talleres: userTalleres,
    loading: scopeLoading,
  } = useUserScope();

  const [centros, setCentros] = useState([]);
  const [centroId, setCentroId] = useState(null);

  const [horario, setHorario] = useState(null);
  const [slots, setSlots] = useState([]);

  const [oportunidades, setOportunidades] = useState([]);

  const [openOportunidadDialog, setOpenOportunidadDialog] = useState(false);
  const [menuCell, setMenuCell] = useState(null);

  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );

  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  useEffect(() => {
    function close(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuCell(null);
      }
    }

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    if (scopeLoading) return;

    fetch("/api/centros")
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];

        const filtrados =
          userCentros.length > 0
            ? lista.filter((c) => userCentros.includes(Number(c.id)))
            : [];

        setCentros(filtrados);

        setCentroId((prev) => {
          if (prev && filtrados.some((c) => Number(c.id) === Number(prev))) {
            return prev;
          }
          return filtrados.length > 0 ? Number(filtrados[0].id) : null;
        });
      })
      .catch(() => {
        setCentros([]);
        setCentroId(null);
      });
  }, [scopeLoading, userCentros]);

  useEffect(() => {
    if (!centroId) {
      setHorario(null);
      return;
    }

    if (userCentros.length > 0 && !userCentros.includes(Number(centroId))) {
      setHorario(null);
      return;
    }

    fetch(`/api/agendacitas_centro/by-centro/${centroId}`)
      .then((r) => r.json())
      .then(setHorario)
      .catch(() => setHorario(null));
  }, [centroId, userCentros]);

  useEffect(() => {
    if (!horario?.week_json) {
      setSlots([]);
      return;
    }

    const minutes = horario.slot_minutes || 30;
    const firstActive = Object.values(horario.week_json).find((d) => d.active);

    if (!firstActive) {
      setSlots([]);
      return;
    }

    const arr = [];
    let [h, m] = firstActive.start.split(":").map(Number);
    const [eh, em] = firstActive.end.split(":").map(Number);

    while (h < eh || (h === eh && m < em)) {
      arr.push(
        `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`
      );
      m += minutes;
      if (m >= 60) {
        h++;
        m -= 60;
      }
    }

    setSlots(arr);
  }, [horario]);

  async function loadOportunidades() {
    try {
      const r = await fetch("/api/oportunidades", { cache: "no-store" });
      const data = await r.json();

      let lista = Array.isArray(data) ? data : [];

      if (userTalleres.length > 0) {
        lista = lista.filter((o) => {
          if (o.taller_id == null) return true;
          return userTalleres.includes(Number(o.taller_id));
        });
      }

      const start = format(days[0], "yyyy-MM-dd");
      const end = format(days[6], "yyyy-MM-dd");

      lista = lista.filter((o) => {
        if (!o.created_at) return false;
        const fecha = toLocalDate(o.created_at);
        return fecha >= start && fecha <= end;
      });

      setOportunidades(lista);
    } catch (error) {
      console.error(error);
      setOportunidades([]);
    }
  }

  useEffect(() => {
    if (scopeLoading) return;
    loadOportunidades();
  }, [centroId, weekStart, scopeLoading, userCentros, userTalleres]);

  const dayMap = [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
  ];

  function enabled(day, hour) {
    if (!horario) return true;
    const cfg = horario.week_json?.[dayMap[day.getDay()]];
    if (!cfg?.active) return false;
    return hour >= cfg.start && hour < cfg.end;
  }

  function past(day, hour) {
    const now = new Date();
    const slot = new Date(`${format(day, "yyyy-MM-dd")}T${hour}`);
    return slot < now;
  }

  function toLocalHour(date) {
    return new Date(date).toLocaleTimeString("es-PE", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  }

  function toLocalDate(date) {
    return new Date(date).toISOString().slice(0, 10);
  }

  function getOportunidades(day, hour) {
    const date = format(day, "yyyy-MM-dd");

    return oportunidades.filter((o) => {
      if (!o.created_at) return false;

      return (
        toLocalDate(o.created_at) === date &&
        toLocalHour(o.created_at) === hour
      );
    });
  }

  function openMenu(day, hour, e) {
    e.stopPropagation();
    setMenuCell({
      day: format(day, "yyyy-MM-dd"),
      hour,
    });
  }

  const canShowGrid = !scopeLoading && !!centroId;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <span className="font-semibold">
          {format(days[0], "dd MMM", { locale: es })} -{" "}
          {format(days[6], "dd MMM", { locale: es })}
        </span>

        <Button
          size="icon"
          onClick={() => setWeekStart(subWeeks(weekStart, 1))}
        >
          <ChevronLeft />
        </Button>

        <Button
          size="icon"
          onClick={() => setWeekStart(addWeeks(weekStart, 1))}
        >
          <ChevronRight />
        </Button>

        <Button
          onClick={() =>
            setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))
          }
        >
          Hoy
        </Button>

        <Select
          value={centroId ? String(centroId) : ""}
          onValueChange={(v) => setCentroId(Number(v))}
          disabled={scopeLoading || centros.length === 0}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Centro" />
          </SelectTrigger>
          <SelectContent>
            {centros.map((c) => (
              <SelectItem key={c.id} value={String(c.id)}>
                {c.nombre || c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setOpenOportunidadDialog(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva oportunidad
          </Button>
        </div>
      </div>

      {!scopeLoading && centros.length === 0 && (
        <div className="border rounded-md p-4 text-sm text-muted-foreground">
          No tienes centros asignados.
        </div>
      )}

      {canShowGrid && (
        <div className="border rounded overflow-hidden">
          <div className="grid grid-cols-[80px_repeat(7,1fr)]">
            <div />
            {days.map((d) => (
              <div
                key={d.toISOString()}
                className="p-2 text-center font-medium border-l"
              >
                {format(d, "EEEE dd", { locale: es })}
              </div>
            ))}
          </div>

          {slots.map((h) => (
            <div key={h} className="grid grid-cols-[80px_repeat(7,1fr)]">
              <div className="border-t p-2 text-sm text-gray-500">{h}</div>

              {days.map((d) => {
                const oportunidadesSlot = getOportunidades(d, h);
                const blocked = !enabled(d, h) || past(d, h);
                const dayString = format(d, "yyyy-MM-dd");

                return (
                  <div
                    key={`${dayString}-${h}`}
                    className={`border-t border-l h-24 relative ${
                      blocked
                        ? "bg-gray-100 cursor-not-allowed"
                        : "hover:bg-[#5e17eb]/10 cursor-pointer"
                    }`}
                    onClick={(e) => {
                      if (blocked) return;
                      openMenu(d, h, e);
                    }}
                  >
                    <div className="absolute inset-1 overflow-auto space-y-1">
                      {oportunidadesSlot.map((o, i) => (
                        <div
                          key={`opp-${i}`}
                          className="rounded shadow border text-[10px] p-1 overflow-hidden bg-[#fff7ed]"
                        >
                          <div className="h-1 mb-1 rounded bg-orange-500" />
                          <div className="font-semibold">
                            {o.cliente_name || "Oportunidad"}
                          </div>
                          <div className="truncate">
                            {o.modelo_name || ""}
                            {o.modelo_name && o.marca_name ? " - " : ""}
                            {o.marca_name || ""}
                          </div>
                          <div className="truncate">
                            {o.etapa_name || o.origen_name || "-"}
                          </div>
                          <div className="truncate text-[9px]">
                            {o.suborigen_name || o.detalle || ""}
                          </div>
                        </div>
                      ))}
                    </div>

                    {menuCell &&
                      menuCell.day === dayString &&
                      menuCell.hour === h && (
                        <div
                          ref={menuRef}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute z-10 bg-white border rounded shadow p-2 top-2 left-2 w-44"
                        >
                          <button
                            className="block w-full text-left hover:bg-gray-100 px-2 py-1"
                            onClick={() => {
                              setMenuCell(null);
                              setOpenOportunidadDialog(true);
                            }}
                          >
                            Nueva oportunidad
                          </button>
                        </div>
                      )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      <OportunidadDialog
        open={openOportunidadDialog}
        onOpenChange={setOpenOportunidadDialog}
        onSuccess={() => {
          setOpenOportunidadDialog(false);
          loadOportunidades();
        }}
      />
    </div>
  );
}