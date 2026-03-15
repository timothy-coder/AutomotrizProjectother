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
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";
import OportunidadDialog from "@/app/components/oportunidades/OportunidadDialog";
import { useUserScope } from "@/hooks/useUserScope";

export default function AgendaPage() {
    const { permissions } = useAuth();

    const permView = hasPermission(permissions, "agenda", "view");
    const permCreate = hasPermission(permissions, "agenda", "create");
    const permEdit = hasPermission(permissions, "agenda", "edit");
    const permViewAll = hasPermission(permissions, "agenda", "viewall");

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

    const [createdByFilter, setCreatedByFilter] = useState("all");
    const [assignedToFilter, setAssignedToFilter] = useState("all");
    const [tipoFilter, setTipoFilter] = useState("all"); // all | op | ld

    const [openOportunidadDialog, setOpenOportunidadDialog] = useState(false);
    const [dialogType, setDialogType] = useState("op"); // op | ld
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

    async function loadOportunidades() {
        try {
            const fecha_desde = format(days[0], "yyyy-MM-dd");
            const fecha_hasta = format(days[6], "yyyy-MM-dd");

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

    useEffect(() => {
        if (scopeLoading) return;
        loadOportunidades();
    }, [weekStart, scopeLoading, tipoFilter]);

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

    const filteredOportunidades = useMemo(() => {
        return oportunidades.filter((o) => {
            const matchesCreatedBy =
                createdByFilter === "all" ||
                String(o.created_by) === String(createdByFilter);

            const matchesAssignedTo =
                assignedToFilter === "all" ||
                String(o.asignado_a) === String(assignedToFilter);

            return matchesCreatedBy && matchesAssignedTo;
        });
    }, [oportunidades, createdByFilter, assignedToFilter]);

    const dayMap = [
        "domingo",
        "lunes",
        "martes",
        "miercoles",
        "jueves",
        "viernes",
        "sabado",
    ];

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

        return {
            start,
            end: start + duration,
        };
    }

    function enabled(day, hour) {
        if (!horario) return true;

        const cfg = horario.week_json?.[dayMap[day.getDay()]];
        if (!cfg?.active) return false;

        const slotMinutes = toMinutesFromHourString(hour);
        const startMinutes = toMinutesFromHourString(cfg.start);
        const endMinutes = toMinutesFromHourString(cfg.end);

        if (
            slotMinutes == null ||
            startMinutes == null ||
            endMinutes == null
        ) {
            return false;
        }

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
        const etapa = String(oportunidad?.etapa_name || "")
            .trim()
            .toLowerCase();
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
        if (shouldPaintAsReprogramado(oportunidad)) {
            return "#8b5cf6";
        }

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
        if (shouldPaintAsReprogramado(oportunidad)) {
            return "Reprogramado";
        }

        return oportunidad?.etapa_name || oportunidad?.origen_name || "-";
    }

    function openMenu(day, hour, e) {
        e.stopPropagation();
        setMenuCell({
            day: format(day, "yyyy-MM-dd"),
            hour,
        });
    }

    const canShowGrid = !scopeLoading && !!centroId;

    if (!permView) {
        return (
            <div className="border rounded-md p-4 text-sm text-muted-foreground">
                No tienes permiso para ver la agenda.
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-3 items-center">
                <span className="font-semibold">
                    {format(days[0], "dd MMM", { locale: es })} -{" "}
                    {format(days[6], "dd MMM", { locale: es })}
                </span>

                <Button size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}>
                    <ChevronLeft />
                </Button>

                <Button size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
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

                <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
                    <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Filtrar creado por" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los creadores</SelectItem>
                        {createdByOptions.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                                {item.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <Select value={assignedToFilter} onValueChange={setAssignedToFilter}>
                    <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder="Filtrar asignado a" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos los asignados</SelectItem>
                        {assignedToOptions.map((item) => (
                            <SelectItem key={item.id} value={item.id}>
                                {item.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                <div className="flex items-center gap-2 border rounded-md p-1">
                    <Button
                        type="button"
                        variant={tipoFilter === "all" ? "default" : "ghost"}
                        onClick={() => setTipoFilter("all")}
                    >
                        Todos
                    </Button>

                    <Button
                        type="button"
                        variant={tipoFilter === "op" ? "default" : "ghost"}
                        onClick={() => setTipoFilter("op")}
                    >
                        OP
                    </Button>

                    <Button
                        type="button"
                        variant={tipoFilter === "ld" ? "default" : "ghost"}
                        onClick={() => setTipoFilter("ld")}
                    >
                        LD
                    </Button>
                </div>

                {permCreate && (
                    <Button
                        variant="outline"
                        onClick={() => {
                            setSelectedOportunidad(null);
                            setDialogType("op");
                            setDialogDefaults({
                                fecha: "",
                                hora: "",
                                oportunidadPadreId: "",
                            });
                            setOpenOportunidadDialog(true);
                        }}
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Nueva oportunidad
                    </Button>
                )}
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
                                className="p-2 text-center font-medium border-l capitalize"
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
                                        className={`border-t border-l min-h-24 relative ${blocked
                                                ? "bg-gray-100 cursor-not-allowed"
                                                : "hover:bg-[#5e17eb]/10 cursor-pointer"
                                            }`}
                                        onClick={(e) => {
                                            if (blocked || !permCreate) return;
                                            openMenu(d, h, e);
                                        }}
                                    >
                                        <div className="absolute inset-1 overflow-auto space-y-1">
                                            {oportunidadesSlot.map((o) => {
                                                const tipo = getTipoCodigo(o.oportunidad_id);

                                                return (
                                                    <div
                                                        key={`${tipo}-${o.id}`}
                                                        className="rounded shadow border text-[10px] p-1 overflow-hidden cursor-pointer"
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
                                                        <div className="flex items-center justify-between gap-2">
                                                            <div className="font-semibold">
                                                                {o.oportunidad_id || "Registro"}
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
                                                            {getEtapaVisualText(o)}
                                                        </div>

                                                        <div className="truncate text-[9px]">
                                                            {o.origen_name || ""}
                                                        </div>

                                                        <div className="truncate text-[9px]">
                                                            {o.detalle || ""}
                                                        </div>

                                                        <div className="text-[9px] text-gray-500">
                                                            {String(o.hora_agenda || "").slice(0, 8)}
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
                                                    className="absolute z-10 bg-white border rounded shadow p-2 top-2 left-2 w-48 space-y-1"
                                                >
                                                    <button
                                                        className="block w-full text-left hover:bg-gray-100 px-2 py-1 rounded"
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
    );
}
