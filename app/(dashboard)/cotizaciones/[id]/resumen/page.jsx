// File: app/(dashboard)/cotizaciones/[id]/resumen/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Loader,
    Download,
    ArrowLeft,
    Check,
    X,
    Plus,
    Trash2,
    Edit2,
    ArrowRight,
    MapPin,
    Mail,
    User,
    Calendar,
    DollarSign,
    Zap,
    Video,
    Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

const IGV_RATE = 0.18;

// ============================================
// DIALOG: AGREGAR ACCESORIOS
// ============================================
function AgregarAccesorioDialog({
    open,
    onOpenChange,
    cotizacion,
    marcaId,
    modeloId,
    onAccesorioAdded,
}) {
    const [accesorios, setAccesorios] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedAccesorios, setSelectedAccesorios] = useState([]);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        if (open) {
            loadAccesorios();
        }
    }, [open]);

    async function loadAccesorios() {
        try {
            setLoading(true);
            const res = await fetch(
                `/api/accesorios-disponibles?marca_id=${marcaId}&modelo_id=${modeloId}`,
                { cache: "no-store" }
            );
            if (res.ok) {
                const data = await res.json();
                setAccesorios(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error cargando accesorios");
        } finally {
            setLoading(false);
        }
    }

    const calculateTotals = (accesorio) => {
        const precio = parseFloat(accesorio.precio) || 0;
        const cantidad = accesorio.cantidad || 1;
        const subtotal = precio * cantidad;

        let descuento = 0;
        if (accesorio.descuento_porcentaje) {
            descuento = subtotal * (parseFloat(accesorio.descuento_porcentaje) / 100);
        } else if (accesorio.descuento_monto) {
            descuento = parseFloat(accesorio.descuento_monto);
        }

        const totalSinIgv = subtotal - descuento;
        const igv = totalSinIgv * IGV_RATE;
        const totalConIgv = totalSinIgv + igv;

        return {
            subtotal: subtotal.toFixed(2),
            descuento: descuento.toFixed(2),
            totalSinIgv: totalSinIgv.toFixed(2),
            igv: igv.toFixed(2),
            totalConIgv: totalConIgv.toFixed(2),
        };
    };

    async function handleAgregar() {
        if (selectedAccesorios.length === 0) {
            toast.warning("Selecciona al menos un accesorio");
            return;
        }

        setSaving(true);
        try {
            const promises = selectedAccesorios.map((accesorio) =>
                fetch(`/api/cotizaciones-accesorios`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        cotizacion_id: cotizacion.id,
                        accesorio_id: accesorio.id,
                        cantidad: accesorio.cantidad || 1,
                        descuento_porcentaje: accesorio.descuento_porcentaje || null,
                        descuento_monto: accesorio.descuento_monto || null,
                        notas: accesorio.notas || null,
                    }),
                })
            );

            const responses = await Promise.all(promises);
            const allOk = responses.every((r) => r.ok);

            if (!allOk) {
                throw new Error("Error agregando algunos accesorios");
            }

            toast.success(`${selectedAccesorios.length} accesorio(s) agregado(s)`);
            setSelectedAccesorios([]);
            setExpandedId(null);
            onOpenChange(false);
            onAccesorioAdded?.();
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Error agregando accesorios");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto w-full sm:w-[95vw]">
                <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">Agregar Accesorios</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                ) : accesorios.length === 0 ? (
                    <div className="flex justify-center items-center py-8">
                        <p className="text-gray-500 text-center px-4 text-sm sm:text-base">
                            No hay accesorios disponibles para esta marca y modelo
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="border rounded-lg overflow-x-auto">
                            <table className="w-full text-xs sm:text-sm">
                                <thead>
                                    <tr className="bg-gray-100 border-b">
                                        <th className="text-left p-2 sm:p-3 w-8">✓</th>
                                        <th className="text-left p-2 sm:p-3 min-w-[150px] sm:min-w-[200px]">
                                            Detalle
                                        </th>
                                        <th className="text-left p-2 sm:p-3 min-w-[100px]">N° Parte</th>
                                        <th className="text-right p-2 sm:p-3 min-w-[80px]">Precio</th>
                                        <th className="text-center p-2 sm:p-3 min-w-[60px]">Cant.</th>
                                        <th className="text-right p-2 sm:p-3 min-w-[80px]">Total</th>
                                        <th className="text-center p-2 sm:p-3 w-8">⋯</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {accesorios.map((accesorio) => {
                                        const isSelected = selectedAccesorios.some(
                                            (a) => a.id === accesorio.id
                                        );
                                        const selectedItem = selectedAccesorios.find(
                                            (a) => a.id === accesorio.id
                                        );
                                        const totals = selectedItem ? calculateTotals(selectedItem) : null;
                                        const isExpanded = expandedId === accesorio.id;

                                        return (
                                            <tr
                                                key={`row-${accesorio.id}`}
                                                className={`border-b transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                                                    }`}
                                            >
                                                <td className="p-2 sm:p-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedAccesorios([
                                                                    ...selectedAccesorios,
                                                                    {
                                                                        ...accesorio,
                                                                        cantidad: 1,
                                                                        descuento_tipo: "porcentaje",
                                                                        descuento_porcentaje: null,
                                                                        descuento_monto: null,
                                                                        notas: null,
                                                                    },
                                                                ]);
                                                            } else {
                                                                setSelectedAccesorios(
                                                                    selectedAccesorios.filter(
                                                                        (a) => a.id !== accesorio.id
                                                                    )
                                                                );
                                                                setExpandedId(null);
                                                            }
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-2 sm:p-3 font-medium text-xs sm:text-sm">
                                                    {accesorio.detalle}
                                                </td>
                                                <td className="p-2 sm:p-3 text-gray-600 text-xs sm:text-sm">
                                                    {accesorio.numero_parte}
                                                </td>
                                                <td className="p-2 sm:p-3 text-right text-xs sm:text-sm">
                                                    ${parseFloat(accesorio.precio).toFixed(2)}
                                                </td>
                                                <td className="p-2 sm:p-3">
                                                    {isSelected ? (
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            value={selectedItem.cantidad}
                                                            onChange={(e) => {
                                                                const newQuantity =
                                                                    parseInt(e.target.value) || 1;
                                                                setSelectedAccesorios(
                                                                    selectedAccesorios.map((a) =>
                                                                        a.id === accesorio.id
                                                                            ? { ...a, cantidad: newQuantity }
                                                                            : a
                                                                    )
                                                                );
                                                            }}
                                                            className="w-full text-center text-xs sm:text-sm"
                                                        />
                                                    ) : (
                                                        <span className="text-gray-400 text-xs sm:text-sm">-</span>
                                                    )}
                                                </td>
                                                <td className="text-right p-2 sm:p-3 font-bold text-blue-600 text-xs sm:text-sm">
                                                    {isSelected && totals
                                                        ? `$${totals.totalConIgv}`
                                                        : "-"}
                                                </td>
                                                <td className="p-2 sm:p-3 text-center">
                                                    {isSelected && (
                                                        <button
                                                            onClick={() =>
                                                                setExpandedId(
                                                                    isExpanded ? null : accesorio.id
                                                                )
                                                            }
                                                            className="text-blue-600 hover:text-blue-700 font-bold"
                                                        >
                                                            {isExpanded ? "▼" : "▶"}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {selectedAccesorios.length > 0 && expandedId && (
                                <div className="border-t">
                                    {selectedAccesorios
                                        .filter((a) => a.id === expandedId)
                                        .map((selectedItem) => {
                                            const totals = calculateTotals(selectedItem);

                                            return (
                                                <div
                                                    key={`expanded-${selectedItem.id}`}
                                                    className="bg-blue-50 border-b"
                                                >
                                                    <div className="p-3 sm:p-4 space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                                            <div>
                                                                <label className="text-xs font-semibold text-gray-700 block mb-2">
                                                                    Tipo de Descuento
                                                                </label>
                                                                <Select
                                                                    value={
                                                                        selectedItem.descuento_tipo ||
                                                                        "porcentaje"
                                                                    }
                                                                    onValueChange={(value) => {
                                                                        setSelectedAccesorios(
                                                                            selectedAccesorios.map((a) =>
                                                                                a.id === selectedItem.id
                                                                                    ? {
                                                                                        ...a,
                                                                                        descuento_tipo: value,
                                                                                        descuento_porcentaje: null,
                                                                                        descuento_monto: null,
                                                                                    }
                                                                                    : a
                                                                            )
                                                                        );
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="text-sm">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="porcentaje">
                                                                            Por Porcentaje (%)
                                                                        </SelectItem>
                                                                        <SelectItem value="monto">
                                                                            Por Monto ($)
                                                                        </SelectItem>
                                                                        <SelectItem value="ninguno">
                                                                            Sin Descuento
                                                                        </SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            {selectedItem.descuento_tipo !==
                                                                "ninguno" && (
                                                                    <div>
                                                                        <label className="text-xs font-semibold text-gray-700 block mb-2">
                                                                            {selectedItem.descuento_tipo ===
                                                                                "porcentaje"
                                                                                ? "Porcentaje (%)"
                                                                                : "Monto ($)"}
                                                                        </label>
                                                                        <Input
                                                                            type="number"
                                                                            min="0"
                                                                            max={
                                                                                selectedItem.descuento_tipo ===
                                                                                    "porcentaje"
                                                                                    ? "100"
                                                                                    : undefined
                                                                            }
                                                                            step="0.01"
                                                                            placeholder="0.00"
                                                                            value={
                                                                                selectedItem.descuento_tipo ===
                                                                                    "porcentaje"
                                                                                    ? selectedItem.descuento_porcentaje ||
                                                                                    ""
                                                                                    : selectedItem.descuento_monto || ""
                                                                            }
                                                                            onChange={(e) => {
                                                                                const value = e.target.value
                                                                                    ? parseFloat(e.target.value)
                                                                                    : null;
                                                                                setSelectedAccesorios(
                                                                                    selectedAccesorios.map((a) =>
                                                                                        a.id === selectedItem.id
                                                                                            ? {
                                                                                                ...a,
                                                                                                ...(selectedItem.descuento_tipo ===
                                                                                                    "porcentaje"
                                                                                                    ? {
                                                                                                        descuento_porcentaje:
                                                                                                            value,
                                                                                                        descuento_monto: null,
                                                                                                    }
                                                                                                    : {
                                                                                                        descuento_monto: value,
                                                                                                        descuento_porcentaje:
                                                                                                            null,
                                                                                                    }),
                                                                                            }
                                                                                            : a
                                                                                    )
                                                                                );
                                                                            }}
                                                                            className="text-sm"
                                                                        />
                                                                    </div>
                                                                )}
                                                        </div>

                                                        <div>
                                                            <label className="text-xs font-semibold text-gray-700 block mb-2">
                                                                Notas (Opcional)
                                                            </label>
                                                            <Input
                                                                type="text"
                                                                placeholder="Agregue notas..."
                                                                value={selectedItem.notas || ""}
                                                                onChange={(e) => {
                                                                    setSelectedAccesorios(
                                                                        selectedAccesorios.map((a) =>
                                                                            a.id === selectedItem.id
                                                                                ? {
                                                                                    ...a,
                                                                                    notas: e.target.value,
                                                                                }
                                                                                : a
                                                                        )
                                                                    );
                                                                }}
                                                                className="text-sm"
                                                            />
                                                        </div>

                                                        {totals && (
                                                            <div className="space-y-2 p-3 bg-white rounded border-2 border-blue-200">
                                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                                    <p className="text-gray-600">Subtotal:</p>
                                                                    <p className="text-right font-bold">
                                                                        ${totals.subtotal}
                                                                    </p>

                                                                    <p className="text-gray-600">Descuento:</p>
                                                                    <p className="text-right font-bold text-red-600">
                                                                        -${totals.descuento}
                                                                    </p>

                                                                    <p className="text-gray-600">Subtotal (sin IGV):</p>
                                                                    <p className="text-right font-bold">
                                                                        ${totals.totalSinIgv}
                                                                    </p>

                                                                    <p className="text-gray-600">IGV (18%):</p>
                                                                    <p className="text-right font-bold text-green-600">
                                                                        +${totals.igv}
                                                                    </p>
                                                                </div>
                                                                <div className="border-t pt-2">
                                                                    <div className="flex justify-between text-sm font-bold">
                                                                        <p>Total (con IGV):</p>
                                                                        <p className="text-blue-600">
                                                                            ${totals.totalConIgv}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>

                        {selectedAccesorios.length > 0 && (
                            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200 mt-4">
                                <p className="font-bold text-blue-900 mb-2 text-sm sm:text-base">
                                    ✓ {selectedAccesorios.length} accesorio(s) seleccionado(s)
                                </p>
                                <div className="space-y-1">
                                    {selectedAccesorios.map((acc) => {
                                        const totals = calculateTotals(acc);
                                        return (
                                            <p
                                                key={acc.id}
                                                className="text-xs sm:text-sm text-blue-700"
                                            >
                                                • <strong>{acc.detalle}</strong> x{acc.cantidad} =
                                                <span className="font-bold text-blue-600 ml-1">
                                                    ${totals.totalConIgv}
                                                </span>
                                            </p>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}

                <DialogFooter className="flex gap-2 sm:gap-3 mt-4 flex-col sm:flex-row">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                        className="text-xs sm:text-sm"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleAgregar}
                        disabled={saving || selectedAccesorios.length === 0}
                        className="gap-2 text-xs sm:text-sm"
                    >
                        <Plus size={14} />
                        {saving ? "Agregando..." : `Agregar ${selectedAccesorios.length}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================
// DIALOG: AGREGAR REGALOS
// ============================================
function AgregarRegalosDialog({
    open,
    onOpenChange,
    cotizacion,
    onRegaloAdded,
}) {
    const [regalos, setRegalos] = useState([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [selectedRegalos, setSelectedRegalos] = useState([]);
    const [expandedId, setExpandedId] = useState(null);

    useEffect(() => {
        if (open) {
            loadRegalos();
        }
    }, [open]);

    async function loadRegalos() {
        try {
            setLoading(true);
            const res = await fetch("/api/regalos-disponibles", {
                cache: "no-store",
            });
            if (res.ok) {
                const data = await res.json();
                setRegalos(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error cargando regalos");
        } finally {
            setLoading(false);
        }
    }

    const calculateTotals = (regalo) => {
        const precio =
            parseFloat(regalo.precio_venta || regalo.precio_compra) || 0;
        const cantidad = regalo.cantidad || 1;
        const subtotal = precio * cantidad;

        let descuento = 0;
        if (regalo.descuento_porcentaje) {
            descuento = subtotal * (parseFloat(regalo.descuento_porcentaje) / 100);
        } else if (regalo.descuento_monto) {
            descuento = parseFloat(regalo.descuento_monto);
        }

        const totalSinIgv = subtotal - descuento;
        const igv = totalSinIgv * IGV_RATE;
        const totalConIgv = totalSinIgv + igv;

        return {
            subtotal: subtotal.toFixed(2),
            descuento: descuento.toFixed(2),
            totalSinIgv: totalSinIgv.toFixed(2),
            igv: igv.toFixed(2),
            totalConIgv: totalConIgv.toFixed(2),
        };
    };

    async function handleAgregar() {
        if (selectedRegalos.length === 0) {
            toast.warning("Selecciona al menos un regalo");
            return;
        }

        setSaving(true);
        try {
            const promises = selectedRegalos.map((regalo) =>
                fetch(`/api/cotizaciones-regalos`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        cotizacion_id: cotizacion.id,
                        regalo_id: regalo.id,
                        cantidad: regalo.cantidad || 1,
                        descuento_porcentaje: regalo.descuento_porcentaje || null,
                        descuento_monto: regalo.descuento_monto || null,
                        notas: regalo.notas || null,
                    }),
                })
            );

            const responses = await Promise.all(promises);
            const allOk = responses.every((r) => r.ok);

            if (!allOk) {
                throw new Error("Error agregando algunos regalos");
            }

            toast.success(`${selectedRegalos.length} regalo(s) agregado(s)`);
            setSelectedRegalos([]);
            setExpandedId(null);
            onOpenChange(false);
            onRegaloAdded?.();
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Error agregando regalos");
        } finally {
            setSaving(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto w-full sm:w-[95vw]">
                <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">Agregar Regalos</DialogTitle>
                </DialogHeader>

                {loading ? (
                    <div className="flex justify-center items-center py-12">
                        <Loader className="h-6 w-6 animate-spin text-blue-600" />
                    </div>
                ) : regalos.length === 0 ? (
                    <div className="flex justify-center items-center py-8">
                        <p className="text-gray-500 text-center px-4 text-sm sm:text-base">
                            No hay regalos disponibles
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="border rounded-lg overflow-x-auto">
                            <table className="w-full text-xs sm:text-sm">
                                <thead>
                                    <tr className="bg-gray-100 border-b">
                                        <th className="text-left p-2 sm:p-3 w-8">✓</th>
                                        <th className="text-left p-2 sm:p-3 min-w-[150px] sm:min-w-[200px]">
                                            Detalle
                                        </th>
                                        <th className="text-left p-2 sm:p-3 min-w-[100px]">Lote</th>
                                        <th className="text-center p-2 sm:p-3 min-w-[60px]">Tienda</th>
                                        <th className="text-right p-2 sm:p-3 min-w-[80px]">Precio</th>
                                        <th className="text-center p-2 sm:p-3 min-w-[60px]">Cant.</th>
                                        <th className="text-right p-2 sm:p-3 min-w-[80px]">Total</th>
                                        <th className="text-center p-2 sm:p-3 w-8">⋯</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {regalos.map((regalo) => {
                                        const isSelected = selectedRegalos.some(
                                            (r) => r.id === regalo.id
                                        );
                                        const selectedItem = selectedRegalos.find(
                                            (r) => r.id === regalo.id
                                        );
                                        const totals = selectedItem ? calculateTotals(selectedItem) : null;
                                        const isExpanded = expandedId === regalo.id;

                                        return (
                                            <tr
                                                key={`row-${regalo.id}`}
                                                className={`border-b transition-colors ${isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                                                    }`}
                                            >
                                                <td className="p-2 sm:p-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedRegalos([
                                                                    ...selectedRegalos,
                                                                    {
                                                                        ...regalo,
                                                                        cantidad: 1,
                                                                        descuento_tipo: "porcentaje",
                                                                        descuento_porcentaje: null,
                                                                        descuento_monto: null,
                                                                        notas: null,
                                                                    },
                                                                ]);
                                                            } else {
                                                                setSelectedRegalos(
                                                                    selectedRegalos.filter(
                                                                        (r) => r.id !== regalo.id
                                                                    )
                                                                );
                                                                setExpandedId(null);
                                                            }
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-2 sm:p-3 font-medium text-xs sm:text-sm">
                                                    {regalo.detalle}
                                                </td>
                                                <td className="p-2 sm:p-3 text-gray-600 text-xs sm:text-sm">
                                                    {regalo.lote}
                                                </td>
                                                <td className="p-2 sm:p-3 text-center">
                                                    <span
                                                        className={`text-xs font-bold ${regalo.regalo_tienda
                                                            ? "text-green-600"
                                                            : "text-gray-600"
                                                            }`}
                                                    >
                                                        {regalo.regalo_tienda ? "✓" : "✗"}
                                                    </span>
                                                </td>
                                                <td className="p-2 sm:p-3 text-right text-xs sm:text-sm">
                                                    ${parseFloat(
                                                        regalo.precio_venta || regalo.precio_compra
                                                    ).toFixed(2)}
                                                </td>
                                                <td className="p-2 sm:p-3">
                                                    {isSelected ? (
                                                        <Input
                                                            type="number"
                                                            min="1"
                                                            value={selectedItem.cantidad}
                                                            onChange={(e) => {
                                                                const newQuantity =
                                                                    parseInt(e.target.value) || 1;
                                                                setSelectedRegalos(
                                                                    selectedRegalos.map((r) =>
                                                                        r.id === regalo.id
                                                                            ? { ...r, cantidad: newQuantity }
                                                                            : r
                                                                    )
                                                                );
                                                            }}
                                                            className="w-full text-center text-xs sm:text-sm"
                                                        />
                                                    ) : (
                                                        <span className="text-gray-400 text-xs sm:text-sm">-</span>
                                                    )}
                                                </td>
                                                <td className="text-right p-2 sm:p-3 font-bold text-blue-600 text-xs sm:text-sm">
                                                    {isSelected && totals
                                                        ? `$${totals.totalConIgv}`
                                                        : "-"}
                                                </td>
                                                <td className="p-2 sm:p-3 text-center">
                                                    {isSelected && (
                                                        <button
                                                            onClick={() =>
                                                                setExpandedId(
                                                                    isExpanded ? null : regalo.id
                                                                )
                                                            }
                                                            className="text-blue-600 hover:text-blue-700 font-bold"
                                                        >
                                                            {isExpanded ? "▼" : "▶"}
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>

                            {selectedRegalos.length > 0 && expandedId && (
                                <div className="border-t">
                                    {selectedRegalos
                                        .filter((r) => r.id === expandedId)
                                        .map((selectedItem) => {
                                            const totals = calculateTotals(selectedItem);

                                            return (
                                                <div
                                                    key={`expanded-${selectedItem.id}`}
                                                    className="bg-blue-50 border-b"
                                                >
                                                    <div className="p-3 sm:p-4 space-y-4">
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                                                            <div>
                                                                <label className="text-xs font-semibold text-gray-700 block mb-2">
                                                                    Tipo de Descuento
                                                                </label>
                                                                <Select
                                                                    value={
                                                                        selectedItem.descuento_tipo ||
                                                                        "porcentaje"
                                                                    }
                                                                    onValueChange={(value) => {
                                                                        setSelectedRegalos(
                                                                            selectedRegalos.map((r) =>
                                                                                r.id === selectedItem.id
                                                                                    ? {
                                                                                        ...r,
                                                                                        descuento_tipo: value,
                                                                                        descuento_porcentaje: null,
                                                                                        descuento_monto: null,
                                                                                    }
                                                                                    : r
                                                                            )
                                                                        );
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="text-sm">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent>
                                                                        <SelectItem value="porcentaje">
                                                                            Por Porcentaje (%)
                                                                        </SelectItem>
                                                                        <SelectItem value="monto">
                                                                            Por Monto ($)
                                                                        </SelectItem>
                                                                        <SelectItem value="ninguno">
                                                                            Sin Descuento
                                                                        </SelectItem>
                                                                    </SelectContent>
                                                                </Select>
                                                            </div>

                                                            {selectedItem.descuento_tipo !==
                                                                "ninguno" && (
                                                                    <div>
                                                                        <label className="text-xs font-semibold text-gray-700 block mb-2">
                                                                            {selectedItem.descuento_tipo ===
                                                                                "porcentaje"
                                                                                ? "Porcentaje (%)"
                                                                                : "Monto ($)"}
                                                                        </label>
                                                                        <Input
                                                                            type="number"
                                                                            min="0"
                                                                            max={
                                                                                selectedItem.descuento_tipo ===
                                                                                    "porcentaje"
                                                                                    ? "100"
                                                                                    : undefined
                                                                            }
                                                                            step="0.01"
                                                                            placeholder="0.00"
                                                                            value={
                                                                                selectedItem.descuento_tipo ===
                                                                                    "porcentaje"
                                                                                    ? selectedItem.descuento_porcentaje ||
                                                                                    ""
                                                                                    : selectedItem.descuento_monto || ""
                                                                            }
                                                                            onChange={(e) => {
                                                                                const value = e.target.value
                                                                                    ? parseFloat(e.target.value)
                                                                                    : null;
                                                                                setSelectedRegalos(
                                                                                    selectedRegalos.map((r) =>
                                                                                        r.id === selectedItem.id
                                                                                            ? {
                                                                                                ...r,
                                                                                                ...(selectedItem.descuento_tipo ===
                                                                                                    "porcentaje"
                                                                                                    ? {
                                                                                                        descuento_porcentaje:
                                                                                                            value,
                                                                                                        descuento_monto: null,
                                                                                                    }
                                                                                                    : {
                                                                                                        descuento_monto: value,
                                                                                                        descuento_porcentaje:
                                                                                                            null,
                                                                                                    }),
                                                                                            }
                                                                                            : r
                                                                                    )
                                                                                );
                                                                            }}
                                                                            className="text-sm"
                                                                        />
                                                                    </div>
                                                                )}
                                                        </div>

                                                        <div>
                                                            <label className="text-xs font-semibold text-gray-700 block mb-2">
                                                                Notas (Opcional)
                                                            </label>
                                                            <Input
                                                                type="text"
                                                                placeholder="Agregue notas..."
                                                                value={selectedItem.notas || ""}
                                                                onChange={(e) => {
                                                                    setSelectedRegalos(
                                                                        selectedRegalos.map((r) =>
                                                                            r.id === selectedItem.id
                                                                                ? {
                                                                                    ...r,
                                                                                    notas: e.target.value,
                                                                                }
                                                                                : r
                                                                        )
                                                                    );
                                                                }}
                                                                className="text-sm"
                                                            />
                                                        </div>

                                                        {totals && (
                                                            <div className="space-y-2 p-3 bg-white rounded border-2 border-blue-200">
                                                                <div className="grid grid-cols-2 gap-2 text-xs">
                                                                    <p className="text-gray-600">Subtotal:</p>
                                                                    <p className="text-right font-bold">
                                                                        ${totals.subtotal}
                                                                    </p>

                                                                    <p className="text-gray-600">Descuento:</p>
                                                                    <p className="text-right font-bold text-red-600">
                                                                        -${totals.descuento}
                                                                    </p>

                                                                    <p className="text-gray-600">Subtotal (sin IGV):</p>
                                                                    <p className="text-right font-bold">
                                                                        ${totals.totalSinIgv}
                                                                    </p>

                                                                    <p className="text-gray-600">IGV (18%):</p>
                                                                    <p className="text-right font-bold text-green-600">
                                                                        +${totals.igv}
                                                                    </p>
                                                                </div>
                                                                <div className="border-t pt-2">
                                                                    <div className="flex justify-between text-sm font-bold">
                                                                        <p>Total (con IGV):</p>
                                                                        <p className="text-blue-600">
                                                                            ${totals.totalConIgv}
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            )}
                        </div>

                        {selectedRegalos.length > 0 && (
                            <div className="bg-blue-50 p-3 sm:p-4 rounded-lg border border-blue-200 mt-4">
                                <p className="font-bold text-blue-900 mb-2 text-sm sm:text-base">
                                    ✓ {selectedRegalos.length} regalo(s) seleccionado(s)
                                </p>
                                <div className="space-y-1">
                                    {selectedRegalos.map((regalo) => {
                                        const totals = calculateTotals(regalo);
                                        return (
                                            <p
                                                key={regalo.id}
                                                className="text-xs sm:text-sm text-blue-700"
                                            >
                                                • <strong>{regalo.detalle}</strong> x{regalo.cantidad} =
                                                <span className="font-bold text-blue-600 ml-1">
                                                    ${totals.totalConIgv}
                                                </span>
                                            </p>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                    </>
                )}

                <DialogFooter className="flex gap-2 sm:gap-3 mt-4 flex-col sm:flex-row">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                        className="text-xs sm:text-sm"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleAgregar}
                        disabled={saving || selectedRegalos.length === 0}
                        className="gap-2 text-xs sm:text-sm"
                    >
                        <Plus size={14} />
                        {saving ? "Agregando..." : `Agregar ${selectedRegalos.length}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================
// DIALOG: EDITAR ACCESORIO
// ============================================
function EditarAccesorioDialog({
    open,
    onOpenChange,
    accesorio,
    onAccesorioUpdated,
}) {
    const [formData, setFormData] = useState({
        cantidad: 1,
        descuento_tipo: "porcentaje",
        descuento_porcentaje: null,
        descuento_monto: null,
        notas: null,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (accesorio && open) {
            setFormData({
                cantidad: accesorio.cantidad || 1,
                descuento_tipo:
                    accesorio.descuento_porcentaje > 0
                        ? "porcentaje"
                        : accesorio.descuento_monto > 0
                            ? "monto"
                            : "ninguno",
                descuento_porcentaje: accesorio.descuento_porcentaje || null,
                descuento_monto: accesorio.descuento_monto || null,
                notas: accesorio.notas || null,
            });
        }
    }, [accesorio, open]);

    const calculateTotals = () => {
        if (!accesorio) return null;
        const precio = parseFloat(accesorio.precio_unitario) || 0;
        const cantidad = formData.cantidad || 1;
        const subtotal = precio * cantidad;

        let descuento = 0;
        if (
            formData.descuento_tipo === "porcentaje" &&
            formData.descuento_porcentaje
        ) {
            descuento =
                subtotal * (parseFloat(formData.descuento_porcentaje) / 100);
        } else if (formData.descuento_tipo === "monto" && formData.descuento_monto) {
            descuento = parseFloat(formData.descuento_monto);
        }

        const totalSinIgv = subtotal - descuento;
        const igv = totalSinIgv * IGV_RATE;
        const totalConIgv = totalSinIgv + igv;

        return {
            subtotal: subtotal.toFixed(2),
            descuento: descuento.toFixed(2),
            totalSinIgv: totalSinIgv.toFixed(2),
            igv: igv.toFixed(2),
            totalConIgv: totalConIgv.toFixed(2),
        };
    };

    async function handleGuardar() {
        try {
            setSaving(true);

            const res = await fetch(
                `/api/cotizaciones-accesorios/${accesorio.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        cantidad: formData.cantidad,
                        descuento_porcentaje:
                            formData.descuento_tipo === "porcentaje"
                                ? formData.descuento_porcentaje
                                : null,
                        descuento_monto:
                            formData.descuento_tipo === "monto"
                                ? formData.descuento_monto
                                : null,
                        notas: formData.notas,
                    }),
                }
            );

            if (!res.ok) throw new Error("Error guardando cambios");

            toast.success("Accesorio actualizado");
            onOpenChange(false);
            onAccesorioUpdated?.();
        } catch (error) {
            console.error(error);
            toast.error("Error: " + error.message);
        } finally {
            setSaving(false);
        }
    }

    const totals = calculateTotals();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl w-full sm:w-[95vw] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">Editar Accesorio</DialogTitle>
                </DialogHeader>

                {accesorio && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                                <div>
                                    <p className="text-gray-600 font-semibold">Detalle</p>
                                    <p className="text-gray-900">{accesorio.detalle}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 font-semibold">N° Parte</p>
                                    <p className="text-gray-900">{accesorio.numero_parte}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 font-semibold">Precio Unitario</p>
                                    <p className="text-gray-900">
                                        ${parseFloat(accesorio.precio_unitario).toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-600 font-semibold">Moneda</p>
                                    <p className="text-gray-900">
                                        {accesorio.moneda_codigo} ({accesorio.moneda_simbolo})
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 sm:space-y-4">
                            <div>
                                <label className="text-sm font-semibold text-gray-700 block mb-2">
                                    Cantidad
                                </label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={formData.cantidad}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            cantidad: parseInt(e.target.value) || 1,
                                        })
                                    }
                                    disabled={saving}
                                    className="text-sm"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-gray-700 block mb-2">
                                    Tipo de Descuento
                                </label>
                                <Select
                                    value={formData.descuento_tipo}
                                    onValueChange={(value) =>
                                        setFormData({
                                            ...formData,
                                            descuento_tipo: value,
                                            descuento_porcentaje: null,
                                            descuento_monto: null,
                                        })
                                    }
                                    disabled={saving}
                                >
                                    <SelectTrigger className="text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="porcentaje">Por Porcentaje (%)</SelectItem>
                                        <SelectItem value="monto">Por Monto ($)</SelectItem>
                                        <SelectItem value="ninguno">Sin Descuento</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.descuento_tipo !== "ninguno" && (
                                <div>
                                    <label className="text-sm font-semibold text-gray-700 block mb-2">
                                        {formData.descuento_tipo === "porcentaje"
                                            ? "Porcentaje (%)"
                                            : "Monto ($)"}
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max={formData.descuento_tipo === "porcentaje" ? "100" : undefined}
                                        step="0.01"
                                        placeholder="0.00"
                                        value={
                                            formData.descuento_tipo === "porcentaje"
                                                ? formData.descuento_porcentaje || ""
                                                : formData.descuento_monto || ""
                                        }
                                        onChange={(e) => {
                                            const value = e.target.value
                                                ? parseFloat(e.target.value)
                                                : null;
                                            if (formData.descuento_tipo === "porcentaje") {
                                                setFormData({
                                                    ...formData,
                                                    descuento_porcentaje: value,
                                                });
                                            } else {
                                                setFormData({
                                                    ...formData,
                                                    descuento_monto: value,
                                                });
                                            }
                                        }}
                                        disabled={saving}
                                        className="text-sm"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-sm font-semibold text-gray-700 block mb-2">
                                    Notas (Opcional)
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Notas sobre este accesorio..."
                                    value={formData.notas || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, notas: e.target.value })
                                    }
                                    disabled={saving}
                                    className="text-sm"
                                />
                            </div>

                            {totals && (
                                <div className="space-y-2 p-3 bg-blue-50 rounded border-2 border-blue-200">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <p className="text-gray-600">Subtotal:</p>
                                        <p className="text-right font-bold">${totals.subtotal}</p>

                                        <p className="text-gray-600">Descuento:</p>
                                        <p className="text-right font-bold text-red-600">
                                            -${totals.descuento}
                                        </p>

                                        <p className="text-gray-600">Subtotal (sin IGV):</p>
                                        <p className="text-right font-bold">${totals.totalSinIgv}</p>

                                        <p className="text-gray-600">IGV (18%):</p>
                                        <p className="text-right font-bold text-green-600">
                                            +${totals.igv}
                                        </p>
                                    </div>
                                    <div className="border-t pt-2">
                                        <div className="flex justify-between text-sm font-bold">
                                            <p>Total (con IGV):</p>
                                            <p className="text-blue-600">${totals.totalConIgv}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter className="flex gap-2 sm:gap-3 mt-4 flex-col sm:flex-row">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                        className="text-xs sm:text-sm"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleGuardar}
                        disabled={saving}
                        className="text-xs sm:text-sm"
                    >
                        {saving ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================
// DIALOG: EDITAR REGALO
// ============================================
function EditarRegaloDialog({
    open,
    onOpenChange,
    regalo,
    onRegaloUpdated,
}) {
    const [formData, setFormData] = useState({
        cantidad: 1,
        descuento_tipo: "porcentaje",
        descuento_porcentaje: null,
        descuento_monto: null,
        notas: null,
    });
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (regalo && open) {
            setFormData({
                cantidad: regalo.cantidad || 1,
                descuento_tipo:
                    regalo.descuento_porcentaje > 0
                        ? "porcentaje"
                        : regalo.descuento_monto > 0
                            ? "monto"
                            : "ninguno",
                descuento_porcentaje: regalo.descuento_porcentaje || null,
                descuento_monto: regalo.descuento_monto || null,
                notas: regalo.notas || null,
            });
        }
    }, [regalo, open]);

    const calculateTotals = () => {
        if (!regalo) return null;
        const precio = parseFloat(regalo.precio_unitario) || 0;
        const cantidad = formData.cantidad || 1;
        const subtotal = precio * cantidad;

        let descuento = 0;
        if (
            formData.descuento_tipo === "porcentaje" &&
            formData.descuento_porcentaje
        ) {
            descuento = subtotal * (parseFloat(formData.descuento_porcentaje) / 100);
        } else if (formData.descuento_tipo === "monto" && formData.descuento_monto) {
            descuento = parseFloat(formData.descuento_monto);
        }

        const totalSinIgv = subtotal - descuento;
        const igv = totalSinIgv * IGV_RATE;
        const totalConIgv = totalSinIgv + igv;

        return {
            subtotal: subtotal.toFixed(2),
            descuento: descuento.toFixed(2),
            totalSinIgv: totalSinIgv.toFixed(2),
            igv: igv.toFixed(2),
            totalConIgv: totalConIgv.toFixed(2),
        };
    };

    async function handleGuardar() {
        try {
            setSaving(true);

            const res = await fetch(`/api/cotizaciones-regalos/${regalo.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    cantidad: formData.cantidad,
                    descuento_porcentaje:
                        formData.descuento_tipo === "porcentaje"
                            ? formData.descuento_porcentaje
                            : null,
                    descuento_monto:
                        formData.descuento_tipo === "monto"
                            ? formData.descuento_monto
                            : null,
                    notas: formData.notas,
                }),
            });

            if (!res.ok) throw new Error("Error guardando cambios");

            toast.success("Regalo actualizado");
            onOpenChange(false);
            onRegaloUpdated?.();
        } catch (error) {
            console.error(error);
            toast.error("Error: " + error.message);
        } finally {
            setSaving(false);
        }
    }

    const totals = calculateTotals();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl w-full sm:w-[95vw] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-lg sm:text-xl">Editar Regalo</DialogTitle>
                </DialogHeader>

                {regalo && (
                    <div className="space-y-4">
                        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg border">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm">
                                <div>
                                    <p className="text-gray-600 font-semibold">Detalle</p>
                                    <p className="text-gray-900">{regalo.detalle}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 font-semibold">Lote</p>
                                    <p className="text-gray-900">{regalo.lote}</p>
                                </div>
                                <div>
                                    <p className="text-gray-600 font-semibold">Precio Unitario</p>
                                    <p className="text-gray-900">
                                        ${parseFloat(regalo.precio_unitario).toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-600 font-semibold">Moneda</p>
                                    <p className="text-gray-900">
                                        {regalo.moneda_codigo} ({regalo.moneda_simbolo})
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 sm:space-y-4">
                            <div>
                                <label className="text-sm font-semibold text-gray-700 block mb-2">
                                    Cantidad
                                </label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={formData.cantidad}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            cantidad: parseInt(e.target.value) || 1,
                                        })
                                    }
                                    disabled={saving}
                                    className="text-sm"
                                />
                            </div>

                            <div>
                                <label className="text-sm font-semibold text-gray-700 block mb-2">
                                    Tipo de Descuento
                                </label>
                                <Select
                                    value={formData.descuento_tipo}
                                    onValueChange={(value) =>
                                        setFormData({
                                            ...formData,
                                            descuento_tipo: value,
                                            descuento_porcentaje: null,
                                            descuento_monto: null,
                                        })
                                    }
                                    disabled={saving}
                                >
                                    <SelectTrigger className="text-sm">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="porcentaje">Por Porcentaje (%)</SelectItem>
                                        <SelectItem value="monto">Por Monto ($)</SelectItem>
                                        <SelectItem value="ninguno">Sin Descuento</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {formData.descuento_tipo !== "ninguno" && (
                                <div>
                                    <label className="text-sm font-semibold text-gray-700 block mb-2">
                                        {formData.descuento_tipo === "porcentaje"
                                            ? "Porcentaje (%)"
                                            : "Monto ($)"}
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max={formData.descuento_tipo === "porcentaje" ? "100" : undefined}
                                        step="0.01"
                                        placeholder="0.00"
                                        value={
                                            formData.descuento_tipo === "porcentaje"
                                                ? formData.descuento_porcentaje || ""
                                                : formData.descuento_monto || ""
                                        }
                                        onChange={(e) => {
                                            const value = e.target.value
                                                ? parseFloat(e.target.value)
                                                : null;
                                            if (formData.descuento_tipo === "porcentaje") {
                                                setFormData({
                                                    ...formData,
                                                    descuento_porcentaje: value,
                                                });
                                            } else {
                                                setFormData({
                                                    ...formData,
                                                    descuento_monto: value,
                                                });
                                            }
                                        }}
                                        disabled={saving}
                                        className="text-sm"
                                    />
                                </div>
                            )}

                            <div>
                                <label className="text-sm font-semibold text-gray-700 block mb-2">
                                    Notas (Opcional)
                                </label>
                                <Input
                                    type="text"
                                    placeholder="Notas sobre este regalo..."
                                    value={formData.notas || ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, notas: e.target.value })
                                    }
                                    disabled={saving}
                                    className="text-sm"
                                />
                            </div>

                            {totals && (
                                <div className="space-y-2 p-3 bg-blue-50 rounded border-2 border-blue-200">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <p className="text-gray-600">Subtotal:</p>
                                        <p className="text-right font-bold">${totals.subtotal}</p>

                                        <p className="text-gray-600">Descuento:</p>
                                        <p className="text-right font-bold text-red-600">
                                            -${totals.descuento}
                                        </p>

                                        <p className="text-gray-600">Subtotal (sin IGV):</p>
                                        <p className="text-right font-bold">${totals.totalSinIgv}</p>

                                        <p className="text-gray-600">IGV (18%):</p>
                                        <p className="text-right font-bold text-green-600">
                                            +${totals.igv}
                                        </p>
                                    </div>
                                    <div className="border-t pt-2">
                                        <div className="flex justify-between text-sm font-bold">
                                            <p>Total (con IGV):</p>
                                            <p className="text-blue-600">${totals.totalConIgv}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                <DialogFooter className="flex gap-2 sm:gap-3 mt-4 flex-col sm:flex-row">
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                        className="text-xs sm:text-sm"
                    >
                        Cancelar
                    </Button>
                    <Button
                        onClick={handleGuardar}
                        disabled={saving}
                        className="text-xs sm:text-sm"
                    >
                        {saving ? "Guardando..." : "Guardar Cambios"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ============================================
// PÁGINA PRINCIPAL
// ============================================
export default function CotizacionResumenPage() {
    const params = useParams();
    const router = useRouter();
    const cotizacionId = params.id;

    const [cotizacion, setCotizacion] = useState(null);
    const [oportunidad, setOportunidad] = useState(null);
    const [preciosRegion, setPreciosRegion] = useState([]);
    const [especificaciones, setEspecificaciones] = useState([]);
    const [accesorios, setAccesorios] = useState([]);
    const [regalos, setRegalos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingField, setEditingField] = useState(null);
    const [editValues, setEditValues] = useState({});
    const [savingEdit, setSavingEdit] = useState(false);

    const [marcas, setMarcas] = useState([]);
    const [modelos, setModelos] = useState([]);
    const [versiones, setVersiones] = useState([]);
    const [loadingOptions, setLoadingOptions] = useState(false);

    const [openAccesoriosDialog, setOpenAccesoriosDialog] = useState(false);
    const [openRegalosDialog, setOpenRegalosDialog] = useState(false);
    const [editingAccesorio, setEditingAccesorio] = useState(null);
    const [editingRegalo, setEditingRegalo] = useState(null);
    const [openEditAccesorio, setOpenEditAccesorio] = useState(false);
    const [openEditRegalo, setOpenEditRegalo] = useState(false);

    const [editingDescuentoAcc, setEditingDescuentoAcc] = useState(false);
    const [editingDescuentoReg, setEditingDescuentoReg] = useState(false);
    const [descuentoAccValue, setDescuentoAccValue] = useState(0);
    const [descuentoRegValue, setDescuentoRegValue] = useState(0);

    const [loadingReserva, setLoadingReserva] = useState(false);

    useEffect(() => {
        loadData();
        loadOptions();
    }, [cotizacionId]);

    async function loadData() {
        try {
            setLoading(true);

            const resCot = await fetch(
                `/api/cotizacionesagenda/${cotizacionId}`,
                { cache: "no-store" }
            );
            if (resCot.ok) {
                const data = await resCot.json();
                setCotizacion(data);
                setDescuentoAccValue(parseFloat(data.descuento_total_accesorios) || 0);
                setDescuentoRegValue(parseFloat(data.descuento_total_regalos) || 0);

                const resOpo = await fetch(
                    `/api/oportunidades-oportunidades/${data.oportunidad_id}`,
                    { cache: "no-store" }
                );
                if (resOpo.ok) {
                    const opoData = await resOpo.json();
                    setOportunidad(opoData);
                }

                const resPrecio = await fetch(
                    `/api/precios-region-version?marca_id=${data.marca_id}&modelo_id=${data.modelo_id}&version_id=${data.version_id || ""}`,
                    { cache: "no-store" }
                );
                if (resPrecio.ok) {
                    const precioData = await resPrecio.json();
                    setPreciosRegion(Array.isArray(precioData) ? precioData : []);
                }

                const resEspec = await fetch(
                    `/api/modelo-especificaciones?marca_id=${data.marca_id}&modelo_id=${data.modelo_id}`,
                    { cache: "no-store" }
                );
                if (resEspec.ok) {
                    const especData = await resEspec.json();
                    setEspecificaciones(Array.isArray(especData) ? especData : []);
                }
            }

            const resAcc = await fetch(
                `/api/cotizaciones-accesorios/by-cotizacion/${cotizacionId}`,
                { cache: "no-store" }
            );
            if (resAcc.ok) {
                const data = await resAcc.json();
                setAccesorios(Array.isArray(data) ? data : []);
            }

            const resReg = await fetch(
                `/api/cotizaciones-regalos/by-cotizacion/${cotizacionId}`,
                { cache: "no-store" }
            );
            if (resReg.ok) {
                const data = await resReg.json();
                setRegalos(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error cargando datos");
        } finally {
            setLoading(false);
        }
    }

    async function loadOptions() {
        try {
            setLoadingOptions(true);

            const resMarcas = await fetch("/api/marcas", { cache: "no-store" });
            if (resMarcas.ok) {
                const data = await resMarcas.json();
                setMarcas(Array.isArray(data) ? data : []);
            }

            const resModelos = await fetch("/api/modelos", { cache: "no-store" });
            if (resModelos.ok) {
                const data = await resModelos.json();
                setModelos(Array.isArray(data) ? data : []);
            }

            // CAMBIO: Accede a data.data y usa nombre en lugar de name
            const resVersiones = await fetch("/api/versiones", {
                cache: "no-store",
            });
            if (resVersiones.ok) {
                const response = await resVersiones.json();
                console.log("Versiones cargadas:", response.data); // DEBUG
                setVersiones(Array.isArray(response.data) ? response.data : []);
            }
        } catch (error) {
            console.error(error);
            toast.error("Error cargando opciones");
        } finally {
            setLoadingOptions(false);
        }
    }

    async function handleIrAReserva() {
        try {
            setLoadingReserva(true);

            const res = await fetch(
                `/api/reservas?oportunidad_id=${cotizacion.oportunidad_id}`,
                { cache: "no-store" }
            );

            if (!res.ok) {
                throw new Error("No se encontró reserva para esta oportunidad");
            }

            const responseData = await res.json();

            if (!responseData.data || responseData.data.length === 0) {
                toast.error("No hay reserva asociada a esta oportunidad");
                return;
            }

            const reservaId = responseData.data[0].id;
            router.push(`/reservas/${reservaId}`);
        } catch (error) {
            console.error(error);
            toast.error(error.message || "Error al obtener la reserva");
        } finally {
            setLoadingReserva(false);
        }
    }

    async function handleSaveEdit(field) {
        try {
            setSavingEdit(true);
            const value = editValues[field];

            const res = await fetch(`/api/cotizacionesagenda/${cotizacionId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    [field]: value,
                }),
            });

            if (!res.ok) {
                throw new Error("Error guardando cambios");
            }

            const data = await res.json();
            setCotizacion(data);
            setEditingField(null);
            setEditValues({});
            toast.success("Cambios guardados");
        } catch (error) {
            console.error(error);
            toast.error("Error: " + error.message);
        } finally {
            setSavingEdit(false);
        }
    }

    async function handleSaveDescuentoAcc() {
        try {
            setSavingEdit(true);
            const res = await fetch(
                `/api/cotizacionesagenda/${cotizacionId}/descuento-accesorios`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        descuento_total_accesorios: parseFloat(descuentoAccValue),
                    }),
                }
            );

            if (!res.ok) throw new Error("Error guardando descuento");

            const data = await res.json();
            setCotizacion((prev) => ({
                ...prev,
                descuento_total_accesorios: data.descuento_total_accesorios,
            }));
            setEditingDescuentoAcc(false);
            toast.success("Descuento de accesorios guardado");
        } catch (error) {
            console.error(error);
            toast.error("Error: " + error.message);
        } finally {
            setSavingEdit(false);
        }
    }

    async function handleSaveDescuentoReg() {
        try {
            setSavingEdit(true);
            const res = await fetch(
                `/api/cotizacionesagenda/${cotizacionId}/descuento-regalos`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        descuento_total_regalos: parseFloat(descuentoRegValue),
                    }),
                }
            );

            if (!res.ok) throw new Error("Error guardando descuento");

            const data = await res.json();
            setCotizacion((prev) => ({
                ...prev,
                descuento_total_regalos: data.descuento_total_regalos,
            }));
            setEditingDescuentoReg(false);
            toast.success("Descuento de regalos guardado");
        } catch (error) {
            console.error(error);
            toast.error("Error: " + error.message);
        } finally {
            setSavingEdit(false);
        }
    }

    async function handleEliminarAccesorio(id) {
        try {
            setSavingEdit(true);
            const res = await fetch(`/api/cotizaciones-accesorios/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Error eliminando accesorio");

            toast.success("Accesorio eliminado");
            await loadData();
        } catch (error) {
            console.error(error);
            toast.error("Error: " + error.message);
        } finally {
            setSavingEdit(false);
        }
    }

    async function handleEliminarRegalo(id) {
        try {
            setSavingEdit(true);
            const res = await fetch(`/api/cotizaciones-regalos/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) throw new Error("Error eliminando regalo");

            toast.success("Regalo eliminado");
            await loadData();
        } catch (error) {
            console.error(error);
            toast.error("Error: " + error.message);
        } finally {
            setSavingEdit(false);
        }
    }

    function handleCancelEdit() {
        setEditingField(null);
        setEditValues({});
    }

    function handleStartEdit(field, value) {
        setEditingField(field);
        setEditValues({ [field]: value });
    }

    const precioActual = preciosRegion.find(
        (p) => p.modelo_id === cotizacion?.modelo_id && p.version_id === cotizacion?.version_id
    );

    const accesoriosTotales = {
        subtotal: accesorios.reduce((sum, a) => sum + (parseFloat(a.subtotal) || 0), 0),
        descuentos: accesorios.reduce((sum, a) => sum + (parseFloat(a.descuento_monto) || 0), 0),
        totalSinIgv: 0,
        igv: 0,
        total: 0,
    };

    accesoriosTotales.totalSinIgv = accesoriosTotales.subtotal - accesoriosTotales.descuentos;
    accesoriosTotales.igv = accesoriosTotales.totalSinIgv * IGV_RATE;
    accesoriosTotales.total = accesoriosTotales.totalSinIgv + accesoriosTotales.igv;

    const regalosTotal = {
        subtotal: regalos.reduce((sum, r) => sum + (parseFloat(r.subtotal) || 0), 0),
        descuentos: regalos.reduce((sum, r) => sum + (parseFloat(r.descuento_monto) || 0), 0),
        totalSinIgv: 0,
        igv: 0,
        total: 0,
    };

    regalosTotal.totalSinIgv = regalosTotal.subtotal - regalosTotal.descuentos;
    regalosTotal.igv = regalosTotal.totalSinIgv * IGV_RATE;
    regalosTotal.total = regalosTotal.totalSinIgv + regalosTotal.igv;

    const descuentoTotalAcc = parseFloat(cotizacion?.descuento_total_accesorios) || 0;
    const descuentoTotalReg = parseFloat(cotizacion?.descuento_total_regalos) || 0;

    const precioVehiculo = precioActual ? parseFloat(precioActual.precio_base) : 0;
    const subtotalGeneral = precioVehiculo + accesoriosTotales.totalSinIgv + regalosTotal.totalSinIgv;
    const igvGeneral = subtotalGeneral * IGV_RATE;
    const granTotal = subtotalGeneral + igvGeneral - descuentoTotalAcc - descuentoTotalReg;

    const agruparPorMoneda = (items) => {
        const grupos = {};
        items.forEach((item) => {
            const monedaCodigo = item.moneda_codigo || "SIN_MONEDA";
            if (!grupos[monedaCodigo]) {
                grupos[monedaCodigo] = {
                    simbolo: item.moneda_simbolo,
                    codigo: monedaCodigo,
                    items: [],
                };
            }
            grupos[monedaCodigo].items.push(item);
        });
        return Object.values(grupos);
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <Loader className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (!cotizacion) {
        return (
            <div className="min-h-screen bg-gray-50 p-4">
                <div className="max-w-6xl mx-auto">
                    <p className="text-center text-gray-500">Cotización no encontrada</p>
                </div>
            </div>
        );
    }

    const accesoriosAgrupados = agruparPorMoneda(accesorios);
    const regalosAgrupados = agruparPorMoneda(regalos);

    return (
        <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
                {/* ✅ ENCABEZADO */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-center gap-2 sm:gap-4 w-full sm:flex-1">
                        <Link href="/cotizaciones">
                            <Button variant="outline" size="icon" className="h-8 w-8 sm:h-10 sm:w-10 flex-shrink-0">
                                <ArrowLeft size={16} />
                            </Button>
                        </Link>
                        <div className="min-w-0 flex-1">
                            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                                Resumen de Cotización
                            </h1>
                            <p className="text-xs sm:text-sm text-gray-600 truncate">
                                Q-{String(cotizacion.id).padStart(6, "0")}
                            </p>
                        </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button
                            onClick={() => router.push(`/oportunidades/${cotizacion.oportunidad_id}`)}
                            variant="outline"
                            className="gap-1 sm:gap-2 text-xs sm:text-sm flex-1 sm:flex-none"
                            disabled={loadingReserva}
                        >
                            <ArrowRight size={14} />
                            <span className="hidden sm:inline">Ir a Oportunidad</span>
                            <span className="sm:hidden">Oportunidad</span>
                        </Button>
                        <Button
                            onClick={handleIrAReserva}
                            className="gap-1 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-xs sm:text-sm flex-1 sm:flex-none"
                            disabled={loadingReserva || loading}
                        >
                            <ArrowRight size={14} />
                            <span className="hidden sm:inline">{loadingReserva ? "Cargando..." : "Llevar a Reserva"}</span>
                            <span className="sm:hidden">{loadingReserva ? "..." : "Reserva"}</span>
                        </Button>
                    </div>
                </div>

                {/* ✅ INFORMACIÓN DE LA OPORTUNIDAD */}
                {oportunidad && (
                    <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
                        <CardHeader className="pb-3 sm:pb-6">
                            <CardTitle className="text-base sm:text-lg text-purple-900">
                                Información de la Oportunidad
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                                <div className="flex items-start gap-2 sm:gap-3">
                                    <User className="text-purple-600 mt-1 flex-shrink-0" size={18} />
                                    <div className="min-w-0">
                                        <p className="text-xs text-gray-600 font-semibold">Cliente</p>
                                        <p className="text-sm sm:text-base font-bold text-gray-900 truncate">
                                            {oportunidad.cliente_nombre}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">{oportunidad.cliente_email}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 sm:gap-3">
                                    <MapPin className="text-purple-600 mt-1 flex-shrink-0" size={18} />
                                    <div className="min-w-0">
                                        <p className="text-xs text-gray-600 font-semibold">Oportunidad</p>
                                        <p className="text-sm sm:text-base font-bold text-gray-900">
                                            {oportunidad.oportunidad_id}
                                        </p>
                                        <p className="text-xs text-gray-500 truncate">{oportunidad.origen_nombre}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 sm:gap-3">
                                    <Check className="text-purple-600 mt-1 flex-shrink-0" size={18} />
                                    <div className="min-w-0">
                                        <p className="text-xs text-gray-600 font-semibold">Etapa</p>
                                        <p className="text-sm sm:text-base font-bold text-purple-700">
                                            {oportunidad.etapa_nombre}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 sm:gap-3">
                                    <User className="text-purple-600 mt-1 flex-shrink-0" size={18} />
                                    <div className="min-w-0">
                                        <p className="text-xs text-gray-600 font-semibold">Creado por</p>
                                        <p className="text-sm sm:text-base font-bold text-gray-900 truncate">
                                            {oportunidad.creado_por_nombre}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 sm:gap-3">
                                    <User className="text-purple-600 mt-1 flex-shrink-0" size={18} />
                                    <div className="min-w-0">
                                        <p className="text-xs text-gray-600 font-semibold">Asignado a</p>
                                        <p className="text-sm sm:text-base font-bold text-gray-900 truncate">
                                            {oportunidad.asignado_a_nombre}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-2 sm:gap-3">
                                    <Mail className="text-purple-600 mt-1 flex-shrink-0" size={18} />
                                    <div className="min-w-0">
                                        <p className="text-xs text-gray-600 font-semibold">Detalle</p>
                                        <p className="text-xs sm:text-sm font-medium text-gray-900 line-clamp-2">
                                            {oportunidad.detalle || "Sin detalle"}
                                        </p>
                                    </div>
                                </div>

                                {oportunidad.detalles && oportunidad.detalles.length > 0 && (
                                    <div className="flex items-start gap-2 sm:gap-3">
                                        <Calendar className="text-purple-600 mt-1 flex-shrink-0" size={18} />
                                        <div className="min-w-0">
                                            <p className="text-xs text-gray-600 font-semibold">Fecha Agendada</p>
                                            <p className="text-sm sm:text-base font-medium text-gray-900">
                                                {new Date(oportunidad.detalles[0].fecha_agenda).toLocaleDateString(
                                                    "es-ES"
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ✅ INFORMACIÓN DEL VEHÍCULO */}
                <Card>
                    <CardHeader className="pb-3 sm:pb-6">
                        <CardTitle className="text-base sm:text-lg">
                            Información General - Vehículo
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                            {/* Marca */}
                            <div>
                                <p className="text-xs text-gray-600 font-semibold mb-1">Marca</p>
                                {editingField === "marca_id" ? (
                                    <div className="flex gap-1 sm:gap-2 mt-1">
                                        <Select
                                            value={String(editValues.marca_id || "")}
                                            onValueChange={(value) =>
                                                setEditValues({ ...editValues, marca_id: parseInt(value) })
                                            }
                                            disabled={savingEdit || loadingOptions}
                                        >
                                            <SelectTrigger className="text-xs sm:text-sm h-8">
                                                <SelectValue placeholder="Seleccionar" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {marcas.map((marca) => (
                                                    <SelectItem key={marca.id} value={String(marca.id)}>
                                                        {marca.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            size="sm"
                                            onClick={() => handleSaveEdit("marca_id")}
                                            disabled={savingEdit}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Check size={14} />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCancelEdit}
                                            disabled={savingEdit}
                                            className="h-8 w-8 p-0"
                                        >
                                            <X size={14} />
                                        </Button>
                                    </div>
                                ) : (
                                    <div
                                        className="text-sm sm:text-lg font-bold text-gray-900 cursor-pointer hover:bg-gray-100 p-1 sm:p-2 rounded truncate"
                                        onClick={() =>
                                            handleStartEdit("marca_id", cotizacion.marca_id)
                                        }
                                    >
                                        {cotizacion.marca}
                                    </div>
                                )}
                            </div>

                            {/* Modelo */}
                            <div>
                                <p className="text-xs text-gray-600 font-semibold mb-1">Modelo</p>
                                {editingField === "modelo_id" ? (
                                    <div className="flex gap-1 sm:gap-2 mt-1">
                                        <Select
                                            value={String(editValues.modelo_id || "")}
                                            onValueChange={(value) =>
                                                setEditValues({
                                                    ...editValues,
                                                    modelo_id: parseInt(value),
                                                })
                                            }
                                            disabled={savingEdit || loadingOptions}
                                        >
                                            <SelectTrigger className="text-xs sm:text-sm h-8">
                                                <SelectValue placeholder="Seleccionar" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {modelos.map((modelo) => (
                                                    <SelectItem key={modelo.id} value={String(modelo.id)}>
                                                        {modelo.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            size="sm"
                                            onClick={() => handleSaveEdit("modelo_id")}
                                            disabled={savingEdit}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Check size={14} />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCancelEdit}
                                            disabled={savingEdit}
                                            className="h-8 w-8 p-0"
                                        >
                                            <X size={14} />
                                        </Button>
                                    </div>
                                ) : (
                                    <div
                                        className="text-sm sm:text-lg font-bold text-gray-900 cursor-pointer hover:bg-gray-100 p-1 sm:p-2 rounded truncate"
                                        onClick={() =>
                                            handleStartEdit("modelo_id", cotizacion.modelo_id)
                                        }
                                    >
                                        {cotizacion.modelo}
                                    </div>
                                )}
                            </div>


                            {/* Versión */}
                            <div>
                                <p className="text-xs text-gray-600 font-semibold mb-1">Versión</p>
                                {editingField === "version_id" ? (
                                    <div className="flex gap-1 sm:gap-2 mt-1">
                                        <Select
                                            value={String(editValues.version_id || "null")}
                                            onValueChange={(value) => {
                                                console.log("Select changed to:", value);
                                                setEditValues({
                                                    ...editValues,
                                                    version_id: value === "null" ? null : parseInt(value),
                                                });
                                            }}
                                            disabled={savingEdit || loadingOptions}
                                        >
                                            <SelectTrigger className="text-xs sm:text-sm h-8">
                                                <SelectValue placeholder="Seleccionar" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="null">Sin versión</SelectItem>
                                                {versiones.map((version) => (
                                                    <SelectItem key={version.id} value={String(version.id)}>
                                                        {version.nombre}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            size="sm"
                                            onClick={() => handleSaveEdit("version_id")}
                                            disabled={savingEdit}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Check size={14} />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCancelEdit}
                                            disabled={savingEdit}
                                            className="h-8 w-8 p-0"
                                        >
                                            <X size={14} />
                                        </Button>
                                    </div>
                                ) : (
                                    <div
                                        className="text-sm sm:text-lg font-bold text-gray-900 cursor-pointer hover:bg-gray-100 p-1 sm:p-2 rounded truncate"
                                        onClick={() =>
                                            handleStartEdit("version_id", cotizacion.version_id)
                                        }
                                    >
                                        {cotizacion.version || "N/A"}
                                    </div>
                                )}
                            </div>
                            {/* Año */}
                            <div>
                                <p className="text-xs text-gray-600 font-semibold mb-1">Año</p>
                                {editingField === "anio" ? (
                                    <div className="flex gap-1 sm:gap-2 mt-1">
                                        <Input
                                            type="number"
                                            value={editValues.anio || ""}
                                            onChange={(e) =>
                                                setEditValues({
                                                    ...editValues,
                                                    anio: e.target.value ? parseInt(e.target.value) : null,
                                                })
                                            }
                                            className="text-xs sm:text-sm h-8"
                                            disabled={savingEdit}
                                        />
                                        <Button
                                            size="sm"
                                            onClick={() => handleSaveEdit("anio")}
                                            disabled={savingEdit}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Check size={14} />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCancelEdit}
                                            disabled={savingEdit}
                                            className="h-8 w-8 p-0"
                                        >
                                            <X size={14} />
                                        </Button>
                                    </div>
                                ) : (
                                    <div
                                        className="text-sm sm:text-lg font-bold text-gray-900 cursor-pointer hover:bg-gray-100 p-1 sm:p-2 rounded truncate"
                                        onClick={() => handleStartEdit("anio", cotizacion.anio)}
                                    >
                                        {cotizacion.anio || "N/A"}
                                    </div>
                                )}
                            </div>

                            {/* Color Externo */}
                            <div>
                                <p className="text-xs text-gray-600 font-semibold mb-1">Color Ext.</p>
                                {editingField === "color_externo" ? (
                                    <div className="flex gap-1 sm:gap-2 mt-1">
                                        <Input
                                            value={editValues.color_externo || ""}
                                            onChange={(e) =>
                                                setEditValues({
                                                    ...editValues,
                                                    color_externo: e.target.value,
                                                })
                                            }
                                            className="text-xs sm:text-sm h-8"
                                            disabled={savingEdit}
                                        />
                                        <Button
                                            size="sm"
                                            onClick={() => handleSaveEdit("color_externo")}
                                            disabled={savingEdit}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Check size={14} />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCancelEdit}
                                            disabled={savingEdit}
                                            className="h-8 w-8 p-0"
                                        >
                                            <X size={14} />
                                        </Button>
                                    </div>
                                ) : (
                                    <div
                                        className="text-sm sm:text-lg font-bold text-gray-900 cursor-pointer hover:bg-gray-100 p-1 sm:p-2 rounded truncate"
                                        onClick={() =>
                                            handleStartEdit("color_externo", cotizacion.color_externo)
                                        }
                                    >
                                        {cotizacion.color_externo || "N/A"}
                                    </div>
                                )}
                            </div>

                            {/* Color Interno */}
                            <div>
                                <p className="text-xs text-gray-600 font-semibold mb-1">Color Int.</p>
                                {editingField === "color_interno" ? (
                                    <div className="flex gap-1 sm:gap-2 mt-1">
                                        <Input
                                            value={editValues.color_interno || ""}
                                            onChange={(e) =>
                                                setEditValues({
                                                    ...editValues,
                                                    color_interno: e.target.value,
                                                })
                                            }
                                            className="text-xs sm:text-sm h-8"
                                            disabled={savingEdit}
                                        />
                                        <Button
                                            size="sm"
                                            onClick={() => handleSaveEdit("color_interno")}
                                            disabled={savingEdit}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Check size={14} />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCancelEdit}
                                            disabled={savingEdit}
                                            className="h-8 w-8 p-0"
                                        >
                                            <X size={14} />
                                        </Button>
                                    </div>
                                ) : (
                                    <div
                                        className="text-sm sm:text-lg font-bold text-gray-900 cursor-pointer hover:bg-gray-100 p-1 sm:p-2 rounded truncate"
                                        onClick={() =>
                                            handleStartEdit("color_interno", cotizacion.color_interno)
                                        }
                                    >
                                        {cotizacion.color_interno || "N/A"}
                                    </div>
                                )}
                            </div>

                            {/* SKU */}
                            <div>
                                <p className="text-xs text-gray-600 font-semibold mb-1">SKU</p>
                                {editingField === "sku" ? (
                                    <div className="flex gap-1 sm:gap-2 mt-1">
                                        <Input
                                            value={editValues.sku || ""}
                                            onChange={(e) =>
                                                setEditValues({ ...editValues, sku: e.target.value })
                                            }
                                            className="text-xs sm:text-sm h-8"
                                            disabled={savingEdit}
                                        />
                                        <Button
                                            size="sm"
                                            onClick={() => handleSaveEdit("sku")}
                                            disabled={savingEdit}
                                            className="h-8 w-8 p-0"
                                        >
                                            <Check size={14} />
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={handleCancelEdit}
                                            disabled={savingEdit}
                                            className="h-8 w-8 p-0"
                                        >
                                            <X size={14} />
                                        </Button>
                                    </div>
                                ) : (
                                    <div
                                        className="text-sm sm:text-lg font-bold text-gray-900 cursor-pointer hover:bg-gray-100 p-1 sm:p-2 rounded truncate"
                                        onClick={() => handleStartEdit("sku", cotizacion.sku)}
                                    >
                                        {cotizacion.sku || "N/A"}
                                    </div>
                                )}
                            </div>

                            {/* Estado */}
                            <div>
                                <p className="text-xs text-gray-600 font-semibold mb-1">Estado</p>
                                <p
                                    className={`text-sm sm:text-lg font-bold ${cotizacion.estado === "aceptada"
                                        ? "text-green-600"
                                        : cotizacion.estado === "enviada"
                                            ? "text-blue-600"
                                            : cotizacion.estado === "cancelado"
                                                ? "text-red-600"
                                                : "text-gray-600"
                                        }`}
                                >
                                    {cotizacion.estado === "borrador"
                                        ? "Abierto"
                                        : cotizacion.estado.charAt(0).toUpperCase() +
                                        cotizacion.estado.slice(1)}
                                </p>
                            </div>

                            {/* Creado */}
                            <div>
                                <p className="text-xs text-gray-600 font-semibold mb-1">Creado</p>
                                <p className="text-sm sm:text-lg font-bold text-gray-900">
                                    {new Date(cotizacion.created_at).toLocaleDateString("es-ES", {
                                        month: "2-digit",
                                        day: "2-digit",
                                    })}
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ✅ ESPECIFICACIONES DEL MODELO */}
                {especificaciones.length > 0 && (
                    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <CardHeader className="pb-3 sm:pb-6">
                            <CardTitle className="text-base sm:text-lg text-blue-900">
                                Especificaciones del Modelo
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-4">
                                {especificaciones.map((espec) => (
                                    <div
                                        key={espec.id}
                                        className="bg-white p-2 sm:p-4 rounded-lg border border-blue-200"
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            {espec.especificacion_nombre === "motor" && (
                                                <Zap className="text-blue-600 flex-shrink-0" size={16} />
                                            )}
                                            {espec.especificacion_nombre === "full" && (
                                                <ImageIcon className="text-blue-600 flex-shrink-0" size={16} />
                                            )}
                                            {espec.especificacion_nombre === "imagen" && (
                                                <ImageIcon className="text-blue-600 flex-shrink-0" size={16} />
                                            )}
                                            {espec.especificacion_nombre === "video" && (
                                                <Video className="text-blue-600 flex-shrink-0" size={16} />
                                            )}
                                            <p className="text-xs font-semibold text-gray-700 capitalize truncate">
                                                {espec.especificacion_nombre}
                                            </p>
                                        </div>

                                        {espec.tipo_dato === "media" && (
                                            <img
                                                src={espec.valor}
                                                alt={espec.especificacion_nombre}
                                                className="w-full h-24 sm:h-32 object-cover rounded"
                                            />
                                        )}

                                        {espec.tipo_dato === "texto" && espec.especificacion_nombre === "video" && (
                                            <a
                                                href={espec.valor}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:underline text-xs break-all"
                                            >
                                                Ver Video
                                            </a>
                                        )}

                                        {espec.tipo_dato === "texto" &&
                                            espec.especificacion_nombre !== "video" &&
                                            !espec.valor.includes("http") && (
                                                <p className="text-sm sm:text-base font-bold text-gray-900">
                                                    {espec.valor}
                                                </p>
                                            )}

                                        {espec.tipo_dato === "texto" && espec.valor.includes("http") && (
                                            <img
                                                src={espec.valor}
                                                alt={espec.especificacion_nombre}
                                                className="w-full h-24 sm:h-32 object-cover rounded"
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ✅ PRECIO DEL VEHÍCULO */}
                {precioActual && (
                    <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
                        <CardHeader className="pb-3 sm:pb-6">
                            <CardTitle className="text-base sm:text-lg text-orange-900">
                                Precio del Vehículo
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4">
                                <div className="bg-white p-2 sm:p-4 rounded-lg border border-orange-200">
                                    <p className="text-xs text-gray-600 font-semibold">Modelo/Versión</p>
                                    <p className="text-xs sm:text-base font-bold text-gray-900 mt-1 truncate">
                                        {precioActual.modelo} {precioActual.version}
                                    </p>
                                </div>

                                <div className="bg-white p-2 sm:p-4 rounded-lg border border-orange-200">
                                    <p className="text-xs text-gray-600 font-semibold">Stock</p>
                                    <p
                                        className={`text-xs sm:text-base font-bold mt-1 ${precioActual.en_stock ? "text-green-600" : "text-red-600"
                                            }`}
                                    >
                                        {precioActual.en_stock ? "✓ Disponible" : "✗ No disponible"}
                                    </p>
                                </div>

                                <div className="bg-white p-2 sm:p-4 rounded-lg border border-orange-200">
                                    <p className="text-xs text-gray-600 font-semibold">Entrega (días)</p>
                                    <p className="text-xs sm:text-base font-bold text-gray-900 mt-1">
                                        {precioActual.tiempo_entrega_dias}
                                    </p>
                                </div>

                                <div className="bg-white p-2 sm:p-4 rounded-lg border border-orange-200">
                                    <p className="text-xs text-gray-600 font-semibold flex items-center gap-1">
                                        <DollarSign size={12} />
                                        Precio
                                    </p>
                                    <p className="text-xs sm:text-lg font-bold text-orange-600 mt-1 break-all">
                                        ${parseFloat(precioActual.precio_base).toLocaleString("en-US", {
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                        })}
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* ✅ SECCIÓN ACCESORIOS */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">
                            Accesorios ({accesorios.length})
                        </CardTitle>
                        <Button
                            size="sm"
                            onClick={() => setOpenAccesoriosDialog(true)}
                            className="gap-2"
                        >
                            <Plus size={14} />
                            Agregar
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {accesorios.length > 0 ? (
                            <>
                                {accesoriosAgrupados.map((grupo) => (
                                    <div key={grupo.codigo} className="space-y-3">
                                        <h3 className="font-semibold text-gray-900 text-sm">
                                            {grupo.codigo} ({grupo.simbolo})
                                        </h3>

                                        <div className="border rounded-lg overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-100 border-b">
                                                        <th className="text-left p-3 font-semibold">Descripción</th>
                                                        <th className="text-left p-3 font-semibold">N° Parte</th>
                                                        <th className="text-right p-3 font-semibold">Cant.</th>
                                                        <th className="text-right p-3 font-semibold">Unitario</th>
                                                        <th className="text-right p-3 font-semibold">Subtotal</th>
                                                        <th className="text-right p-3 font-semibold">Desc.</th>
                                                        <th className="text-right p-3 font-semibold">S/IGV</th>
                                                        <th className="text-right p-3 font-semibold">IGV</th>
                                                        <th className="text-right p-3 font-semibold">Total</th>
                                                        <th className="text-center p-3 font-semibold">Acción</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {grupo.items.map((acc) => {
                                                        const totalSinIgv = parseFloat(acc.subtotal) - parseFloat(acc.descuento_monto);
                                                        const igv = totalSinIgv * IGV_RATE;
                                                        const totalConIgv = totalSinIgv + igv;

                                                        return (
                                                            <tr key={acc.id} className="border-b hover:bg-gray-50">
                                                                <td className="p-3">{acc.detalle}</td>
                                                                <td className="p-3 text-gray-600">{acc.numero_parte}</td>
                                                                <td className="text-right p-3">{acc.cantidad}</td>
                                                                <td className="text-right p-3">
                                                                    ${parseFloat(acc.precio_unitario).toFixed(2)}
                                                                </td>
                                                                <td className="text-right p-3">
                                                                    ${parseFloat(acc.subtotal).toFixed(2)}
                                                                </td>
                                                                <td className="text-right p-3">
                                                                    {parseFloat(acc.descuento_monto) > 0 ? (
                                                                        <p className="text-red-600 font-bold">
                                                                            -${parseFloat(acc.descuento_monto).toFixed(2)}
                                                                        </p>
                                                                    ) : (
                                                                        "-"
                                                                    )}
                                                                </td>
                                                                <td className="text-right p-3">
                                                                    ${totalSinIgv.toFixed(2)}
                                                                </td>
                                                                <td className="text-right p-3 text-green-600 font-bold">
                                                                    ${igv.toFixed(2)}
                                                                </td>
                                                                <td className="text-right p-3 font-bold text-blue-600">
                                                                    ${totalConIgv.toFixed(2)}
                                                                </td>
                                                                <td className="text-center p-3 flex gap-1 justify-center">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => {
                                                                            setEditingAccesorio(acc);
                                                                            setOpenEditAccesorio(true);
                                                                        }}
                                                                        disabled={savingEdit}
                                                                        className="text-blue-600 hover:text-blue-700"
                                                                    >
                                                                        <Edit2 size={14} />
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => handleEliminarAccesorio(acc.id)}
                                                                        disabled={savingEdit}
                                                                        className="text-red-600 hover:text-red-700"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}

                                {/* Totales de Accesorios */}
                                <div className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-lg border border-blue-200 space-y-2">
                                    <div className="grid grid-cols-4 gap-4 text-sm font-semibold">
                                        <div>
                                            <p className="text-gray-700">Subtotal:</p>
                                            <p className="font-bold">${accesoriosTotales.subtotal.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-700">Descuentos:</p>
                                            <p className="font-bold text-red-600">-${accesoriosTotales.descuentos.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-700">S/IGV:</p>
                                            <p className="font-bold">${accesoriosTotales.totalSinIgv.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-700">IGV (18%):</p>
                                            <p className="font-bold text-green-600">+${accesoriosTotales.igv.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="border-t pt-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-lg text-gray-900">Total Accesorios:</span>
                                            <span className="font-bold text-lg text-blue-600">
                                                ${accesoriosTotales.total.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Descuento Total Accesorios */}
                                    <div className="border-t pt-3 mt-3">
                                        {editingDescuentoAcc ? (
                                            <div className="flex gap-2 items-center">
                                                <span className="font-bold text-gray-900 flex-1">
                                                    Descuento Gral.:
                                                </span>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={descuentoAccValue}
                                                    onChange={(e) =>
                                                        setDescuentoAccValue(parseFloat(e.target.value) || 0)
                                                    }
                                                    className="w-32 text-sm"
                                                    disabled={savingEdit}
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={handleSaveDescuentoAcc}
                                                    disabled={savingEdit}
                                                >
                                                    <Check size={14} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setEditingDescuentoAcc(false);
                                                        setDescuentoAccValue(descuentoTotalAcc);
                                                    }}
                                                    disabled={savingEdit}
                                                >
                                                    <X size={14} />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div
                                                className="flex justify-between items-center cursor-pointer hover:bg-blue-100 p-2 rounded"
                                                onClick={() => setEditingDescuentoAcc(true)}
                                            >
                                                <span className="font-bold text-gray-900">
                                                    Descuento Gral.:
                                                </span>
                                                <span className="font-bold text-red-600">
                                                    -${descuentoTotalAcc.toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className="text-center text-gray-500">
                                No hay accesorios en esta cotización
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* ✅ SECCIÓN REGALOS */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <CardTitle className="text-lg">
                            Regalos ({regalos.length})
                        </CardTitle>
                        <Button
                            size="sm"
                            onClick={() => setOpenRegalosDialog(true)}
                            className="gap-2"
                        >
                            <Plus size={14} />
                            Agregar
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {regalos.length > 0 ? (
                            <>
                                {regalosAgrupados.map((grupo) => (
                                    <div key={grupo.codigo} className="space-y-3">
                                        <h3 className="font-semibold text-gray-900 text-sm">
                                            {grupo.codigo} ({grupo.simbolo})
                                        </h3>

                                        <div className="border rounded-lg overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead>
                                                    <tr className="bg-gray-100 border-b">
                                                        <th className="text-left p-3 font-semibold">Descripción</th>
                                                        <th className="text-left p-3 font-semibold">Lote</th>
                                                        <th className="text-center p-3 font-semibold">Tienda</th>
                                                        <th className="text-right p-3 font-semibold">Cant.</th>
                                                        <th className="text-right p-3 font-semibold">Unitario</th>
                                                        <th className="text-right p-3 font-semibold">Subtotal</th>
                                                        <th className="text-right p-3 font-semibold">Desc.</th>
                                                        <th className="text-right p-3 font-semibold">S/IGV</th>
                                                        <th className="text-right p-3 font-semibold">IGV</th>
                                                        <th className="text-right p-3 font-semibold">Total</th>
                                                        <th className="text-center p-3 font-semibold">Acción</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {grupo.items.map((regalo) => {
                                                        const totalSinIgv = parseFloat(regalo.subtotal) - parseFloat(regalo.descuento_monto);
                                                        const igv = totalSinIgv * IGV_RATE;
                                                        const totalConIgv = totalSinIgv + igv;

                                                        return (
                                                            <tr key={regalo.id} className="border-b hover:bg-gray-50">
                                                                <td className="p-3">{regalo.detalle}</td>
                                                                <td className="p-3 text-gray-600">{regalo.lote}</td>
                                                                <td className="p-3 text-center">
                                                                    <span className={`text-xs font-bold ${regalo.regalo_tienda
                                                                        ? "text-green-600"
                                                                        : "text-gray-600"
                                                                        }`}>
                                                                        {regalo.regalo_tienda ? "✓" : "✗"}
                                                                    </span>
                                                                </td>
                                                                <td className="text-right p-3">{regalo.cantidad}</td>
                                                                <td className="text-right p-3">
                                                                    ${parseFloat(regalo.precio_unitario).toFixed(2)}
                                                                </td>
                                                                <td className="text-right p-3">
                                                                    ${parseFloat(regalo.subtotal).toFixed(2)}
                                                                </td>
                                                                <td className="text-right p-3">
                                                                    {parseFloat(regalo.descuento_monto) > 0 ? (
                                                                        <p className="text-red-600 font-bold">
                                                                            -${parseFloat(regalo.descuento_monto).toFixed(2)}
                                                                        </p>
                                                                    ) : (
                                                                        "-"
                                                                    )}
                                                                </td>
                                                                <td className="text-right p-3">
                                                                    ${totalSinIgv.toFixed(2)}
                                                                </td>
                                                                <td className="text-right p-3 text-green-600 font-bold">
                                                                    ${igv.toFixed(2)}
                                                                </td>
                                                                <td className="text-right p-3 font-bold text-blue-600">
                                                                    ${totalConIgv.toFixed(2)}
                                                                </td>
                                                                <td className="text-center p-3 flex gap-1 justify-center">
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => {
                                                                            setEditingRegalo(regalo);
                                                                            setOpenEditRegalo(true);
                                                                        }}
                                                                        disabled={savingEdit}
                                                                        className="text-blue-600 hover:text-blue-700"
                                                                    >
                                                                        <Edit2 size={14} />
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => handleEliminarRegalo(regalo.id)}
                                                                        disabled={savingEdit}
                                                                        className="text-red-600 hover:text-red-700"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </Button>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))}

                                {/* Totales de Regalos */}
                                <div className="bg-gradient-to-r from-pink-50 to-rose-50 p-4 rounded-lg border border-pink-200 space-y-2">
                                    <div className="grid grid-cols-4 gap-4 text-sm font-semibold">
                                        <div>
                                            <p className="text-gray-700">Subtotal:</p>
                                            <p className="font-bold">${regalosTotal.subtotal.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-700">Descuentos:</p>
                                            <p className="font-bold text-red-600">-${regalosTotal.descuentos.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-700">S/IGV:</p>
                                            <p className="font-bold">${regalosTotal.totalSinIgv.toFixed(2)}</p>
                                        </div>
                                        <div>
                                            <p className="text-gray-700">IGV (18%):</p>
                                            <p className="font-bold text-green-600">+${regalosTotal.igv.toFixed(2)}</p>
                                        </div>
                                    </div>
                                    <div className="border-t pt-3">
                                        <div className="flex justify-between items-center">
                                            <span className="font-bold text-lg text-gray-900">Total Regalos:</span>
                                            <span className="font-bold text-lg text-pink-600">
                                                ${regalosTotal.total.toFixed(2)}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Descuento Total Regalos */}
                                    <div className="border-t pt-3 mt-3">
                                        {editingDescuentoReg ? (
                                            <div className="flex gap-2 items-center">
                                                <span className="font-bold text-gray-900 flex-1">
                                                    Descuento Gral.:
                                                </span>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={descuentoRegValue}
                                                    onChange={(e) =>
                                                        setDescuentoRegValue(parseFloat(e.target.value) || 0)
                                                    }
                                                    className="w-32 text-sm"
                                                    disabled={savingEdit}
                                                />
                                                <Button
                                                    size="sm"
                                                    onClick={handleSaveDescuentoReg}
                                                    disabled={savingEdit}
                                                >
                                                    <Check size={14} />
                                                </Button>
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setEditingDescuentoReg(false);
                                                        setDescuentoRegValue(descuentoTotalReg);
                                                    }}
                                                    disabled={savingEdit}
                                                >
                                                    <X size={14} />
                                                </Button>
                                            </div>
                                        ) : (
                                            <div
                                                className="flex justify-between items-center cursor-pointer hover:bg-pink-100 p-2 rounded"
                                                onClick={() => setEditingDescuentoReg(true)}
                                            >
                                                <span className="font-bold text-gray-900">
                                                    Descuento Gral.:
                                                </span>
                                                <span className="font-bold text-red-600">
                                                    -${descuentoTotalReg.toFixed(2)}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </>
                        ) : (
                            <p className="text-center text-gray-500">
                                No hay regalos en esta cotización
                            </p>
                        )}
                    </CardContent>
                </Card>

                {/* ✅ RESUMEN GENERAL */}
                <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
                    <CardHeader>
                        <CardTitle className="text-xl text-green-900">
                            Resumen General
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                                <div className="bg-white p-4 rounded-lg border border-green-200">
                                    <p className="text-xs text-gray-600 font-semibold">Subtotal</p>
                                    <p className="text-lg font-bold text-gray-900">
                                        ${(accesoriosTotales.subtotal + regalosTotal.subtotal).toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-green-200">
                                    <p className="text-xs text-gray-600 font-semibold">Descuentos Items</p>
                                    <p className="text-lg font-bold text-red-600">
                                        -${(accesoriosTotales.descuentos + regalosTotal.descuentos).toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-green-200">
                                    <p className="text-xs text-gray-600 font-semibold">Subtotal (S/IGV)</p>
                                    <p className="text-lg font-bold text-gray-900">
                                        ${subtotalGeneral.toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-green-200">
                                    <p className="text-xs text-gray-600 font-semibold">IGV (18%)</p>
                                    <p className="text-lg font-bold text-green-600">
                                        +${igvGeneral.toFixed(2)}
                                    </p>
                                </div>
                                <div className="bg-white p-4 rounded-lg border border-green-200">
                                    <p className="text-xs text-gray-600 font-semibold">Desc. Generales</p>
                                    <p className="text-lg font-bold text-red-600">
                                        -${(descuentoTotalAcc + descuentoTotalReg).toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white border-2 border-green-400 rounded-lg p-4 mt-4">
                                <p className="text-sm text-gray-600 font-bold">GRAN TOTAL (CON IGV)</p>
                                <p className="text-5xl font-bold text-green-600">
                                    ${granTotal.toFixed(2)}
                                </p>
                                <p className="text-xs text-gray-500 mt-2">
                                    Incluye todos los descuentos e IGV
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* ✅ ACCIONES */}
                <div className="flex gap-4 justify-center">
                    <Button
                        onClick={async () => {
                            try {
                                const res = await fetch("/api/cotizaciones-pdf", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ cotizacion_id: cotizacion.id }),
                                });

                                if (!res.ok) throw new Error("Error descargando PDF");

                                const blob = await res.blob();
                                const url = window.URL.createObjectURL(blob);
                                const a = document.createElement("a");
                                a.href = url;
                                a.download = `cotizacion-${cotizacion.id}.pdf`;
                                a.click();
                                window.URL.revokeObjectURL(url);

                                toast.success("PDF descargado");
                            } catch (error) {
                                toast.error(error.message);
                            }
                        }}
                        disabled={loading}
                    >
                        <Download size={16} className="mr-2" />
                        Descargar PDF
                    </Button>
                </div>
            </div>

            {/* ✅ DIÁLOGOS */}
            <AgregarAccesorioDialog
                open={openAccesoriosDialog}
                onOpenChange={setOpenAccesoriosDialog}
                cotizacion={cotizacion}
                marcaId={cotizacion?.marca_id}
                modeloId={cotizacion?.modelo_id}
                onAccesorioAdded={loadData}
            />

            <AgregarRegalosDialog
                open={openRegalosDialog}
                onOpenChange={setOpenRegalosDialog}
                cotizacion={cotizacion}
                onRegaloAdded={loadData}
            />

            <EditarAccesorioDialog
                open={openEditAccesorio}
                onOpenChange={setOpenEditAccesorio}
                accesorio={editingAccesorio}
                onAccesorioUpdated={loadData}
            />

            <EditarRegaloDialog
                open={openEditRegalo}
                onOpenChange={setOpenEditRegalo}
                regalo={editingRegalo}
                onRegaloUpdated={loadData}
            />
        </div>
    );
}