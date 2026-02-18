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
    Calendar,
    Clock,
    User,
    FileText,
    Pencil,
    Trash2,
    MessagesSquare
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

    function formatTime(t) {
        if (!t) return "—";
        return t.slice(0, 5);
    }

    function hours(a) {
        if (a.will_be_absent) return "Todo el día";
        return `${formatTime(a.start_time)} - ${formatTime(a.end_time)}`;
    }

    // ===== DELETE =====

    function askDelete(a) {
        setTarget(a);
        setDeleteOpen(true);
    }

    async function confirmDelete() {
        try {
            await onDelete?.(target.id);

            toast.success("Ausencia eliminada correctamente", {
                description: "El registro fue removido del sistema",
            });

            setDeleteOpen(false);
            setTarget(null);
        } catch {
            toast.error("No se pudo eliminar la ausencia");
        }
    }

    return (
        <>
            <Sheet open={open} onOpenChange={onOpenChange}>
                <SheetContent className="w-full sm:max-w-xl bg-gradient-to-b from-white to-gray-50">
                    <SheetHeader>
                        <SheetTitle className="flex items-center gap-2 text-lg font-semibold">
                            <Calendar className="w-5 h-5 text-primary" />
                            Ausencias del personal
                        </SheetTitle>
                    </SheetHeader>

                    <div className="mt-4 space-y-3 overflow-auto max-h-[75vh] pr-1">
                        {!ausencias.length && (
                            <p className="text-sm text-muted-foreground">
                                No hay ausencias registradas
                            </p>
                        )}

                        {ausencias.map((a) => (
                            <div
                                key={a.id}
                                className="rounded-xl border bg-white p-4 shadow-sm hover:shadow-md transition-all"
                            >
                                {/* usuario */}
                                <div className="flex items-center gap-2 font-semibold text-gray-800">
                                    <User size={16} className="text-primary" />
                                    {a.usuario || `Usuario ${a.user_id}`}
                                </div>

                                {/* fecha */}
                                <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                    <Calendar size={14} />
                                    {formatDateAbsence(a)}
                                </div>

                                {/* hora */}
                                <div className="flex items-center gap-2 text-sm mt-1">
                                    <Clock size={14} />
                                    {hours(a)}
                                </div>

                                {/* motivo */}
                                {a.reason && (
                                    <div className="flex items-center gap-2 text-sm mt-1 text-gray-700">
                                        <FileText size={14} />
                                        {a.reason}
                                    </div>
                                )}

                                {a.notes && (
                                    <div className="flex items-center gap-2 text-sm mt-1 text-gray-700">
                                        <MessagesSquare size={14} />
                                        {a.notes}
                                    </div>
                                )}
                                {/* botones */}
                                <div className="flex gap-2 mt-4">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => onEdit?.(a)}
                                    >
                                        <Pencil size={14} className="mr-1" />
                                        Editar
                                    </Button>

                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        onClick={() => askDelete(a)}
                                    >
                                        <Trash2 size={14} className="mr-1" />
                                        Eliminar
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <SheetFooter className="mt-4">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>
                            Cerrar
                        </Button>
                    </SheetFooter>
                </SheetContent>
            </Sheet>

            {/* ===== DIALOG CONFIRM DELETE ===== */}

            <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Eliminar ausencia</DialogTitle>
                    </DialogHeader>

                    <p className="text-sm text-muted-foreground">
                        Esta acción no se puede deshacer.
                    </p>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                            Cancelar
                        </Button>

                        <Button variant="destructive" onClick={confirmDelete}>
                            Eliminar definitivamente
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
