"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import {
  format,
  addWeeks,
  subWeeks,
  startOfWeek,
  addDays,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
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

import { ChevronLeft, ChevronRight, Calendar, CalendarClock, Plus } from "lucide-react";

import UserAbsenceDialog from "@/app/components/user-absences/AbsenceDialog";
import AbsencesSheet from "@/app/components/user-absences/AbsencesSheet";
import CitaResumenDialog from "@/app/components/citas/CitaResumenDialog";
import OportunidadDialog from "@/app/components/oportunidadespv/OportunidadDialog";
import { useUserScope } from "@/hooks/useUserScope";

export default function CitasPage() {
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

  const [citas, setCitas] = useState([]);
  const [ausencias, setAusencias] = useState([]);
  const [oportunidades, setOportunidades] = useState([]);
  const [estadosTiempo, setEstadosTiempo] = useState([]);

  const [asesores, setAsesores] = useState([]);
  const [asesorFiltro, setAsesorFiltro] = useState("all");
  const [estadoFiltro, setEstadoFiltro] = useState("all");
  const [tipoFiltro, setTipoFiltro] = useState("all"); // "all", "op", "ld"
  const [vistaFiltro, setVistaFiltro] = useState("semana"); // "semana", "mes"

  const [openAbsences, setOpenAbsences] = useState(false);
  const [openAbsence, setOpenAbsence] = useState(false);
  const [openResumen, setOpenResumen] = useState(false);
  const [openOportunidadDialog, setOpenOportunidadDialog] = useState(false);

  const [selectedCita, setSelectedCita] = useState(null);
  const [selectedAbsence, setSelectedAbsence] = useState(null);
  const [selectedOportunidad, setSelectedOportunidad] = useState(null);

  const [menuCell, setMenuCell] = useState(null);
  const [dialogType, setDialogType] = useState("op");
  const [dialogDefaults, setDialogDefaults] = useState({
    fecha: "",
    hora: "",
    oportunidadPadreId: "",
  });

  const [weekStart, setWeekStart] = useState(
    startOfWeek(new Date(), { weekStartsOn: 1 })
  );
  const [monthStart, setMonthStart] = useState(startOfMonth(new Date()));

  const days = useMemo(() => {
    if (vistaFiltro === "semana") {
      return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    } else {
      return eachDayOfInterval({
        start: monthStart,
        end: endOfMonth(monthStart),
      });
    }
  }, [vistaFiltro, weekStart, monthStart]);

  // Cargar configuración de estados de tiempo
  useEffect(() => {
    fetch("/api/configuracion-estados-tiempopv", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];
        setEstadosTiempo(lista);
      })
      .catch(() => setEstadosTiempo([]));
  }, []);

  useEffect(() => {
    function close(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuCell(null);
      }
    }

    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  // ===== LOAD CENTROS =====
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
          return filtrados.length ? Number(filtrados[0].id) : null;
        });
      })
      .catch(() => {
        setCentros([]);
        setCentroId(null);
      });
  }, [scopeLoading, userCentros]);

  // ===== LOAD ASESORES =====
  useEffect(() => {
    fetch("/api/usuarios")
      .then((r) => r.json())
      .then((data) => setAsesores(Array.isArray(data) ? data : []))
      .catch(() => setAsesores([]));
  }, []);

  // ===== LOAD HORARIO =====
  useEffect(() => {
    if (!centroId) {
      setHorario(null);
      return;
    }

    if (userCentros.length > 0 && !userCentros.includes(Number(centroId))) {
      setHorario(null);
      return;
    }

    fetch(`/api/horacitas_centro/by-centro/${centroId}`)
      .then((r) => r.json())
      .then(setHorario)
      .catch(() => setHorario(null));
  }, [centroId, userCentros]);

  // ===== GENERAR SLOTS =====
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

  // ===== LOAD CITAS =====
  async function loadCitas() {
    if (!centroId) {
      setCitas([]);
      return;
    }

    if (userCentros.length > 0 && !userCentros.includes(Number(centroId))) {
      setCitas([]);
      return;
    }

    const start = format(days[0], "yyyy-MM-dd");
    const end = format(days[days.length - 1], "yyyy-MM-dd");

    try {
      const r = await fetch(
        `/api/citas?centro_id=${centroId}&start=${start}&end=${end}`,
        { cache: "no-store" }
      );
      const data = await r.json();

      let lista = [];
      if (Array.isArray(data)) lista = data;
      else if (Array.isArray(data?.rows)) lista = data.rows;

      if (userTalleres.length > 0) {
        lista = lista.filter((c) => {
          if (c.taller_id == null) return true;
          return userTalleres.includes(Number(c.taller_id));
        });
      }

      setCitas(lista);
    } catch {
      setCitas([]);
    }
  }

  useEffect(() => {
    if (scopeLoading) return;
    loadCitas();
  }, [centroId, weekStart, monthStart, vistaFiltro, scopeLoading, userCentros, userTalleres]);

  // ===== LOAD AUSENCIAS =====
  async function loadAusencias() {
    if (!centroId) {
      setAusencias([]);
      return;
    }

    if (userCentros.length > 0 && !userCentros.includes(Number(centroId))) {
      setAusencias([]);
      return;
    }

    const start = format(days[0], "yyyy-MM-dd");
    const end = format(days[days.length - 1], "yyyy-MM-dd");

    try {
      const r = await fetch(
        `/api/user-absences?centro_id=${centroId}&start=${start}&end=${end}`,
        { cache: "no-store" }
      );
      const data = await r.json();

      if (Array.isArray(data)) setAusencias(data);
      else if (Array.isArray(data?.rows)) setAusencias(data.rows);
      else setAusencias([]);
    } catch {
      setAusencias([]);
    }
  }

  useEffect(() => {
    if (scopeLoading) return;
    loadAusencias();
  }, [centroId, weekStart, monthStart, vistaFiltro, scopeLoading, userCentros]);

  // ===== LOAD OPORTUNIDADES =====
  async function loadOportunidades() {
    const start = format(days[0], "yyyy-MM-dd");
    const end = format(days[days.length - 1], "yyyy-MM-dd");

    try {
      const [resOp, resLd] = await Promise.all([
        fetch(
          `/api/oportunidadespv?fecha_desde=${start}&fecha_hasta=${end}`,
          { cache: "no-store" }
        ),
        fetch(
          `/api/leadspv?fecha_desde=${start}&fecha_hasta=${end}`,
          { cache: "no-store" }
        ),
      ]);

      const [dataOp, dataLd] = await Promise.all([resOp.json(), resLd.json()]);

      const listaOp = Array.isArray(dataOp) ? dataOp : [];
      const listaLd = Array.isArray(dataLd) ? dataLd : [];

      let lista = [...listaOp, ...listaLd];

      if (tipoFiltro === "op") {
        lista = lista.filter((o) => getTipoCodigo(o.oportunidad_id) === "op");
      } else if (tipoFiltro === "ld") {
        lista = lista.filter((o) => getTipoCodigo(o.oportunidad_id) === "ld");
      }

      lista.sort((a, b) => {
        const fa = `${String(a.fecha_agenda || "").slice(0, 10)} ${String(
          a.hora_agenda || ""
        ).slice(0, 8)}`;
        const fb = `${String(b.fecha_agenda || "").slice(0, 10)} ${String(
          b.hora_agenda || ""
        ).slice(0, 8)}`;

        if (fa < fb) return -1;
        if (fa > fb) return 1;

        return Number(a.id || 0) - Number(b.id || 0);
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
  }, [weekStart, monthStart, vistaFiltro, scopeLoading, tipoFiltro]);

  // ===== HELPERS =====
  const dayMap = [
    "domingo",
    "lunes",
    "martes",
    "miercoles",
    "jueves",
    "viernes",
    "sabado",
  ];

  function normalizeDate(value) {
    if (!value) return "";
    return String(value).trim().slice(0, 10);
  }

  function getTipoCodigo(codigo) {
    const value = String(codigo || "").trim().toUpperCase();
    if (/^OP-\d+$/.test(value)) return "op";
    if (/^LD-\d+$/.test(value)) return "ld";
    return "other";
  }

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

  function getMinutosRestantes(fechaAgenda, horaAgenda) {
    if (!fechaAgenda || !horaAgenda) return null;

    try {
      const fechaStr = String(fechaAgenda).trim().split("T")[0];
      const horaStr = String(horaAgenda)
        .trim()
        .split(":")
        .slice(0, 2)
        .join(":");

      const fechaHoraString = `${fechaStr}T${horaStr}:00`;
      const ahora = new Date();
      const agendaDateTime = new Date(fechaHoraString);

      if (isNaN(agendaDateTime.getTime())) {
        return null;
      }

      const diferencia = agendaDateTime.getTime() - ahora.getTime();
      const minutos = Math.floor(diferencia / 1000 / 60);

      return minutos;
    } catch (error) {
      console.error("Error calculando minutos:", error);
      return null;
    }
  }

  function getColorEstadoTiempo(minutosRestantes, etapasconversionpv_id) {
    if (etapasconversionpv_id !== 2 && etapasconversionpv_id !== 3) {
      return "#28a745";
    }

    if (minutosRestantes === null) {
      return "#6b7280";
    }

    const estadoActivo = estadosTiempo.find(
      (e) =>
        e.activo &&
        minutosRestantes >= e.minutos_desde &&
        minutosRestantes <= e.minutos_hasta
    );

    if (estadoActivo) {
      return estadoActivo.color_hexadecimal;
    }

    return "#6b7280";
  }

  function getCitas(day, hour) {
    const date = format(day, "yyyy-MM-dd");

    return citas.filter((c) => {
      if (asesorFiltro !== "all" && String(c.asesor_id) !== String(asesorFiltro)) {
        return false;
      }

      if (estadoFiltro !== "all" && c.estado !== estadoFiltro) {
        return false;
      }

      return (
        toLocalDate(c.start_at) === date &&
        toLocalHour(c.start_at) === hour
      );
    });
  }

  function getOportunidades(day, hour) {
    const date = normalizeDate(day);
    const slotStart = hour;
    const [hStart, mStart] = slotStart.split(":").map(Number);
    const slotMinutesStart = hStart * 60 + mStart;
    const slotMinutesEnd = slotMinutesStart + (horario?.slot_minutes || 30);

    return oportunidades.filter((o) => {
      const fecha = normalizeDate(o.fecha_agenda);
      if (fecha !== date) return false;

      const oHour = String(o.hora_agenda || "").slice(0, 5);
      const [oh, om] = oHour.split(":").map(Number);
      const oMinutes = oh * 60 + om;

      return oMinutes >= slotMinutesStart && oMinutes < slotMinutesEnd;
    });
  }

  function openMenu(day, hour, e) {
    e.stopPropagation();
    setMenuCell({
      day: format(day, "yyyy-MM-dd"),
      hour,
    });
  }

  function openCita(c) {
    setSelectedCita(c);
    setOpenResumen(true);
  }

  function editarAusencia(a) {
    setSelectedAbsence(a);
    setOpenAbsence(true);
    setOpenAbsences(false);
  }

  async function eliminarAusencia(id) {
    if (!confirm("¿Eliminar ausencia?")) return;

    try {
      await fetch(`/api/user-absences/${id}`, {
        method: "DELETE",
      });

      setAusencias((prev) => prev.filter((a) => a.id !== id));
    } catch {
      console.log("No se pudo eliminar");
    }
  }

  const canShowGrid = !scopeLoading && !!centroId;

  // ===== RENDER MES VIEW =====
  const renderMesView = () => {
    const weeksInMonth = [];
    let currentWeek = [];

    const firstDayOfMonth = days[0];
    const startDay = firstDayOfMonth.getDay() === 0 ? 6 : firstDayOfMonth.getDay() - 1;

    for (let i = 0; i < startDay; i++) {
      currentWeek.push(null);
    }

    days.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeksInMonth.push([...currentWeek]);
        currentWeek = [];
      }
    });

    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
      weeksInMonth.push(currentWeek);
    }

    return (
      <div className="border rounded overflow-hidden">
        <div className="grid grid-cols-7">
          {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
            <div key={day} className="p-2 text-center font-medium border-b bg-muted">
              {day}
            </div>
          ))}
        </div>

        {weeksInMonth.map((week, weekIdx) => (
          <div key={weekIdx} className="grid grid-cols-7">
            {week.map((day, dayIdx) => {
              if (!day) {
                return <div key={`empty-${dayIdx}`} className="border p-2 bg-gray-50 min-h-24" />;
              }

              const dayString = format(day, "yyyy-MM-dd");
              const dayOportunidades = oportunidades.filter((o) =>
                normalizeDate(o.fecha_agenda) === dayString
              );
              const dayCitas = citas.filter((c) =>
                toLocalDate(c.start_at) === dayString
              );

              return (
                <div
                  key={dayString}
                  className="border p-2 min-h-24 overflow-auto cursor-pointer hover:bg-blue-50 relative"
                  onClick={(e) => {
                    openMenu(day, "10:00", e);
                  }}
                >
                  <div className="text-xs font-semibold mb-1">
                    {format(day, "d")}
                  </div>

                  <div className="space-y-1 text-[9px]">
                    {dayCitas.map((c, i) => (
                      <div
                        key={`cita-${i}`}
                        className="rounded p-1 bg-white border truncate cursor-pointer"
                        onClick={(e) => {
                          e.stopPropagation();
                          openCita(c);
                        }}
                        style={{ borderLeft: `3px solid ${c.color || "#5e17eb"}` }}
                      >
                        <div className="font-semibold truncate">{c.placa}</div>
                        <div className="truncate">{c.asesor}</div>
                      </div>
                    ))}

                    {dayOportunidades.map((o) => {
                      const tipo = getTipoCodigo(o.oportunidad_id);
                      const minutosRestantes = getMinutosRestantes(
                        o.fecha_agenda,
                        o.hora_agenda
                      );
                      const colorTiempo = getColorEstadoTiempo(
                        minutosRestantes,
                        o.etapasconversionpv_id
                      );

                      return (
                        <div
                          key={`${tipo}-${o.id}`}
                          className="rounded p-1 bg-white border truncate cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOportunidad(o);
                            setDialogType(tipo);
                            setOpenOportunidadDialog(true);
                          }}
                          style={{ borderLeft: `3px solid ${colorTiempo}` }}
                        >
                          <div className="font-semibold truncate">
                            {o.oportunidad_id}
                          </div>
                          <div className="truncate">{o.cliente_name || ""}</div>
                        </div>
                      );
                    })}
                  </div>

                  {menuCell &&
                    menuCell.day === dayString && (
                      <div
                        ref={menuRef}
                        onClick={(e) => e.stopPropagation()}
                        className="absolute z-10 bg-white border rounded shadow p-2 top-2 left-2 w-48 space-y-1"
                      >
                        <button
                          className="block w-full text-left hover:bg-gray-100 px-2 py-1 rounded text-sm"
                          onClick={() => {
                            window.location.href = "/citas/nueva";
                          }}
                        >
                          Nueva cita
                        </button>

                        <button
                          className="block w-full text-left hover:bg-gray-100 px-2 py-1 rounded text-sm"
                          onClick={() => {
                            setSelectedOportunidad(null);
                            setDialogType("op");
                            setDialogDefaults({
                              fecha: dayString,
                              hora: "10:00",
                              oportunidadPadreId: "",
                            });
                            setMenuCell(null);
                            setOpenOportunidadDialog(true);
                          }}
                        >
                          Nueva oportunidad
                        </button>

                        <button
                          className="block w-full text-left hover:bg-gray-100 px-2 py-1 rounded text-sm"
                          onClick={() => {
                            setMenuCell(null);
                            setSelectedAbsence(null);
                            setOpenAbsence(true);
                          }}
                        >
                          Agendar ausencia
                        </button>
                      </div>
                    )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    );
  };

  if (canShowGrid && vistaFiltro === "mes") {
    return (
      <div className="space-y-4">
        {/* HEADER */}
        <div className="flex flex-wrap gap-3 items-center">
          <span className="font-semibold">
            {format(monthStart, "MMMM yyyy", { locale: es })}
          </span>

          <Button
            size="icon"
            onClick={() => setMonthStart(subMonths(monthStart, 1))}
          >
            <ChevronLeft />
          </Button>

          <Button
            size="icon"
            onClick={() => setMonthStart(addMonths(monthStart, 1))}
          >
            <ChevronRight />
          </Button>

          <Button
            onClick={() =>
              setMonthStart(startOfMonth(new Date()))
            }
          >
            Hoy
          </Button>

          <Select value={vistaFiltro} onValueChange={setVistaFiltro}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Vista" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="semana">Por semana</SelectItem>
              <SelectItem value="mes">Por mes</SelectItem>
            </SelectContent>
          </Select>

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

          <Select value={asesorFiltro} onValueChange={setAsesorFiltro}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Asesor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              {asesores.map((a) => (
                <SelectItem key={a.id} value={String(a.id)}>
                  {a.fullname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="confirmada">Confirmada</SelectItem>
              <SelectItem value="pendiente">Pendiente</SelectItem>
              <SelectItem value="cancelada">Cancelada</SelectItem>
              <SelectItem value="reprogramada">Reprogramada</SelectItem>
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2 border rounded-md p-1">
            <Button
              type="button"
              variant={tipoFiltro === "all" ? "default" : "ghost"}
              onClick={() => setTipoFiltro("all")}
              size="sm"
            >
              Todos
            </Button>

            <Button
              type="button"
              variant={tipoFiltro === "op" ? "default" : "ghost"}
              onClick={() => setTipoFiltro("op")}
              size="sm"
            >
              OP
            </Button>

            <Button
              type="button"
              variant={tipoFiltro === "ld" ? "default" : "ghost"}
              onClick={() => setTipoFiltro("ld")}
              size="sm"
            >
              LD
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={() => (window.location.href = "/citas/nueva")}
              disabled={!centroId}
            >
              <Calendar className="w-4 h-4 mr-2" />
              Nueva cita
            </Button>

            <Button
              onClick={() => {
                setSelectedOportunidad(null);
                setDialogType("op");
                setDialogDefaults({
                  fecha: format(new Date(), "yyyy-MM-dd"),
                  hora: "",
                  oportunidadPadreId: "",
                });
                setOpenOportunidadDialog(true);
              }}
              disabled={!centroId}
            >
              <Plus className="w-4 h-4 mr-2" />
              Nueva oportunidad
            </Button>

            <Button variant="outline" onClick={() => setOpenAbsences(true)} disabled={!centroId}>
              Ver ausencias
            </Button>
          </div>
        </div>

        {!scopeLoading && centros.length === 0 && (
          <div className="border rounded-md p-4 text-sm text-muted-foreground">
            No tienes centros asignados.
          </div>
        )}

        {canShowGrid && renderMesView()}

        <UserAbsenceDialog
          key={selectedAbsence?.id || "new"}
          open={openAbsence}
          onOpenChange={(v) => {
            setOpenAbsence(v);
            if (!v) setSelectedAbsence(null);
          }}
          fullname="Oscar"
          absence={selectedAbsence}
          onSaved={loadAusencias}
        />

        <CitaResumenDialog
          open={openResumen}
          onOpenChange={(v) => {
            setOpenResumen(v);
            if (!v) setSelectedCita(null);
          }}
          cita={selectedCita}
        />

        <OportunidadDialog
          open={openOportunidadDialog}
          onOpenChange={setOpenOportunidadDialog}
          defaultFecha={dialogDefaults.fecha}
          defaultHora={dialogDefaults.hora}
          oportunidadPadreId={dialogDefaults.oportunidadPadreId}
          oportunidad={selectedOportunidad}
          recordType={dialogType}
          onSuccess={() => {
            setOpenOportunidadDialog(false);
            setSelectedOportunidad(null);
            loadOportunidades();
          }}
        />

        <AbsencesSheet
          open={openAbsences}
          onOpenChange={setOpenAbsences}
          ausencias={ausencias}
          onEdit={editarAusencia}
          onDelete={eliminarAusencia}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* HEADER */}
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

        <Select value={vistaFiltro} onValueChange={setVistaFiltro}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Vista" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="semana">Por semana</SelectItem>
            <SelectItem value="mes">Por mes</SelectItem>
          </SelectContent>
        </Select>

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

        <Select value={asesorFiltro} onValueChange={setAsesorFiltro}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Asesor" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {asesores.map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>
                {a.fullname}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="confirmada">Confirmada</SelectItem>
            <SelectItem value="pendiente">Pendiente</SelectItem>
            <SelectItem value="cancelada">Cancelada</SelectItem>
            <SelectItem value="reprogramada">Reprogramada</SelectItem>
          </SelectContent>
        </Select>

        <div className="flex items-center gap-2 border rounded-md p-1">
          <Button
            type="button"
            variant={tipoFiltro === "all" ? "default" : "ghost"}
            onClick={() => setTipoFiltro("all")}
          >
            Todos
          </Button>

          <Button
            type="button"
            variant={tipoFiltro === "op" ? "default" : "ghost"}
            onClick={() => setTipoFiltro("op")}
          >
            OP
          </Button>

          <Button
            type="button"
            variant={tipoFiltro === "ld" ? "default" : "ghost"}
            onClick={() => setTipoFiltro("ld")}
          >
            LD
          </Button>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => (window.location.href = "/citas/nueva")}
            disabled={!centroId}
          >
            <Calendar className="w-4 h-4 mr-2" />
            Nueva cita
          </Button>

          <Button
            onClick={() => {
              setSelectedOportunidad(null);
              setDialogType("op");
              setDialogDefaults({
                fecha: format(new Date(), "yyyy-MM-dd"),
                hora: "",
                oportunidadPadreId: "",
              });
              setOpenOportunidadDialog(true);
            }}
            disabled={!centroId}
          >
            <Plus className="w-4 h-4 mr-2" />
            Nueva oportunidad
          </Button>

          <Button variant="outline" onClick={() => setOpenAbsences(true)} disabled={!centroId}>
            Ver ausencias
          </Button>
        </div>
      </div>

      {!scopeLoading && centros.length === 0 && (
        <div className="border rounded-md p-4 text-sm text-muted-foreground">
          No tienes centros asignados.
        </div>
      )}

      {/* GRID */}
      {canShowGrid && (
        <div className="border rounded overflow-hidden">
          {/* DIAS */}
          <div className="grid grid-cols-[80px_repeat(7,1fr)]">
            <div />
            {days.map((d) => (
              <div key={d.toISOString()} className="p-2 text-center font-medium border-l">
                {format(d, "EEEE dd", { locale: es })}
              </div>
            ))}
          </div>

          {/* HORAS */}
          {slots.map((h) => (
            <div key={h} className="grid grid-cols-[80px_repeat(7,1fr)]">
              <div className="border-t p-2 text-sm text-gray-500">{h}</div>

              {days.map((d) => {
                const citasSlot = getCitas(d, h);
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
                      if (citasSlot.length) return openCita(citasSlot[0]);
                      if (oportunidadesSlot.length) {
                        const o = oportunidadesSlot[0];
                        setSelectedOportunidad(o);
                        setDialogType(getTipoCodigo(o.oportunidad_id));
                        setOpenOportunidadDialog(true);
                        return;
                      }
                      openMenu(d, h, e);
                    }}
                  >
                    <div className="absolute inset-1 overflow-auto space-y-1">
                      {/* CITAS */}
                      {citasSlot.map((c, i) => (
                        <div
                          key={`cita-${i}`}
                          className="rounded shadow border text-[10px] p-1 overflow-hidden bg-white cursor-pointer"
                          onClick={(e) => {
                            e.stopPropagation();
                            openCita(c);
                          }}
                        >
                          <div
                            className="h-1 mb-1 rounded"
                            style={{ background: c.color || "#5e17eb" }}
                          />
                          <div className="font-semibold">{c.placa}</div>
                          <div className="truncate">{c.cliente}</div>
                          <div className="truncate">{c.asesor}</div>
                          <div className="text-[9px]">{c.estado}</div>
                        </div>
                      ))}

                      {/* OPORTUNIDADES */}
                      {oportunidadesSlot.map((o) => {
                        const tipo = getTipoCodigo(o.oportunidad_id);
                        const minutosRestantes = getMinutosRestantes(
                          o.fecha_agenda,
                          o.hora_agenda
                        );
                        const colorTiempo = getColorEstadoTiempo(
                          minutosRestantes,
                          o.etapasconversionpv_id
                        );

                        return (
                          <div
                            key={`${tipo}-${o.id}`}
                            className="rounded shadow border text-[10px] p-1 overflow-hidden bg-white cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedOportunidad(o);
                              setDialogType(tipo);
                              setOpenOportunidadDialog(true);
                            }}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <div className="font-semibold flex items-center gap-1">
                                {o.oportunidad_id || "Registro"}
                                <CalendarClock
                                  className="w-3 h-3 inline-block"
                                  style={{ color: colorTiempo }}
                                />
                              </div>
                              <span className="text-[9px] font-semibold uppercase">
                                {tipo === "ld" ? "LD" : "OP"}
                              </span>
                            </div>

                            <div className="truncate">
                              {o.cliente_name || "Sin cliente"}
                            </div>

                            <div className="truncate">
                              {o.marca_name || ""}
                              {o.marca_name && o.modelo_name ? " - " : ""}
                              {o.modelo_name || ""}
                            </div>

                            <div className="truncate">
                              {o.etapa_name || o.origen_name || "-"}
                            </div>

                            <div className="text-[9px]">
                              {String(o.hora_agenda || "").slice(0, 8)}
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* MENU */}
                    {menuCell &&
                      menuCell.day === dayString &&
                      menuCell.hour === h && (
                        <div
                          ref={menuRef}
                          onClick={(e) => e.stopPropagation()}
                          className="absolute z-10 bg-white border rounded shadow p-2 top-2 left-2 w-48 space-y-1"
                        >
                          <button
                            className="block w-full text-left hover:bg-gray-100 px-2 py-1 rounded text-sm"
                            onClick={() => {
                              window.location.href = "/citas/nueva";
                            }}
                          >
                            Nueva cita
                          </button>

                          <button
                            className="block w-full text-left hover:bg-gray-100 px-2 py-1 rounded text-sm"
                            onClick={() => {
                              setSelectedOportunidad(null);
                              setDialogType("op");
                              setDialogDefaults({
                                fecha: dayString,
                                hora: h,
                                oportunidadPadreId: "",
                              });
                              setMenuCell(null);
                              setOpenOportunidadDialog(true);
                            }}
                          >
                            Nueva oportunidad
                          </button>

                          <button
                            className="block w-full text-left hover:bg-gray-100 px-2 py-1 rounded text-sm"
                            onClick={() => {
                              setMenuCell(null);
                              setSelectedAbsence(null);
                              setOpenAbsence(true);
                            }}
                          >
                            Agendar ausencia
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

      <UserAbsenceDialog
        key={selectedAbsence?.id || "new"}
        open={openAbsence}
        onOpenChange={(v) => {
          setOpenAbsence(v);
          if (!v) setSelectedAbsence(null);
        }}
        fullname="Oscar"
        absence={selectedAbsence}
        onSaved={loadAusencias}
      />

      <CitaResumenDialog
        open={openResumen}
        onOpenChange={(v) => {
          setOpenResumen(v);
          if (!v) setSelectedCita(null);
        }}
        cita={selectedCita}
      />

      <OportunidadDialog
        open={openOportunidadDialog}
        onOpenChange={setOpenOportunidadDialog}
        defaultFecha={dialogDefaults.fecha}
        defaultHora={dialogDefaults.hora}
        oportunidadPadreId={dialogDefaults.oportunidadPadreId}
        oportunidad={selectedOportunidad}
        recordType={dialogType}
        onSuccess={() => {
          setOpenOportunidadDialog(false);
          setSelectedOportunidad(null);
          loadOportunidades();
        }}
      />

      <AbsencesSheet
        open={openAbsences}
        onOpenChange={setOpenAbsences}
        ausencias={ausencias}
        onEdit={editarAusencia}
        onDelete={eliminarAusencia}
      />
    </div>
  );
}