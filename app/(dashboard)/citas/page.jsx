"use client";

import { useEffect, useState, useRef } from "react";
import {
    format,
    addWeeks,
    subWeeks,
    startOfWeek,
    addDays
} from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem
} from "@/components/ui/select";

import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

import UserAbsenceDialog from "@/app/components/user-absences/AbsenceDialog";
import EditCitaDialog from "@/app/components/citas/CitaEditDialog";
import AbsencesSheet from "@/app/components/user-absences/AbsencesSheet";

export default function CitasPage() {

    const menuRef = useRef(null);

    const [centros, setCentros] = useState([]);
    const [centroId, setCentroId] = useState(null);

    const [horario, setHorario] = useState(null);
    const [slots, setSlots] = useState([]);

    const [citas, setCitas] = useState([]);

    const [asesores, setAsesores] = useState([]);
    const [asesorFiltro, setAsesorFiltro] = useState("all");
    const [estadoFiltro, setEstadoFiltro] = useState("all");

    const [openAbsences, setOpenAbsences] = useState(false);
    const [ausencias, setAusencias] = useState([]);
    const [weekStart, setWeekStart] = useState(
        startOfWeek(new Date(), { weekStartsOn: 1 })
    );

    const [menuCell, setMenuCell] = useState(null);
    const [openAbsence, setOpenAbsence] = useState(false);
    const [openEdit, setOpenEdit] = useState(false);
    const [selectedCita, setSelectedCita] = useState(null);

    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

    // cerrar menú correctamente
    useEffect(() => {
        function close(e) {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setMenuCell(null);
            }
        }
        document.addEventListener("mousedown", close);
        return () => document.removeEventListener("mousedown", close);
    }, []);

    // centros
    useEffect(() => {
        fetch("/api/centros")
            .then(r => r.json())
            .then(data => {
                setCentros(data || []);
                if (data?.length) setCentroId(data[0].id);
            });
    }, []);

    // asesores
    useEffect(() => {
        fetch("/api/usuarios")
            .then(r => r.json())
            .then(setAsesores);
    }, []);

    // horario centro
    useEffect(() => {
        if (!centroId) return;

        fetch(`/api/horacitas_centro/by-centro/${centroId}`)
            .then(r => r.json())
            .then(setHorario)
            .catch(() => setHorario(null));

    }, [centroId]);

    // generar slots
    useEffect(() => {
        if (!horario) return;

        const minutes = horario.slot_minutes || 30;
        const firstActive = Object.values(horario.week_json).find(d => d.active);
        if (!firstActive) return;

        const arr = [];
        let [h, m] = firstActive.start.split(":").map(Number);
        const [eh, em] = firstActive.end.split(":").map(Number);

        while (h < eh || (h === eh && m < em)) {
            arr.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
            m += minutes;
            if (m >= 60) { h++; m -= 60; }
        }
        setSlots(arr);
    }, [horario]);

    // cargar citas
    useEffect(() => {
        if (!centroId) return;

        const start = format(days[0], "yyyy-MM-dd");
        const end = format(days[6], "yyyy-MM-dd");

        fetch(`/api/citas?centro_id=${centroId}&start=${start}&end=${end}`)
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) setCitas(data);
                else if (data.rows) setCitas(data.rows);
                else setCitas([]);
            })
            .catch(() => setCitas([]));

    }, [centroId, weekStart]);
    useEffect(() => {

        if (!centroId) return;

        const start = format(days[0], "yyyy-MM-dd");
        const end = format(days[6], "yyyy-MM-dd");

        fetch(`/api/user-absences?centro_id=${centroId}&start=${start}&end=${end}`)
            .then(r => r.json())
            .then(data => {
                if (Array.isArray(data)) setAusencias(data);
                else if (data.rows) setAusencias(data.rows);
                else setAusencias([]);
            })
            .catch(() => setAusencias([]));

    }, [centroId, weekStart]);

    // ===== helpers =====

    const dayMap = ["domingo", "lunes", "martes", "miercoles", "jueves", "viernes", "sabado"];

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
        return new Date(date).toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit", hour12: false });
    }

    function toLocalDate(date) {
        return new Date(date).toISOString().slice(0, 10);
    }
    function eliminarAusencia(id) {
        if (!confirm("Eliminar ausencia?")) return;

        fetch(`/api/user-absences/${id}`, {
            method: "DELETE"
        }).then(() => {
            setAusencias(prev => prev.filter(a => a.id !== id));
        });
    }

    function editarAusencia(a) {
        setOpenAbsence(true); // abre dialog existente
    }

    function getCitas(day, hour) {
        const date = format(day, "yyyy-MM-dd");

        return citas.filter(c => {
            if (asesorFiltro !== "all" && c.asesor_id != asesorFiltro) return false;
            if (estadoFiltro !== "all" && c.estado != estadoFiltro) return false;
            return toLocalDate(c.start_at) === date &&
                toLocalHour(c.start_at) === hour;
        });
    }

    function openMenu(day, hour, e) {
        e.stopPropagation();
        setMenuCell({ day, hour });
    }

    function openCita(c) {
        setSelectedCita(c);
        setOpenEdit(true);
    }

    return (
        <div className="space-y-4">

            {/* HEADER */}
            <div className="flex flex-wrap gap-3 items-center">

                <span className="font-semibold">
                    {format(days[0], "dd MMM", { locale: es })} -
                    {format(days[6], "dd MMM", { locale: es })}
                </span>

                <Button size="icon" onClick={() => setWeekStart(subWeeks(weekStart, 1))}><ChevronLeft /></Button>
                <Button size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}><ChevronRight /></Button>
                <Button onClick={() => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }))}>Hoy</Button>

                <Select value={centroId ? String(centroId) : ""} onValueChange={v => setCentroId(Number(v))}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Centro" /></SelectTrigger>
                    <SelectContent>
                        {centros.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nombre}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select value={asesorFiltro} onValueChange={setAsesorFiltro}>
                    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Asesor" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        {asesores.map(a => <SelectItem key={a.id} value={String(a.id)}>{a.fullname}</SelectItem>)}
                    </SelectContent>
                </Select>

                <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                    <SelectTrigger className="w-[160px]"><SelectValue placeholder="Estado" /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="confirmada">Confirmada</SelectItem>
                        <SelectItem value="pendiente">Pendiente</SelectItem>
                        <SelectItem value="cancelada">Cancelada</SelectItem>
                    </SelectContent>
                </Select>

                <div className="flex gap-2">
                    <Button onClick={() => window.location.href = "/citas/nueva"}>
                        <Calendar className="w-4 h-4 mr-2" />Nueva cita
                    </Button>

                    <Button variant="outline" onClick={() => setOpenAbsences(true)}>
                        Ver ausencias
                    </Button>
                </div>
            </div>

            {/* GRID */}
            <div className="border rounded overflow-hidden">

                {/* DIAS */}
                <div className="grid grid-cols-[80px_repeat(7,1fr)]">
                    <div />
                    {days.map(d => (
                        <div key={d} className="p-2 text-center font-medium border-l">
                            {format(d, "EEEE dd", { locale: es })}
                        </div>
                    ))}
                </div>

                {/* HORAS */}
                {slots.map(h => (
                    <div key={h} className="grid grid-cols-[80px_repeat(7,1fr)]">
                        <div className="border-t p-2 text-sm text-gray-500">{h}</div>

                        {days.map(d => {
                            const citasSlot = getCitas(d, h);
                            const blocked = !enabled(d, h) || past(d, h);

                            return (
                                <div
                                    key={d + h}
                                    className={`border-t border-l h-16 relative ${blocked ? "bg-gray-100 cursor-not-allowed" : "hover:bg-[#5e17eb]/10 cursor-pointer"
                                        }`}
                                    onClick={(e) => {
                                        if (citasSlot.length) return openCita(citasSlot[0]);
                                        if (blocked) return;
                                        openMenu(d, h, e);
                                    }}
                                >

                                    {/* CITAS */}
                                    {citasSlot.map((c, i) => (
                                        <div
                                            key={i}
                                            className="absolute inset-1 rounded shadow border text-[10px] p-1 overflow-hidden bg-white"
                                        >
                                            <div className="h-1 mb-1 rounded"
                                                style={{ background: c.color || "#5e17eb" }}
                                            />
                                            <div className="font-semibold">{c.placa}</div>
                                            <div className="truncate">{c.cliente}</div>
                                            <div className="truncate">{c.asesor}</div>
                                            <div className="text-[9px]">{c.estado}</div>
                                        </div>
                                    ))}

                                    {/* MENU */}
                                    {menuCell &&
                                        menuCell.day === d &&
                                        menuCell.hour === h && (
                                            <div
                                                ref={menuRef}
                                                onClick={(e) => e.stopPropagation()}
                                                className="absolute z-10 bg-white border rounded shadow p-2 top-2 left-2 w-40"
                                            >
                                                <button
                                                    className="block w-full text-left hover:bg-gray-100 px-2 py-1"
                                                    onClick={() => window.location.href = "/citas/nueva"}
                                                >
                                                    Nueva cita
                                                </button>

                                                <button
                                                    className="block w-full text-left hover:bg-gray-100 px-2 py-1"
                                                    onClick={() => {
                                                        setMenuCell(null);
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

            <UserAbsenceDialog open={openAbsence} onOpenChange={setOpenAbsence} />
            <EditCitaDialog open={openEdit} onOpenChange={setOpenEdit} cita={selectedCita} />
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
