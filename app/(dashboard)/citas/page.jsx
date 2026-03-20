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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar, 
  CalendarClock, 
  Plus,
  X,
  AlertCircle,
  Users,
  Check
} from "lucide-react";

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
  const [clientesTotales, setClientesTotales] = useState([]);
  
  const [asesorFiltro, setAsesorFiltro] = useState("all");
  const [estadoFiltro, setEstadoFiltro] = useState("all");
  const [tipoFiltro, setTipoFiltro] = useState("all");
  const [clienteFiltro, setClienteFiltro] = useState("all");
  const [vistaFiltro, setVistaFiltro] = useState("semana");

  const [openAbsences, setOpenAbsences] = useState(false);
  const [openAbsence, setOpenAbsence] = useState(false);
  const [openResumen, setOpenResumen] = useState(false);
  const [openOportunidadDialog, setOpenOportunidadDialog] = useState(false);
  const [openClientePopover, setOpenClientePopover] = useState(false);

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

  // ===== LOAD CLIENTES TOTALES (GENERAL) =====
  async function loadClientesTotales() {
    if (!centroId) {
      setClientesTotales([]);
      return;
    }

    if (userCentros.length > 0 && !userCentros.includes(Number(centroId))) {
      setClientesTotales([]);
      return;
    }

    try {
      const r = await fetch(`/api/citas?centro_id=${centroId}`, { 
        cache: "no-store" 
      });
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

      const clientesUnicos = new Map();
      lista.forEach((c) => {
        if (c.cliente && c.cliente.trim()) {
          clientesUnicos.set(c.cliente.trim(), {
            id: c.cliente_id || c.cliente,
            nombre: c.cliente.trim(),
          });
        }
      });
      
      setClientesTotales(Array.from(clientesUnicos.values()).sort((a, b) => 
        a.nombre.localeCompare(b.nombre)
      ));
    } catch {
      setClientesTotales([]);
    }
  }

  useEffect(() => {
    if (scopeLoading) return;
    loadClientesTotales();
  }, [centroId, scopeLoading, userCentros, userTalleres]);

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

      if (clienteFiltro !== "all" && c.cliente?.trim() !== clienteFiltro) {
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

  return (
    <TooltipProvider>
      <div className="flex flex-col h-screen overflow-hidden bg-white">
        
        {/* HEADER - STICKY */}
        <div className="flex-shrink-0 space-y-4 p-4 border-b">
          
          {/* Título y navegación */}
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar size={24} className="text-blue-600" />
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">Calendario de Citas</h1>
                  <p className="text-sm text-gray-600">
                    {vistaFiltro === "semana" 
                      ? `${format(days[0], "dd MMM", { locale: es })} - ${format(days[6], "dd MMM", { locale: es })}`
                      : `${format(monthStart, "MMMM yyyy", { locale: es })}`
                    }
                  </p>
                </div>
              </div>

              <div className="flex gap-1">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => 
                        vistaFiltro === "semana" 
                          ? setWeekStart(subWeeks(weekStart, 1))
                          : setMonthStart(subMonths(monthStart, 1))
                      }
                    >
                      <ChevronLeft size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {vistaFiltro === "semana" ? "Semana anterior" : "Mes anterior"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => 
                        vistaFiltro === "semana"
                          ? setWeekStart(addWeeks(weekStart, 1))
                          : setMonthStart(addMonths(monthStart, 1))
                      }
                    >
                      <ChevronRight size={18} />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {vistaFiltro === "semana" ? "Semana siguiente" : "Mes siguiente"}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
                        setMonthStart(startOfMonth(new Date()));
                      }}
                    >
                      Hoy
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Ir a hoy</TooltipContent>
                </Tooltip>
              </div>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => (window.location.href = "/citas/nueva")}
                    disabled={!centroId}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                    size="sm"
                  >
                    <Calendar size={16} />
                    Nueva cita
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Crear nueva cita</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
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
                    className="bg-green-600 hover:bg-green-700 text-white gap-2"
                    size="sm"
                  >
                    <Plus size={16} />
                    Nueva oportunidad
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Crear nueva oportunidad</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={() => setOpenAbsences(true)} 
                    disabled={!centroId}
                    size="sm"
                  >
                    Ver ausencias
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Ver ausencias registradas</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* FILTROS - ROW 1 */}
          <div className="flex flex-wrap gap-2 items-center p-3 bg-slate-50 rounded-lg border border-slate-200">
            
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Select
                    value={centroId ? String(centroId) : ""}
                    onValueChange={(v) => setCentroId(Number(v))}
                    disabled={scopeLoading || centros.length === 0}
                  >
                    <SelectTrigger className="w-[140px] h-9">
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
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">Selecciona el centro</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Select value={asesorFiltro} onValueChange={setAsesorFiltro}>
                    <SelectTrigger className="w-[140px] h-9">
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
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">Filtrar por asesor</TooltipContent>
            </Tooltip>

            {/* ✅ FILTRO DE CLIENTE RESTAURADO */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Popover open={openClientePopover} onOpenChange={setOpenClientePopover}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-[140px] justify-between h-9"
                    >
                      <span className="truncate flex items-center gap-1">
                        <Users size={12} />
                        {clienteFiltro === "all" 
                          ? "Cliente" 
                          : clienteFiltro.length > 10 
                            ? clienteFiltro.substring(0, 10) + "..." 
                            : clienteFiltro
                        }
                      </span>
                      {clienteFiltro !== "all" && (
                        <X
                          size={12}
                          onClick={(e) => {
                            e.stopPropagation();
                            setClienteFiltro("all");
                          }}
                        />
                      )}
                    </Button>
                  </PopoverTrigger>
                  
                  <PopoverContent className="w-[160px] p-0">
                    <Command>
                      <CommandInput placeholder="Buscar cliente..." className="h-8 text-xs" />
                      <CommandList>
                        <CommandEmpty>No encontrado.</CommandEmpty>
                        <CommandGroup>
                          <CommandItem
                            value="all"
                            onSelect={() => {
                              setClienteFiltro("all");
                              setOpenClientePopover(false);
                            }}
                            className="cursor-pointer text-xs"
                          >
                            <Check
                              size={12}
                              className={`mr-1 ${
                                clienteFiltro === "all"
                                  ? "opacity-100"
                                  : "opacity-0"
                              }`}
                            />
                            Todos los clientes
                          </CommandItem>

                          {clientesTotales.map((cliente) => (
                            <CommandItem
                              key={cliente.id}
                              value={cliente.nombre}
                              onSelect={() => {
                                setClienteFiltro(cliente.nombre);
                                setOpenClientePopover(false);
                              }}
                              className="cursor-pointer text-xs"
                            >
                              <Check
                                size={12}
                                className={`mr-1 ${
                                  clienteFiltro === cliente.nombre
                                    ? "opacity-100"
                                    : "opacity-0"
                                }`}
                              />
                              {cliente.nombre.length > 15
                                ? cliente.nombre.substring(0, 15) + "..."
                                : cliente.nombre}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </TooltipTrigger>
              <TooltipContent side="top">Filtrar por cliente (búsqueda general)</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                    <SelectTrigger className="w-[120px] h-9">
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
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">Filtrar por estado</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-0.5 border rounded p-0.5 bg-white h-9">
                  <Button
                    type="button"
                    variant={tipoFiltro === "all" ? "default" : "ghost"}
                    onClick={() => setTipoFiltro("all")}
                    size="sm"
                    className="text-xs h-8"
                  >
                    Todos
                  </Button>
                  <Button
                    type="button"
                    variant={tipoFiltro === "op" ? "default" : "ghost"}
                    onClick={() => setTipoFiltro("op")}
                    size="sm"
                    className="text-xs h-8"
                  >
                    OP
                  </Button>
                  <Button
                    type="button"
                    variant={tipoFiltro === "ld" ? "default" : "ghost"}
                    onClick={() => setTipoFiltro("ld")}
                    size="sm"
                    className="text-xs h-8"
                  >
                    LD
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">Filtrar por tipo</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <Select value={vistaFiltro} onValueChange={setVistaFiltro}>
                    <SelectTrigger className="w-[110px] h-9">
                      <SelectValue placeholder="Vista" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="semana">Semana</SelectItem>
                      <SelectItem value="mes">Mes</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">Cambiar vista</TooltipContent>
            </Tooltip>
          </div>

          {!scopeLoading && centros.length === 0 && (
            <div className="border border-amber-200 rounded p-3 bg-amber-50 flex gap-2">
              <AlertCircle className="text-amber-600 flex-shrink-0" size={18} />
              <div className="text-xs">
                <p className="font-medium text-amber-900">No tienes centros asignados</p>
                <p className="text-amber-700">Contacta administración</p>
              </div>
            </div>
          )}
        </div>

        {/* CALENDARIO - CON SCROLL */}
        {canShowGrid && (
          <div className="flex-1 overflow-auto bg-white">
            <table className="w-full text-xs border-collapse">
              
              {/* HEADER - STICKY */}
              <thead className="sticky top-0 z-20 bg-white">
                <tr className="bg-slate-50 border-b">
                  <th className="border-r p-2 text-center font-semibold text-slate-700 bg-slate-100 w-16 min-w-16 sticky left-0 z-30">
                    Hora
                  </th>
                  {days.map((d) => (
                    <th 
                      key={d.toISOString()} 
                      className="border-r p-2 text-center font-semibold text-slate-900 bg-blue-50 min-w-[120px] w-[120px]"
                    >
                      <div className="text-sm font-bold">{format(d, "EEE", { locale: es })}</div>
                      <div className="text-xs text-gray-600">{format(d, "dd MMM", { locale: es })}</div>
                    </th>
                  ))}
                </tr>
              </thead>

              {/* BODY */}
              <tbody>
                {slots.map((h) => (
                  <tr key={h} className="border-b hover:bg-slate-50/50">
                    <td className="border-r p-2 text-xs font-semibold text-gray-600 bg-slate-50 sticky left-0 z-10 text-center w-16 min-w-16">
                      {h}
                    </td>

                    {days.map((d) => {
                      const citasSlot = getCitas(d, h);
                      const oportunidadesSlot = getOportunidades(d, h);
                      const blocked = !enabled(d, h) || past(d, h);
                      const dayString = format(d, "yyyy-MM-dd");

                      return (
                        <td
                          key={`${dayString}-${h}`}
                          className={`border-r p-1 relative min-h-16 ${
                            blocked
                              ? "bg-gray-100 cursor-not-allowed"
                              : "hover:bg-blue-50/50 cursor-pointer transition-colors"
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
                          <div className="space-y-0.5 text-[9px]">
                            {/* CITAS */}
                            {citasSlot.map((c, i) => (
                              <div
                                key={`cita-${i}`}
                                className="rounded p-1 bg-white border border-slate-200 cursor-pointer hover:shadow-sm transition-shadow truncate"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openCita(c);
                                }}
                                title={`${c.placa} - ${c.cliente}`}
                              >
                                <div
                                  className="h-0.5 rounded-full mb-0.5"
                                  style={{ background: c.color || "#5e17eb" }}
                                />
                                <div className="font-semibold truncate">{c.placa}</div>
                                <div className="truncate">{c.cliente}</div>
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
                                  className="rounded p-1 bg-white border border-slate-200 cursor-pointer hover:shadow-sm transition-shadow truncate"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOportunidad(o);
                                    setDialogType(tipo);
                                    setOpenOportunidadDialog(true);
                                  }}
                                  title={`${o.oportunidad_id} - ${o.cliente_name}`}
                                >
                                  <div className="flex items-center justify-between gap-0.5">
                                    <div className="font-semibold truncate flex items-center gap-0.5 flex-1">
                                      {o.oportunidad_id}
                                      <CalendarClock
                                        className="w-2 h-2 flex-shrink-0"
                                        style={{ color: colorTiempo }}
                                      />
                                    </div>
                                    <span className="text-[8px] font-bold bg-slate-100 px-0.5 rounded">
                                      {tipo === "ld" ? "LD" : "OP"}
                                    </span>
                                  </div>
                                  <div className="truncate text-[8px]">{o.cliente_name || "Sin cliente"}</div>
                                </div>
                              );
                            })}
                          </div>

                          {/* CONTEXT MENU */}
                          {menuCell &&
                            menuCell.day === dayString &&
                            menuCell.hour === h && (
                              <div
                                ref={menuRef}
                                onClick={(e) => e.stopPropagation()}
                                className="absolute z-50 bg-white border border-slate-300 rounded shadow-lg p-1 top-1 left-1 w-32 space-y-0.5"
                              >
                                <button
                                  className="block w-full text-left hover:bg-slate-100 px-2 py-1 rounded text-xs font-medium transition-colors"
                                  onClick={() => {
                                    window.location.href = "/citas/nueva";
                                  }}
                                >
                                  Nueva cita
                                </button>

                                <button
                                  className="block w-full text-left hover:bg-slate-100 px-2 py-1 rounded text-xs font-medium transition-colors"
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
                                  className="block w-full text-left hover:bg-slate-100 px-2 py-1 rounded text-xs font-medium transition-colors"
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
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* DIALOGS */}
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
    </TooltipProvider>
  );
}