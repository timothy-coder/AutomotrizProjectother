"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetFooter,
} from "@/components/ui/sheet";

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

import {
    Calendar,
    Clock,
    User,
    FileText,
    Pencil,
    Trash2,
    MessageSquare,
    AlertCircle,
    CheckCircle,
    Info,
    X
} from "lucide-react";

export default function AbsencesSheet({
    open,
    onOpenChange,
    ausencias = [],
    onEdit,
    onDelete,
}) {
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [target, setTarget] = useState(null);

    // ===== HELPERS =====

    function toYMD(value) {
        if (!value) return null;
        if (value.includes("T")) return value.slice(0, 10);
        if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
        const d = new Date(value);
        if (isNaN(d)) return null;
        return d.toISOString().slice(0, 10);
    }

    function formatDateAbsence(a) {
        const ymd = toYMD(a.start_date) || toYMD(a.date) || toYMD(a.end_date);
        if (!ymd) return "—";
        const [y, m, d] = ymd.split("-").map(Number);
        const local = new Date(y, m - 1, d);
        return format(local, "EEEE dd MMM yyyy", { locale: es });
    }

    function formatDateRange(a) {
        const startYmd = toYMD(a.start_date);
        const endYmd = toYMD(a.end_date);
        
        if (!startYmd) return "—";
        
        if (startYmd === endYmd || !endYmd) {
            return formatDateAbsence(a);
        }
        
        const [y1, m1, d1] = startYmd.split("-").map(Number);
        const [y2, m2, d2] = endYmd.split("-").map(Number);
        const start = new Date(y1, m1 - 1, d1);
        const end = new Date(y2, m2 - 1, d2);
        
        return `${format(start, "dd MMM", { locale: es })} - ${format(end, "dd MMM yyyy", { locale: es })}`;
    }

    function formatTime(t) {
        if (!t) return "—";
        return t.slice(0, 5);
    }

    function hours(a) {
        if (a.will_be_absent) return "Todo el día";
        const start = formatTime(a.start_time);
        const end = formatTime(a.end_time);
        if (start === "—" || end === "—") return "—";
        return `${start} - ${end}`;
    }

    function getDurationBadge(a) {
        const startYmd = toYMD(a.start_date);
        const endYmd = toYMD(a.end_date);
        
        if (!startYmd) return { label: "—", color: "bg-gray-100 text-gray-700" };
        
        if (startYmd === endYmd || !endYmd) {
            return { label: "1 día", color: "bg-blue-100 text-blue-700" };
        }
        
        const [y1, m1, d1] = startYmd.split("-").map(Number);
        const [y2, m2, d2] = endYmd.split("-").map(Number);
        const start = new Date(y1, m1 - 1, d1);
        const end = new Date(y2, m2 - 1, d2);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
        
        return { 
            label: `${days} días`, 
            color: days > 5 ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700" 
        };
    }

    // ===== DELETE =====

    function askDelete(a) {
        setTarget(a);
        setDeleteOpen(true);
    }

    async function confirmDelete() {
        try {
            await onDelete?.(target.id);

            toast.success("Ausencia eliminada", {
                description: "El registro fue removido del sistema",
            });

            setDeleteOpen(false);
            setTarget(null);
        } catch {
            toast.error("No se pudo eliminar la ausencia");
        }
    }

    return (
        <TooltipProvider>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full sm:max-w-2xl bg-gradient-to-b from-slate-50 to-white px-3">
                    
                    {/* HEADER */}
                    <SheetHeader className="pb-4 border-b">
                        <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                                <div className="p-2 bg-blue-100 rounded-lg">
                                    <Calendar className="w-5 h-5 text-blue-600" />
                                </div>
                                <div>
                                    <SheetTitle className="text-xl font-semibold text-slate-900">
                                        Ausencias registradas
                                    </SheetTitle>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {ausencias.length} ausencia{ausencias.length !== 1 ? "s" : ""} registrada{ausencias.length !== 1 ? "s" : ""}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </SheetHeader>

                    {/* CONTENIDO */}
                    <div className="mt-6 space-y-3 overflow-auto max-h-[calc(100vh-200px)] pr-4">
                        {!ausencias.length && (
                            <div className="p-6 bg-slate-50 border border-dashed rounded-lg text-center">
                                <CheckCircle size={32} className="mx-auto text-green-600 mb-2" />
                                <p className="text-sm font-medium text-slate-900">
                                    Sin ausencias registradas
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    Todo el equipo está disponible
                                </p>
                            </div>
                        )}

                        {ausencias.map((a) => {
                            const badge = getDurationBadge(a);
                            const isManyDays = a.end_date && toYMD(a.start_date) !== toYMD(a.end_date);
                            
                            return (
                                <div
                                    key={a.id}
                                    className="rounded-lg border bg-white p-4 shadow-sm hover:shadow-md transition-all hover:border-blue-300"
                                >
                                    {/* HEADER FILA */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className="p-2 bg-slate-100 rounded-full">
                                                <User size={16} className="text-slate-600" />
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">
                                                    {a.usuario || `Usuario ${a.user_id}`}
                                                </p>
                                                <span className={`inline-block text-xs font-semibold px-2 py-1 rounded-full ${badge.color} mt-1`}>
                                                    {badge.label}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* DETALLES */}
                                    <div className="space-y-2 ml-11">
                                        
                                        {/* FECHA */}
                                        <div className="flex items-center gap-2 text-sm">
                                            <Calendar size={14} className="text-blue-600 flex-shrink-0" />
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <span className="text-slate-900 font-medium cursor-help">
                                                        {isManyDays ? formatDateRange(a) : formatDateAbsence(a)}
                                                    </span>
                                                </TooltipTrigger>
                                                <TooltipContent side="right">
                                                    Período de ausencia
                                                </TooltipContent>
                                            </Tooltip>
                                        </div>

                                        {/* HORA */}
                                        {hours(a) !== "—" && (
                                            <div className="flex items-center gap-2 text-sm">
                                                <Clock size={14} className="text-purple-600 flex-shrink-0" />
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-slate-900 font-medium cursor-help">
                                                            {hours(a)}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right">
                                                        {a.will_be_absent ? "Ausencia todo el día" : "Horario específico"}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        )}

                                        {/* MOTIVO */}
                                        {a.reason && (
                                            <div className="flex items-start gap-2 text-sm">
                                                <FileText size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-slate-900 font-medium line-clamp-1 cursor-help">
                                                            {a.reason}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" className="max-w-xs">
                                                        {a.reason}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        )}

                                        {/* NOTAS */}
                                        {a.notes && (
                                            <div className="flex items-start gap-2 text-sm">
                                                <MessageSquare size={14} className="text-green-600 flex-shrink-0 mt-0.5" />
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <span className="text-slate-700 line-clamp-1 cursor-help">
                                                            {a.notes}
                                                        </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent side="right" className="max-w-xs">
                                                        {a.notes}
                                                    </TooltipContent>
                                                </Tooltip>
                                            </div>
                                        )}
                                    </div>

                                    {/* ACCIONES */}
                                    <div className="flex gap-2 mt-4 ml-11">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => onEdit?.(a)}
                                                    className="gap-1"
                                                >
                                                    <Pencil size={14} />
                                                    Editar
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">
                                                Modificar esta ausencia
                                            </TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => askDelete(a)}
                                                    className="gap-1 hover:bg-red-100 hover:text-red-700"
                                                >
                                                    <Trash2 size={14} />
                                                    Eliminar
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent side="top">
                                                Eliminar esta ausencia
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* FOOTER */}
                    {ausencias.length > 0 && (
                        <SheetFooter className="mt-6 pt-4 border-t">
                            <Button 
                                variant="outline" 
                                onClick={() => onOpenChange(false)}
                                className="w-full"
                            >
                                Cerrar
                            </Button>
                        </SheetFooter>
                    )}
                </SheetContent>
            </Sheet>

            {/* ===== DIALOG CONFIRM DELETE ===== */}

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <div className="flex items-center gap-2">
                            <div className="p-2 bg-red-100 rounded-lg">
                                <AlertCircle size={20} className="text-red-600" />
                            </div>
                            <DialogTitle className="text-lg">Eliminar ausencia</DialogTitle>
                        </div>
                    </DialogHeader>

                    {target && (
                        <div className="space-y-3 py-4">
                            <div className="p-3 bg-slate-50 rounded-lg border">
                                <p className="text-sm font-medium text-slate-900">
                                    {target.usuario || `Usuario ${target.user_id}`}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatDateAbsence(target)}
                                </p>
                            </div>

                            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2">
                                <AlertCircle size={16} className="text-red-600 flex-shrink-0 mt-0.5" />
                                <p className="text-sm text-red-700">
                                    Esta acción no se puede deshacer. Se eliminará permanentemente el registro de ausencia.
                                </p>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button 
                            variant="outline" 
                            onClick={() => setDeleteOpen(false)}
                            className="flex-1"
                        >
                            Cancelar
                        </Button>

                        <Button 
                            variant="destructive" 
                            onClick={confirmDelete}
                            className="flex-1 gap-2"
                        >
                            <Trash2 size={16} />
                            Eliminar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </TooltipProvider>
    );
}