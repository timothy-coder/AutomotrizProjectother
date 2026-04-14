// app/(dashboard)/cotizaciones/[id]/resumen/dialogs/EditarAccesorioDialog.jsx

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
import { Check, X } from "lucide-react";
import { toast } from "sonner";

export function EditarAccesorioDialog({
    open,
    onOpenChange,
    accesorio,
    onAccesorioUpdated,
    igvRate = 0.18,
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
            // ✅ Determinar el tipo de descuento basado en los datos actuales
            let descuentoTipo = "ninguno";
            if (accesorio.descuento_porcentaje && parseFloat(accesorio.descuento_porcentaje) > 0) {
                descuentoTipo = "porcentaje";
            } else if (accesorio.descuento_monto && parseFloat(accesorio.descuento_monto) > 0) {
                descuentoTipo = "monto";
            }

            setFormData({
                cantidad: parseInt(accesorio.cantidad) || 1,
                descuento_tipo: descuentoTipo,
                descuento_porcentaje: accesorio.descuento_porcentaje ? parseFloat(accesorio.descuento_porcentaje) : null,
                descuento_monto: accesorio.descuento_monto ? parseFloat(accesorio.descuento_monto) : null,
                notas: accesorio.notas || null,
            });
        }
    }, [accesorio, open]);

    const calculateTotals = () => {
        if (!accesorio) return null;
        
        // ✅ El precio ya viene CON IGV
        const precioConIgv = parseFloat(accesorio.precio_unitario) || 0;
        const cantidad = formData.cantidad || 1;
        const subtotalConIgv = precioConIgv * cantidad;

        let descuento = 0;
        if (
            formData.descuento_tipo === "porcentaje" &&
            formData.descuento_porcentaje !== null &&
            formData.descuento_porcentaje > 0
        ) {
            descuento = subtotalConIgv * (parseFloat(formData.descuento_porcentaje) / 100);
        } else if (
            formData.descuento_tipo === "monto" &&
            formData.descuento_monto !== null &&
            formData.descuento_monto > 0
        ) {
            descuento = parseFloat(formData.descuento_monto);
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

    async function handleGuardar() {
        try {
            setSaving(true);

            const totals = calculateTotals();

            // ✅ Calcular los valores correctos
            const nuevoCantidad = formData.cantidad;
            const nuevoDescuentoMonto = 
                formData.descuento_tipo === "monto" 
                    ? formData.descuento_monto 
                    : null;
            const nuevoDescuentoPorcentaje = 
                formData.descuento_tipo === "porcentaje" 
                    ? formData.descuento_porcentaje 
                    : null;

            const res = await fetch(
                `/api/cotizaciones-accesorios/${accesorio.id}`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        cantidad: nuevoCantidad,
                        descuento_porcentaje: nuevoDescuentoPorcentaje,
                        descuento_monto: nuevoDescuentoMonto,
                        // ✅ Enviar el total con IGV como subtotal
                        subtotal: parseFloat(totals.totalConIgv),
                        // ✅ Total final es total con IGV menos descuento
                        total: parseFloat(totals.totalConIgv) - (parseFloat(totals.descuento) || 0),
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
                                    <p className="text-gray-600 font-semibold">Precio Unitario (c/IGV)</p>
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
                                        <SelectItem value="porcentaje">
                                            Por Porcentaje (%)
                                        </SelectItem>
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
                                                ? formData.descuento_porcentaje ?? ""
                                                : formData.descuento_monto ?? ""
                                        }
                                        onChange={(e) => {
                                            const value = e.target.value
                                                ? parseFloat(e.target.value)
                                                : null;
                                            if (formData.descuento_tipo === "porcentaje") {
                                                setFormData({
                                                    ...formData,
                                                    descuento_porcentaje: value,
                                                    descuento_monto: null,
                                                });
                                            } else {
                                                setFormData({
                                                    ...formData,
                                                    descuento_monto: value,
                                                    descuento_porcentaje: null,
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
                                    value={formData.notas ?? ""}
                                    onChange={(e) =>
                                        setFormData({ ...formData, notas: e.target.value || null })
                                    }
                                    disabled={saving}
                                    className="text-sm"
                                />
                            </div>

                            {totals && (
                                <div className="space-y-2 p-3 bg-blue-50 rounded border-2 border-blue-200">
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <p className="text-gray-600">Total C/IGV:</p>
                                        <p className="text-right font-bold">${totals.totalConIgv}</p>

                                        <p className="text-gray-600">Descuento:</p>
                                        <p className="text-right font-bold text-red-600">
                                            -${totals.descuento}
                                        </p>

                                        <p className="text-gray-600">S/IGV:</p>
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
                                            <p className="text-blue-600">${(parseFloat(totals.totalConIgv) - parseFloat(totals.descuento)).toFixed(2)}</p>
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