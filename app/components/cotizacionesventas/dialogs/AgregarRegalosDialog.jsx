// app/(dashboard)/cotizaciones/[id]/resumen/dialogs/AgregarRegalosDialog.jsx

import { useEffect, useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Loader, Plus } from "lucide-react";
import { toast } from "sonner";

export function AgregarRegalosDialog({
    open,
    onOpenChange,
    cotizacion,
    onRegaloAdded,
    igvRate = 0.18,
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

    // ✅ CAMBIO: El precio YA VIENE CON IGV
    const calculateTotals = (regalo) => {
        // ✅ Precio ya incluye IGV
        const precioConIgv =
            parseFloat(regalo.precio_venta || regalo.precio_compra) || 0;
        const cantidad = regalo.cantidad || 1;
        const subtotalConIgv = precioConIgv * cantidad;

        let descuento = 0;
        if (
            regalo.descuento_porcentaje &&
            parseFloat(regalo.descuento_porcentaje) > 0
        ) {
            descuento =
                subtotalConIgv * (parseFloat(regalo.descuento_porcentaje) / 100);
        } else if (
            regalo.descuento_monto &&
            parseFloat(regalo.descuento_monto) > 0
        ) {
            descuento = parseFloat(regalo.descuento_monto);
        }

        // ✅ Calcular SIN IGV desde el total CON IGV
        const totalConIgvYDescuento = subtotalConIgv - descuento;
        const totalSinIgv = totalConIgvYDescuento / (1 + igvRate);
        const igv = totalConIgvYDescuento - totalSinIgv;

        return {
            subtotal: subtotalConIgv.toFixed(2),
            descuento: descuento.toFixed(2),
            totalSinIgv: totalSinIgv.toFixed(2),
            igv: igv.toFixed(2),
            totalConIgv: totalConIgvYDescuento.toFixed(2),
        };
    };

    async function handleAgregar() {
        if (selectedRegalos.length === 0) {
            toast.warning("Selecciona al menos un regalo");
            return;
        }

        setSaving(true);
        try {
            let allSuccess = true;

            for (const regalo of selectedRegalos) {
                const totals = calculateTotals(regalo);

                try {
                    const res = await fetch(`/api/cotizaciones-regalos`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            cotizacion_id: cotizacion.id,
                            regalo_id: regalo.id,
                            cantidad: regalo.cantidad || 1,
                            descuento_porcentaje: regalo.descuento_porcentaje || null,
                            descuento_monto: regalo.descuento_monto || null,
                            notas: regalo.notas || null,
                            // ✅ Enviar los totales calculados
                            subtotal: parseFloat(totals.subtotal),
                            descuento_calculado: parseFloat(totals.descuento),
                            total_sin_igv: parseFloat(totals.totalSinIgv),
                            igv: parseFloat(totals.igv),
                            total_con_igv: parseFloat(totals.totalConIgv),
                            precio_unitario: parseFloat(regalo.precio_venta || regalo.precio_compra),
                        }),
                    });

                    if (!res.ok) {
                        allSuccess = false;
                    }
                } catch (error) {
                    console.error(error);
                    allSuccess = false;
                }
            }

            if (!allSuccess && selectedRegalos.length === 0) {
                throw new Error("Error agregando regalos");
            }

            toast.success(`${selectedRegalos.length} regalo(s) agregado(s)`);
            
            // ✅ CAMBIO: Solo llamar callback sin parámetros
            onRegaloAdded();
            
            setSelectedRegalos([]);
            setExpandedId(null);
            onOpenChange(false);
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
                                        <th className="text-center p-2 sm:p-3 min-w-[60px]">
                                            Tienda
                                        </th>
                                        <th className="text-right p-2 sm:p-3 min-w-[80px]">Precio (c/IGV)</th>
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
                                                className={`border-b transition-colors ${
                                                    isSelected ? "bg-blue-50" : "hover:bg-gray-50"
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
                                                        className={`text-xs font-bold ${
                                                            regalo.regalo_tienda
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
                                                        <span className="text-gray-400 text-xs sm:text-sm">
                                                            -
                                                        </span>
                                                    )}
                                                </td>
                                                <td className="text-right p-2 sm:p-3 font-bold text-blue-600 text-xs sm:text-sm">
                                                    {isSelected && totals ? `$${totals.totalConIgv}` : "-"}
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

                                                            {selectedItem.descuento_tipo !== "ninguno" && (
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
                                                                                ? selectedItem.descuento_porcentaje ??
                                                                                ""
                                                                                : selectedItem.descuento_monto ??
                                                                                ""
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
                                                                value={selectedItem.notas ?? ""}
                                                                onChange={(e) => {
                                                                    setSelectedRegalos(
                                                                        selectedRegalos.map((r) =>
                                                                            r.id === selectedItem.id
                                                                                ? {
                                                                                    ...r,
                                                                                    notas: e.target.value || null,
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
                                                                    <p className="text-gray-600">Total C/IGV:</p>
                                                                    <p className="text-right font-bold">
                                                                        ${totals.totalConIgv}
                                                                    </p>

                                                                    <p className="text-gray-600">Descuento:</p>
                                                                    <p className="text-right font-bold text-red-600">
                                                                        -${totals.descuento}
                                                                    </p>

                                                                    <p className="text-gray-600">
                                                                        S/IGV:
                                                                    </p>
                                                                    <p className="text-right font-bold">
                                                                        ${totals.totalSinIgv}
                                                                    </p>

                                                                    <p className="text-gray-600">IGV ({(igvRate * 100).toFixed(0)}%):</p>
                                                                    <p className="text-right font-bold text-green-600">
                                                                        +${totals.igv}
                                                                    </p>
                                                                </div>
                                                                <div className="border-t pt-2">
                                                                    <div className="flex justify-between text-sm font-bold">
                                                                        <p>Total Final:</p>
                                                                        <p className="text-blue-600">
                                                                            ${(parseFloat(totals.totalConIgv) - parseFloat(totals.descuento)).toFixed(2)}
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