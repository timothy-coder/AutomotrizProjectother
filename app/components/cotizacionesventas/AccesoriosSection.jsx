// app/components/cotizacionesventas/AccesoriosSection.jsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export function AccesoriosSection({
    accesorios: accesoriosInitial,
    savingEdit: savingEditInitial,
    onAddClick,
    onEditClick,
    onEditingDescuentoChange,
    onDescuentoValueChange,
    onSaveDescuento,
    editingDescuentoAcc,
    descuentoAccValue,
    descuentoTotalAcc,
    onAccesorioDeleted,
}) {
    const [accesorios, setAccesorios] = useState(accesoriosInitial);
    const [igvRate, setIgvRate] = useState(0.18);
    const [savingEdit, setSavingEdit] = useState(false);
    const accesoriosAgrupados = agruparPorMoneda(accesorios);

    // ✅ Actualizar accesorios cuando cambien desde el padre
    useEffect(() => {
        setAccesorios(accesoriosInitial);
    }, [accesoriosInitial]);

    // ✅ Cargar el IGV del API
    useEffect(() => {
        loadIgvRate();
    }, []);

    async function loadIgvRate() {
        try {
            const res = await fetch("/api/impuestos", { cache: "no-store" });
            if (res.ok) {
                const data = await res.json();
                const igv = data.find(
                    (imp) => imp.nombre.toLowerCase() === "igv"
                );
                if (igv) {
                    setIgvRate(parseFloat(igv.porcentaje) / 100);
                }
            }
        } catch (error) {
            console.error("Error cargando IGV:", error);
        }
    }

    // ✅ Función para eliminar SIN recargar la página
    async function handleEliminarAccesorio(id) {
        try {
            setSavingEdit(true);
            const res = await fetch(`/api/cotizaciones-accesorios/${id}`, {
                method: "DELETE",
            });

            if (!res.ok) {
                throw new Error("Error eliminando accesorio");
            }

            // ✅ Actualizar solo la lista local
            setAccesorios((prev) => prev.filter((acc) => acc.id !== id));

            toast.success("Accesorio eliminado");
            
            // ✅ Notificar al padre para sincronizar
            onAccesorioDeleted?.();
        } catch (error) {
            console.error(error);
            toast.error("Error: " + error.message);
        } finally {
            setSavingEdit(false);
        }
    }

    // ✅ Calcular totales
    const accesoriosTotales = calcularTotalesAccesorios(accesorios, igvRate);

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg">
                    Accesorios ({accesorios.length})
                </CardTitle>
                <Button
                    size="sm"
                    onClick={onAddClick}
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
                                                <th className="text-right p-3 font-semibold">
                                                    Total C/IGV
                                                </th>
                                                <th className="text-right p-3 font-semibold">Desc.</th>
                                                <th className="text-right p-3 font-semibold">
                                                    S/IGV
                                                </th>
                                                <th className="text-right p-3 font-semibold">
                                                    IGV ({(igvRate * 100).toFixed(0)}%)
                                                </th>
                                                <th className="text-right p-3 font-semibold">Total Final</th>
                                                <th className="text-center p-3 font-semibold">Acción</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {grupo.items.map((acc) => {
                                                const totalConIgv = parseFloat(acc.subtotal);
                                                const descuentoAplicado = parseFloat(acc.descuento_monto) || 0;
                                                const totalFinal = parseFloat(acc.total);

                                                const totalSinIgv = totalConIgv / (1 + igvRate);
                                                const igvMonto = totalConIgv - totalSinIgv;

                                                return (
                                                    <tr key={acc.id} className="border-b hover:bg-gray-50">
                                                        <td className="p-3 font-medium">{acc.detalle}</td>
                                                        <td className="p-3 text-gray-600">{acc.numero_parte}</td>
                                                        <td className="text-right p-3">{acc.cantidad}</td>
                                                        <td className="text-right p-3">
                                                            ${parseFloat(acc.precio_unitario).toFixed(2)}
                                                        </td>
                                                        <td className="text-right p-3 font-semibold">
                                                            ${totalConIgv.toFixed(2)}
                                                        </td>
                                                        <td className="text-right p-3">
                                                            {descuentoAplicado > 0 ? (
                                                                <p className="text-red-600 font-bold">
                                                                    -${descuentoAplicado.toFixed(2)}
                                                                </p>
                                                            ) : (
                                                                <span className="text-gray-400">-</span>
                                                            )}
                                                        </td>
                                                        <td className="text-right p-3">
                                                            ${totalSinIgv.toFixed(2)}
                                                        </td>
                                                        <td className="text-right p-3 text-green-600 font-bold">
                                                            ${igvMonto.toFixed(2)}
                                                        </td>
                                                        <td className="text-right p-3 font-bold text-blue-600">
                                                            ${totalFinal.toFixed(2)}
                                                        </td>
                                                        <td className="text-center p-3 flex gap-1 justify-center">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => onEditClick(acc)}
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
                                    <p className="text-gray-700">Total C/IGV:</p>
                                    <p className="font-bold text-lg">
                                        ${accesoriosTotales.totalConIgv.toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-700">Desc. Items:</p>
                                    <p className="font-bold text-red-600 text-lg">
                                        -${accesoriosTotales.descuentosItems.toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-700">S/IGV:</p>
                                    <p className="font-bold text-lg">
                                        ${accesoriosTotales.totalSinIgv.toFixed(2)}
                                    </p>
                                </div>
                                <div>
                                    <p className="text-gray-700">IGV ({(igvRate * 100).toFixed(0)}%):</p>
                                    <p className="font-bold text-green-600 text-lg">
                                        +${accesoriosTotales.igv.toFixed(2)}
                                    </p>
                                </div>
                            </div>

                            {/* Descuento General Accesorios */}
                            <div className="border-t pt-3 mt-3">
                                {editingDescuentoAcc ? (
                                    <div className="flex gap-2 items-center bg-white p-2 rounded">
                                        <span className="font-bold text-gray-900 flex-1">
                                            Descuento General:
                                        </span>
                                        <Input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={descuentoAccValue}
                                            onChange={(e) =>
                                                onDescuentoValueChange(parseFloat(e.target.value) || 0)
                                            }
                                            className="w-32 text-sm"
                                            disabled={savingEdit}
                                            placeholder="0.00"
                                        />
                                        <Button
                                            size="sm"
                                            onClick={onSaveDescuento}
                                            disabled={savingEdit}
                                            className="gap-1"
                                        >
                                            <Check size={14} />
                                            Guardar
                                        </Button>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                onEditingDescuentoChange(false);
                                                onDescuentoValueChange(descuentoTotalAcc);
                                            }}
                                            disabled={savingEdit}
                                        >
                                            <X size={14} />
                                        </Button>
                                    </div>
                                ) : (
                                    <div
                                        className="flex justify-between items-center cursor-pointer hover:bg-blue-100 p-2 rounded transition-colors"
                                        onClick={() => onEditingDescuentoChange(true)}
                                    >
                                        <span className="font-bold text-gray-900">
                                            Descuento General:
                                        </span>
                                        <span className="font-bold text-red-600 text-lg">
                                            -${descuentoTotalAcc.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Total con Descuento General */}
                            <div className="bg-white border-2 border-blue-400 rounded p-3 mt-3">
                                <div className="flex justify-between items-center">
                                    <span className="font-bold text-gray-900">
                                        Total Accesorios (c/desc. gral.):
                                    </span>
                                    <span className="font-bold text-blue-600 text-xl">
                                        ${(accesoriosTotales.totalFinal - descuentoTotalAcc).toFixed(2)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    <p className="text-center text-gray-500 py-8">
                        No hay accesorios en esta cotización
                    </p>
                )}
            </CardContent>
        </Card>
    );
}

// ✅ Función para agrupar por moneda
function agruparPorMoneda(items) {
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
}

// ✅ Función para calcular totales
function calcularTotalesAccesorios(accesorios, igvRate = 0.18) {
    const totalConIgv = accesorios.reduce(
        (sum, acc) => sum + (parseFloat(acc.subtotal) || 0),
        0
    );

    const descuentosItems = accesorios.reduce(
        (sum, acc) => sum + (parseFloat(acc.descuento_monto) || 0),
        0
    );

    const totalFinal = accesorios.reduce(
        (sum, acc) => sum + (parseFloat(acc.total) || 0),
        0
    );

    const totalSinIgv = totalConIgv / (1 + igvRate);
    const igv = totalConIgv - totalSinIgv;

    return {
        totalConIgv,
        descuentosItems,
        totalFinal,
        totalSinIgv,
        igv,
    };
}