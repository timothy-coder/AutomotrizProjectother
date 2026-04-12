// app/(dashboard)/cotizaciones/[id]/resumen/dialogs/AgregarAccesorioDialog.jsx

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

export function AgregarAccesorioDialog({
    open,
    onOpenChange,
    cotizacion,
    marcaId,
    modeloId,
    onAccesorioAdded,
    igvRate = 0.18,
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
        const precioBase = parseFloat(accesorio.precio_con_impuesto) || parseFloat(accesorio.precio_venta) || 0;
        const cantidad = accesorio.cantidad || 1;
        const subtotal = precioBase * cantidad;

        let descuento = 0;
        if (accesorio.descuento_porcentaje) {
            descuento = subtotal * (parseFloat(accesorio.descuento_porcentaje) / 100);
        } else if (accesorio.descuento_monto) {
            descuento = parseFloat(accesorio.descuento_monto);
        }

        let totalSinIgv;
        let igvCalculado = 0;
        let totalConIgv;
        
        if (accesorio.impuesto_id) {
            const totalConIgvYDescuento = subtotal - descuento;
            totalSinIgv = totalConIgvYDescuento / (1 + igvRate);
            igvCalculado = totalConIgvYDescuento - totalSinIgv;
            totalConIgv = totalConIgvYDescuento;
        } else {
            totalSinIgv = subtotal - descuento;
            igvCalculado = totalSinIgv * igvRate;
            totalConIgv = totalSinIgv + igvCalculado;
        }

        return {
            subtotal: subtotal.toFixed(2),
            descuento: descuento.toFixed(2),
            totalSinIgv: totalSinIgv.toFixed(2),
            igv: igvCalculado.toFixed(2),
            totalConIgv: totalConIgv.toFixed(2),
            tieneImpuesto: accesorio.impuesto_id ? true : false,
        };
    };

    async function handleAgregar() {
        if (selectedAccesorios.length === 0) {
            toast.warning("Selecciona al menos un accesorio");
            return;
        }

        setSaving(true);
        try {
            let allSuccess = true;

            for (const accesorio of selectedAccesorios) {
                const totals = calculateTotals(accesorio);
                
                try {
                    const res = await fetch(`/api/cotizaciones-accesorios`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            cotizacion_id: cotizacion.id,
                            accesorio_id: accesorio.id,
                            cantidad: accesorio.cantidad || 1,
                            descuento_porcentaje: accesorio.descuento_porcentaje || null,
                            descuento_monto: accesorio.descuento_monto || null,
                            notas: accesorio.notas || null,
                            subtotal: parseFloat(totals.subtotal),
                            descuento_calculado: parseFloat(totals.descuento),
                            total_sin_igv: parseFloat(totals.totalSinIgv),
                            igv: parseFloat(totals.igv),
                            total_con_igv: parseFloat(totals.totalConIgv),
                            precio_unitario: parseFloat(accesorio.precio_con_impuesto || accesorio.precio_venta),
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

            if (!allSuccess && selectedAccesorios.length === 0) {
                throw new Error("Error agregando accesorios");
            }

            toast.success(`${selectedAccesorios.length} accesorio(s) agregado(s)`);
            
            // ✅ CAMBIO: Pasar un callback que hace la recarga
            onAccesorioAdded();
            
            setSelectedAccesorios([]);
            setExpandedId(null);
            onOpenChange(false);
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
                                                    ${parseFloat(accesorio.precio_con_impuesto || accesorio.precio_venta).toFixed(2)}
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
                                                                                ? selectedItem.descuento_porcentaje ||
                                                                                ""
                                                                                : selectedItem.descuento_monto ||
                                                                                ""
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

                                                                    <p className="text-gray-600">
                                                                        Subtotal (sin IGV):
                                                                    </p>
                                                                    <p className="text-right font-bold">
                                                                        ${totals.totalSinIgv}
                                                                    </p>

                                                                    {!totals.tieneImpuesto && (
                                                                        <>
                                                                            <p className="text-gray-600">
                                                                                IGV ({(igvRate * 100).toFixed(0)}%):
                                                                            </p>
                                                                            <p className="text-right font-bold text-green-600">
                                                                                +${totals.igv}
                                                                            </p>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div className="border-t pt-2">
                                                                    <div className="flex justify-between text-sm font-bold">
                                                                        <p>Total (con IGV):</p>
                                                                        <p className="text-blue-600">
                                                                            ${totals.totalConIgv}
                                                                        </p>
                                                                    </div>
                                                                    {totals.tieneImpuesto && (
                                                                        <p className="text-xs text-gray-500 mt-1">
                                                                            ✓ Incluye IGV
                                                                        </p>
                                                                    )}
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