"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";

import {
    CalendarClock,
    ChevronLeft,
    ChevronRight,
    Plus,
    Filter,
    Search,
    X,
    Calendar as CalendarIcon,
    Loader,
    AlertCircle,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";
import OportunidadDialog from "@/app/components/oportunidades/OportunidadDialog";
import { useUserScope } from "@/hooks/useUserScope";

export default function AgendaPage() {
    const { permissions } = useAuth();

    const permView = hasPermission(permissions, "agenda", "view");
    const permCreate = hasPermission(permissions, "agenda", "create");

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
    const [estadosTiempo, setEstadosTiempo] = useState([]);

    const [createdByFilter, setCreatedByFilter] = useState("all");
    const [assignedToFilter, setAssignedToFilter] = useState("all");
    const [clienteFilter, setClienteFilter] = useState("all");
    const [tipoFilter, setTipoFilter] = useState("all");
    const [vistaFiltro, setVistaFiltro] = useState("semana");

    const [clienteSearchOpen, setClienteSearchOpen] = useState(false);
    const [clienteSearch, setClienteSearch] = useState("");

    const [openOportunidadDialog, setOpenOportunidadDialog] = useState(false);
    const [dialogType, setDialogType] = useState("op");
    const [dialogDefaults, setDialogDefaults] = useState({
        fecha: "",
        hora: "",
        oportunidadPadreId: "",
    });

    const [selectedOportunidad, setSelectedOportunidad] = useState(null);
    const [menuCell, setMenuCell] = useState(null);

    const [weekStart, setWeekStart] = useState(
        startOfWeek(new Date(), { weekStartsOn: 1 })
    );
    const [monthStart, setMonthStart] = useState(startOfMonth(new Date()));

    // ==================== CÁLCULOS ====================
    const days = useMemo(() => {
        if (vistaFiltro === "semana") {
            return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
        }
        return eachDayOfInterval({
            start: monthStart,
            end: endOfMonth(monthStart),
        });
    }, [vistaFiltro, weekStart, monthStart]);

    // ==================== EFFECT: ESTADOS DE TIEMPO ====================
    useEffect(() => {
        fetch("/api/configuracion-estados-tiempo", { cache: "no-store" })
            .then((r) => r.json())
            .then((data) => setEstadosTiempo(Array.isArray(data) ? data : []))
            .catch(() => setEstadosTiempo([]));
    }, []);

    // ==================== EFFECT: CERRAR MENÚ ====================
    useEffect(() => {
        function close(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuCell(null);
            }
        }

        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    // ==================== EFFECT: CARGAR CENTROS ====================
    useEffect(() => {
        if (scopeLoading) return;

        fetch("/api/centros", { cache: "no-store" })
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

    // ==================== EFFECT: CARGAR HORARIO ====================
    useEffect(() => {
        if (!centroId) {
            setHorario(null);
            return;
        }

        fetch(`/api/agendacitas_centro/by-centro/${centroId}`, {
            cache: "no-store",
        })
            .then((r) => r.json())
            .then(setHorario)
            .catch(() => setHorario(null));
    }, [centroId]);

    // ==================== EFFECT: GENERAR SLOTS ====================
    useEffect(() => {
        if (!horario?.week_json) {
            setSlots([]);
            return;
        }

        const minutes = Number(horario.slot_minutes || 30);
        const activos = Object.values(horario.week_json).filter((d) => d?.active);

        if (!activos.length) {
            setSlots([]);
            return;
        }

        let minStart = "23:59";
        let maxEnd = "00:00";

        activos.forEach((d) => {
            if (d.start < minStart) minStart = d.start;
            if (d.end > maxEnd) maxEnd = d.end;
        });

        const arr = [];
        let [h, m] = minStart.split(":").map(Number);
        const [eh, em] = maxEnd.split(":").map(Number);

        while (h < eh || (h === eh && m < em)) {
            arr.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
            m += minutes;
            if (m >= 60) {
                h++;
                m -= 60;
            }
        }

        setSlots(arr);
    }, [horario]);

    // ==================== EFFECT: CARGAR OPORTUNIDADES ====================
    useEffect(() => {
        if (scopeLoading) return;
        loadOportunidades();
    }, [weekStart, monthStart, vistaFiltro, scopeLoading, tipoFilter]);

    // ==================== HELPERS ====================
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

    function toMinutesFromHourString(value) {
        if (!value) return null;
        const parts = String(value).trim().split(":");
        const hh = Number(parts[0] || 0);
        const mm = Number(parts[1] || 0);
        if (Number.isNaN(hh) || Number.isNaN(mm)) return null;
        return hh * 60 + mm;
    }

    function getSlotRange(slotHour) {
        const start = toMinutesFromHourString(slotHour);
        const duration = Number(horario?.slot_minutes || 30);
        if (start == null) return null;
        return { start, end: start + duration };
    }

    function enabled(day, hour) {
        if (!horario) return true;
        const dayMap = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];
        const cfg = horario.week_json?.[dayMap[day.getDay()]];
        if (!cfg?.active) return false;

        const slotMinutes = toMinutesFromHourString(hour);
        const startMinutes = toMinutesFromHourString(cfg.start);
        const endMinutes = toMinutesFromHourString(cfg.end);

        if (slotMinutes == null || startMinutes == null || endMinutes == null) return false;
        return slotMinutes >= startMinutes && slotMinutes < endMinutes;
    }

    function past(day, hour) {
        const now = new Date();
        const minutes = toMinutesFromHourString(hour);
        if (minutes == null) return false;

        const hh = Math.floor(minutes / 60);
        const mm = minutes % 60;

        const slotDate = new Date(day);
        slotDate.setHours(hh, mm, 0, 0);

        return slotDate < now;
    }

    function getOportunidades(day, hour) {
        const date = format(day, "yyyy-MM-dd");
        const slotRange = getSlotRange(hour);
        if (!slotRange) return [];

        return filteredOportunidades.filter((o) => {
            const fecha = normalizeDate(o.fecha_agenda);
            const minutosOportunidad = toMinutesFromHourString(o.hora_agenda);

            if (!fecha || minutosOportunidad == null) return false;
            if (fecha !== date) return false;

            return (
                minutosOportunidad >= slotRange.start &&
                minutosOportunidad < slotRange.end
            );
        });
    }

    function isNuevoStage(oportunidad) {
        const etapa = String(oportunidad?.etapa_name || "").trim().toLowerCase();
        return etapa === "nuevo";
    }

    function shouldPaintAsReprogramado(oportunidad) {
        const hasPadre =
            oportunidad?.oportunidad_padre_id !== null &&
            oportunidad?.oportunidad_padre_id !== undefined &&
            String(oportunidad.oportunidad_padre_id).trim() !== "";
        return hasPadre && isNuevoStage(oportunidad);
    }

    function getVisualColor(oportunidad) {
        if (shouldPaintAsReprogramado(oportunidad)) return "#8b5cf6";
        const tipo = getTipoCodigo(oportunidad?.oportunidad_id);
        if (tipo === "ld") return "#0ea5e9";
        if (
            typeof oportunidad?.etapa_color === "string" &&
            oportunidad.etapa_color.trim()
        ) {
            return oportunidad.etapa_color.trim();
        }
        return "#f97316";
    }

    function getCardStyle(oportunidad) {
        const safeColor = getVisualColor(oportunidad);
        return {
            borderLeft: `4px solid ${safeColor}`,
            backgroundColor: `${safeColor}15`,
        };
    }

    function getEtapaVisualText(oportunidad) {
        if (shouldPaintAsReprogramado(oportunidad)) return "Reprogramado";
        return oportunidad?.etapa_name || oportunidad?.origen_name || "-";
    }

    function getMinutosRestantes(fechaAgenda, horaAgenda) {
        if (!fechaAgenda || !horaAgenda) return null;
        try {
            const fechaStr = String(fechaAgenda).trim().split("T")[0];
            const horaStr = String(horaAgenda).trim().split(":").slice(0, 2).join(":");
            const fechaHoraString = `${fechaStr}T${horaStr}:00`;

            const ahora = new Date();
            const agendaDateTime = new Date(fechaHoraString);

            if (isNaN(agendaDateTime.getTime())) return null;

            const diferencia = agendaDateTime.getTime() - ahora.getTime();
            return Math.floor(diferencia / 1000 / 60);
        } catch {
            return null;
        }
    }

    function getColorEstadoTiempo(minutosRestantes, etapasconversion_id) {
        if (etapasconversion_id !== 1 && etapasconversion_id !== 2) return "#28a745";
        if (minutosRestantes === null) return "#6b7280";

        const estadoActivo = estadosTiempo.find(
            (e) =>
                e.activo &&
                minutosRestantes >= e.minutos_desde &&
                minutosRestantes <= e.minutos_hasta
        );

        return estadoActivo?.color_hexadecimal || "#6b7280";
    }

    function openMenu(day, hour, e) {
        e.stopPropagation();
        setMenuCell({
            day: format(day, "yyyy-MM-dd"),
            hour,
        });
    }

    // ==================== LOAD OPORTUNIDADES ====================
    async function loadOportunidades() {
        try {
            const fecha_desde = format(days[0], "yyyy-MM-dd");
            const fecha_hasta = format(days[days.length - 1], "yyyy-MM-dd");

            const [resOp, resLd] = await Promise.all([
                fetch(
                    `/api/oportunidades?fecha_desde=${fecha_desde}&fecha_hasta=${fecha_hasta}`,
                    { cache: "no-store" }
                ),
                fetch(
                    `/api/leads?fecha_desde=${fecha_desde}&fecha_hasta=${fecha_hasta}`,
                    { cache: "no-store" }
                ),
            ]);

            const [dataOp, dataLd] = await Promise.all([resOp.json(), resLd.json()]);

            const listaOp = Array.isArray(dataOp) ? dataOp : [];
            const listaLd = Array.isArray(dataLd) ? dataLd : [];

            let lista = [...listaOp, ...listaLd];

            if (tipoFilter === "op") {
                lista = lista.filter((o) => getTipoCodigo(o.oportunidad_id) === "op");
            } else if (tipoFilter === "ld") {
                lista = lista.filter((o) => getTipoCodigo(o.oportunidad_id) === "ld");
            }

            if (userTalleres.length > 0) {
                lista = lista.filter((o) => {
                    if (o.taller_id == null) return true;
                    return userTalleres.includes(Number(o.taller_id));
                });
            }

            lista.sort((a, b) => {
                const fa = `${normalizeDate(a.fecha_agenda)} ${String(
                    a.hora_agenda || ""
                ).slice(0, 8)}`;
                const fb = `${normalizeDate(b.fecha_agenda)} ${String(
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

    // ==================== MEMOS ====================
    const createdByOptions = useMemo(() => {
        const map = new Map();
        oportunidades.forEach((o) => {
            if (o.created_by && o.created_by_name) {
                map.set(String(o.created_by), {
                    id: String(o.created_by),
                    name: o.created_by_name,
                });
            }
        });
        return Array.from(map.values()).sort((a, b) =>
            a.name.localeCompare(b.name, "es", { sensitivity: "base" })
        );
    }, [oportunidades]);

    const assignedToOptions = useMemo(() => {
        const map = new Map();
        oportunidades.forEach((o) => {
            if (o.asignado_a && o.asignado_a_name) {
                map.set(String(o.asignado_a), {
                    id: String(o.asignado_a),
                    name: o.asignado_a_name,
                });
            }
        });
        return Array.from(map.values()).sort((a, b) =>
            a.name.localeCompare(b.name, "es", { sensitivity: "base" })
        );
    }, [oportunidades]);

    const clienteOptions = useMemo(() => {
        const map = new Map();
        oportunidades.forEach((o) => {
            if (o.cliente_name && o.id) {
                map.set(String(o.id), {
                    id: String(o.id),
                    name: o.cliente_name,
                });
            }
        });
        return Array.from(map.values())
            .sort((a, b) =>
                a.name.localeCompare(b.name, "es", { sensitivity: "base" })
            )
            .slice(0, 5);
    }, [oportunidades]);

    const filteredClienteOptions = useMemo(() => {
        if (!clienteSearch.trim()) return clienteOptions;
        return clienteOptions.filter((c) =>
            c.name.toLowerCase().includes(clienteSearch.toLowerCase())
        );
    }, [clienteOptions, clienteSearch]);

    const filteredOportunidades = useMemo(() => {
        return oportunidades.filter((o) => {
            const matchesCreatedBy =
                createdByFilter === "all" ||
                String(o.created_by) === String(createdByFilter);

            const matchesAssignedTo =
                assignedToFilter === "all" ||
                String(o.asignado_a) === String(assignedToFilter);

            const matchesCliente =
                clienteFilter === "all" ||
                String(o.id) === String(clienteFilter);

            return matchesCreatedBy && matchesAssignedTo && matchesCliente;
        });
    }, [oportunidades, createdByFilter, assignedToFilter, clienteFilter]);

    // ==================== RENDER VISTA MES ====================
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
            <div className="border rounded-lg overflow-hidden shadow-sm flex flex-col h-full">
                <div className="grid grid-cols-7 bg-gradient-to-r from-slate-50 to-slate-100 flex-shrink-0">
                    {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map((day) => (
                        <div
                            key={day}
                            className="p-2 text-center font-semibold text-slate-700 border-b text-xs"
                        >
                            {day}
                        </div>
                    ))}
                </div>

                <div className="flex-1 overflow-auto">
                    {weeksInMonth.map((week, weekIdx) => (
                        <div key={weekIdx} className="grid grid-cols-7">
                            {week.map((day, dayIdx) => {
                                if (!day) {
                                    return (
                                        <div
                                            key={`empty-${dayIdx}`}
                                            className="border p-1 bg-gray-50 min-h-20"
                                        />
                                    );
                                }

                                const dayString = format(day, "yyyy-MM-dd");
                                const dayOportunidades = filteredOportunidades.filter((o) =>
                                    normalizeDate(o.fecha_agenda) === dayString
                                );

                                return (
                                    <div
                                        key={dayString}
                                        className="border p-1 min-h-20 overflow-auto cursor-pointer hover:bg-blue-50 relative transition-colors"
                                        onClick={(e) => {
                                            if (!permCreate) return;
                                            openMenu(day, "10:00", e);
                                        }}
                                    >
                                        <div className="text-xs font-bold text-slate-900 mb-1">
                                            {format(day, "d")}
                                        </div>

                                        <div className="space-y-0.5 text-[8px]">
                                            {dayOportunidades.slice(0, 3).map((o, idx) => {
                                                const tipo = getTipoCodigo(o.oportunidad_id);
                                                const minutosRestantes = getMinutosRestantes(
                                                    o.fecha_agenda,
                                                    o.hora_agenda
                                                );
                                                const colorTiempo = getColorEstadoTiempo(
                                                    minutosRestantes,
                                                    o.etapasconversion_id
                                                );

                                                return (
                                                    <div
                                                        key={`${tipo}-${o.id}-${idx}`}
                                                        className="rounded p-0.5 truncate cursor-pointer hover:shadow-md transition-shadow line-clamp-1"
                                                        style={{
                                                            ...getCardStyle(o),
                                                            borderLeft: `2px solid ${colorTiempo}`,
                                                        }}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setMenuCell(null);
                                                            setSelectedOportunidad(o);
                                                            setDialogType(tipo);
                                                            setDialogDefaults({
                                                                fecha: o.fecha_agenda || "",
                                                                hora: o.hora_agenda || "",
                                                                oportunidadPadreId: "",
                                                            });
                                                            setOpenOportunidadDialog(true);
                                                        }}
                                                        title={o.oportunidad_id}
                                                    >
                                                        {o.oportunidad_id}
                                                    </div>
                                                );
                                            })}
                                            {dayOportunidades.length > 3 && (
                                                <div className="text-[7px] text-slate-500 px-0.5">
                                                    +{dayOportunidades.length - 3} más
                                                </div>
                                            )}
                                        </div>

                                        {menuCell &&
                                            menuCell.day === dayString &&
                                            permCreate && (
                                                <div
                                                    ref={menuRef}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="absolute z-10 bg-white border rounded shadow-lg p-2 top-2 left-2 w-40"
                                                >
                                                    <button
                                                        className="block w-full text-left hover:bg-blue-100 px-2 py-1 rounded text-xs font-medium transition-colors"
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
                                                        Nueva
                                                    </button>
                                                </div>
                                            )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // ==================== RENDER VISTA SEMANA ====================
    const renderSemanaView = () => {
        return (
            <div className="border rounded-lg overflow-hidden shadow-sm flex flex-col h-full">
                <div className="grid grid-cols-[60px_repeat(7,1fr)] bg-gradient-to-r from-slate-50 to-slate-100 flex-shrink-0">
                    <div className="p-1 font-semibold text-slate-700 text-xs" />
                    {days.map((d) => (
                        <div
                            key={d.toISOString()}
                            className="p-1 text-center font-semibold text-slate-700 border-l capitalize text-xs"
                        >
                            {format(d, "EEE", { locale: es })}
                            <div className="text-[10px] font-normal">{format(d, "dd")}</div>
                        </div>
                    ))}
                </div>

                <div className="flex-1 overflow-auto">
                    {slots.map((h) => (
                        <div key={h} className="grid grid-cols-[60px_repeat(7,1fr)]">
                            <div className="border-t p-1 text-[10px] font-semibold text-slate-600 bg-slate-50 flex-shrink-0">
                                {h}
                            </div>

                            {days.map((d) => {
                                const oportunidadesSlot = getOportunidades(d, h);
                                const blocked = !enabled(d, h) || past(d, h);
                                const dayString = format(d, "yyyy-MM-dd");

                                return (
                                    <div
                                        key={`${dayString}-${h}`}
                                        className={`border-t border-l relative min-h-16 ${
                                            blocked
                                                ? "bg-gray-100 cursor-not-allowed"
                                                : "hover:bg-blue-50/50 cursor-pointer"
                                        } transition-colors`}
                                        onClick={(e) => {
                                            if (blocked || !permCreate) return;
                                            openMenu(d, h, e);
                                        }}
                                    >
                                        <div className="absolute inset-0.5 overflow-auto space-y-0.5 text-[8px]">
                                            {oportunidadesSlot.map((o, idx) => {
                                                const tipo = getTipoCodigo(o.oportunidad_id);
                                                const minutosRestantes = getMinutosRestantes(
                                                    o.fecha_agenda,
                                                    o.hora_agenda
                                                );
                                                const colorTiempo = getColorEstadoTiempo(
                                                    minutosRestantes,
                                                    o.etapasconversion_id
                                                );

                                                return (
                                                    <div
                                                        key={`${tipo}-${o.id}-${idx}`}
                                                        className="rounded shadow-sm border p-0.5 overflow-hidden cursor-pointer hover:shadow-md transition-shadow line-clamp-2"
                                                        style={getCardStyle(o)}
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setMenuCell(null);
                                                            setSelectedOportunidad(o);
                                                            setDialogType(tipo);
                                                            setDialogDefaults({
                                                                fecha: o.fecha_agenda || "",
                                                                hora: o.hora_agenda || "",
                                                                oportunidadPadreId: "",
                                                            });
                                                            setOpenOportunidadDialog(true);
                                                        }}
                                                    >
                                                        <div className="flex items-center justify-between gap-0.5">
                                                            <span className="font-semibold truncate flex-1">
                                                                {o.oportunidad_id}
                                                            </span>
                                                            <span className="text-[7px] font-bold uppercase px-0.5 rounded bg-black/10 flex-shrink-0">
                                                                {tipo === "ld" ? "LD" : "OP"}
                                                            </span>
                                                        </div>
                                                        <div className="truncate text-slate-700">
                                                            {o.cliente_name || ""}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {menuCell &&
                                            menuCell.day === dayString &&
                                            menuCell.hour === h &&
                                            permCreate && (
                                                <div
                                                    ref={menuRef}
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="absolute z-10 bg-white border rounded shadow-lg p-2 top-1 left-1 w-40"
                                                >
                                                    <button
                                                        className="block w-full text-left hover:bg-blue-100 px-2 py-1 rounded text-xs font-medium transition-colors"
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
                                                        Nueva
                                                    </button>
                                                </div>
                                            )}
                                    </div>
                                );
                            })}
                        </div>
                    ))}
                </div>
            </div>
        );
    };

    // ==================== GUARD: NO PERMISOS ====================
    if (!permView) {
        return (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                <p className="text-sm text-amber-700">No tienes permiso para ver la agenda.</p>
            </div>
        );
    }

    const canShowGrid = !scopeLoading && !!centroId;
    const hasActiveFilters =
        clienteFilter !== "all" ||
        createdByFilter !== "all" ||
        assignedToFilter !== "all" ||
        tipoFilter !== "all";

    return (
        <TooltipProvider>
            <div className="h-screen flex flex-col gap-3 p-4 bg-white">
                {/* ==================== HEADER ====================*/}
                <div className="flex flex-col md:flex-row gap-2 items-start md:items-center pb-3 border-b flex-shrink-0">
                    <div className="flex items-center gap-2 flex-1">
                        <CalendarIcon className="w-5 h-5 text-blue-600" />
                        <div>
                            <h1 className="text-xl font-bold text-slate-900">Agenda</h1>
                            <p className="text-xs text-muted-foreground">
                                {vistaFiltro === "semana"
                                    ? `${format(days[0], "dd MMM", { locale: es })} - ${format(
                                        days[6],
                                        "dd MMM",
                                        { locale: es }
                                    )}`
                                    : format(monthStart, "MMMM yyyy", { locale: es })}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-1 items-center">
                        <div className="flex gap-1">
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            if (vistaFiltro === "semana") {
                                                setWeekStart(subWeeks(weekStart, 1));
                                            } else {
                                                setMonthStart(subMonths(monthStart, 1));
                                            }
                                        }}
                                    >
                                        <ChevronLeft size={14} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Anterior</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            if (vistaFiltro === "semana") {
                                                setWeekStart(addWeeks(weekStart, 1));
                                            } else {
                                                setMonthStart(addMonths(monthStart, 1));
                                            }
                                        }}
                                    >
                                        <ChevronRight size={14} />
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Siguiente</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                            setWeekStart(
                                                startOfWeek(new Date(), { weekStartsOn: 1 })
                                            );
                                            setMonthStart(startOfMonth(new Date()));
                                        }}
                                    >
                                        Hoy
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Volver a hoy</TooltipContent>
                            </Tooltip>
                        </div>

                        <Tooltip>
                            <TooltipTrigger asChild>
                                <Select value={vistaFiltro} onValueChange={setVistaFiltro}>
                                    <SelectTrigger className="w-[110px] h-9">
                                        <SelectValue placeholder="Vista" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="semana">Semana</SelectItem>
                                        <SelectItem value="mes">Mes</SelectItem>
                                    </SelectContent>
                                </Select>
                            </TooltipTrigger>
                            <TooltipContent side="top">Cambiar vista</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                            <TooltipTrigger asChild>
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
                            </TooltipTrigger>
                            <TooltipContent side="top">Selecciona centro</TooltipContent>
                        </Tooltip>

                        {permCreate && (
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <Button
                                        size="sm"
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
                                        className="gap-1"
                                    >
                                        <Plus size={14} />
                                        Nueva
                                    </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">Nueva oportunidad</TooltipContent>
                            </Tooltip>
                        )}
                    </div>
                </div>

                {/* ==================== FILTROS ====================*/}
                <div className="flex flex-wrap gap-2 items-center pb-3 border-b flex-shrink-0">
                    <div className="flex items-center gap-1 text-xs font-semibold text-slate-600">
                        <Filter size={12} />
                        Filtros:
                        {hasActiveFilters && (
                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-bold">
                                Activos
                            </span>
                        )}
                    </div>

                    <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
                        <SelectTrigger className="w-32 h-8">
                            <SelectValue placeholder="Creado por" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {createdByOptions.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                    {item.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
                        <SelectTrigger className="w-32 h-8">
                            <SelectValue placeholder="Asignado a" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {assignedToOptions.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                    {item.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Popover open={clienteSearchOpen} onOpenChange={setClienteSearchOpen}>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-32 h-8 justify-start text-xs"
                            >
                                <Search size={12} className="mr-1 flex-shrink-0" />
                                <span className="truncate">
                                    {clienteFilter === "all"
                                        ? "Cliente"
                                        : clienteOptions.find((c) => String(c.id) === clienteFilter)
                                            ?.name || "Cliente"}
                                </span>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[160px] p-0" side="bottom">
                            <Command>
                                <CommandInput
                                    placeholder="Buscar..."
                                    value={clienteSearch}
                                    onValueChange={setClienteSearch}
                                    className="text-xs"
                                />
                                <CommandList>
                                    <CommandEmpty>No encontrado</CommandEmpty>
                                    <CommandGroup>
                                        <CommandItem
                                            value="all"
                                            onSelect={() => {
                                                setClienteFilter("all");
                                                setClienteSearch("");
                                                setClienteSearchOpen(false);
                                            }}
                                            className="cursor-pointer text-xs"
                                        >
                                            Todos
                                        </CommandItem>
                                        {filteredClienteOptions.map((cliente) => (
                                            <CommandItem
                                                key={cliente.id}
                                                value={cliente.id}
                                                onSelect={() => {
                                                    setClienteFilter(cliente.id);
                                                    setClienteSearch("");
                                                    setClienteSearchOpen(false);
                                                }}
                                                className="cursor-pointer text-xs"
                                            >
                                                {cliente.name}
                                            </CommandItem>
                                        ))}
                                    </CommandGroup>
                                </CommandList>
                            </Command>
                        </PopoverContent>
                    </Popover>

                    <div className="flex items-center gap-1 border rounded-lg p-0.5 bg-white">
                        <Button
                            type="button"
                            size="sm"
                            variant={tipoFilter === "all" ? "default" : "ghost"}
                            onClick={() => setTipoFilter("all")}
                            className="h-6 text-xs"
                        >
                            Todos
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={tipoFilter === "op" ? "default" : "ghost"}
                            onClick={() => setTipoFilter("op")}
                            className="h-6 text-xs"
                        >
                            OP
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            variant={tipoFilter === "ld" ? "default" : "ghost"}
                            onClick={() => setTipoFilter("ld")}
                            className="h-6 text-xs"
                        >
                            LD
                        </Button>
                    </div>

                    {hasActiveFilters && (
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                                setClienteFilter("all");
                                setCreatedByFilter("all");
                                setAssignedToFilter("all");
                                setTipoFilter("all");
                            }}
                            className="gap-1 h-8 text-xs"
                        >
                            <X size={12} />
                            Limpiar
                        </Button>
                    )}
                </div>

                {/* ==================== CONTENIDO ====================*/}
                {!scopeLoading && centros.length === 0 && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
                        <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                        <p className="text-sm text-amber-700">
                            No tienes centros asignados.
                        </p>
                    </div>
                )}

                {scopeLoading && (
                    <div className="flex-1 flex justify-center items-center">
                        <Loader className="w-6 h-6 animate-spin text-blue-600" />
                    </div>
                )}

                {canShowGrid && (
                    vistaFiltro === "mes" ? renderMesView() : renderSemanaView()
                )}

                {/* ==================== DIALOG ====================*/}
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
                        setDialogDefaults({
                            fecha: "",
                            hora: "",
                            oportunidadPadreId: "",
                        });
                        loadOportunidades();
                    }}
                />
            </div>
        </TooltipProvider>
    );
}