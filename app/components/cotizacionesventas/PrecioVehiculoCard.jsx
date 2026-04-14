// app/(dashboard)/cotizaciones/[id]/resumen/components/PrecioVehiculoCard.jsx

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
    DollarSign,
    Edit2,
    Check,
    X,
} from "lucide-react";
import { toast } from "sonner";

export function PrecioVehiculoCard({
    precioActual,
    precioVehiculo,
    descuentoVehiculo,
    precioVehiculoConDescuento,
    cotizacion,
    editingDescuentoVehiculo,
    descuentoVehiculoEnMonto,
    descuentoVehiculoPorcentajeEdit,
    descuentoVehiculoMontoEdit,
    savingEdit,
    onEditingChange,
    onModoChange,
    onPorcentajeChange,
    onMontoChange,
    onSave,
}) {
    if (!precioActual) return null;

    return (
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
                            className={`text-xs sm:text-base font-bold mt-1 ${
                                precioActual.en_stock ? "text-green-600" : "text-red-600"
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

                {/* ✅ DESCUENTO DEL VEHÍCULO - EDICIÓN INLINE */}
                <div className="mt-4 pt-4 border-t">
                    {!editingDescuentoVehiculo ? (
                        <>
                            <Button
                                onClick={() => {
                                    onEditingChange(true);
                                    onModoChange(
                                        parseFloat(cotizacion.descuento_vehículo) > 0
                                    );
                                    onPorcentajeChange(
                                        parseFloat(cotizacion.descuento_vehículo_porcentaje) || 0
                                    );
                                    onMontoChange(
                                        parseFloat(cotizacion.descuento_vehículo) || 0
                                    );
                                }}
                                variant="outline"
                                className="gap-2 text-xs sm:text-sm"
                                disabled={savingEdit}
                            >
                                <Edit2 size={14} />
                                {descuentoVehiculo > 0 ? "Editar descuento" : "Agregar descuento"}
                            </Button>

                            {descuentoVehiculo > 0 && (
                                <div className="mt-3 p-3 bg-orange-100 rounded-lg border border-orange-300">
                                    <p className="text-xs text-orange-700 font-semibold">
                                        Descuento aplicado:
                                    </p>
                                    <p className="text-sm font-bold text-orange-900 mt-1">
                                        -${descuentoVehiculo.toFixed(2)}
                                        {cotizacion.descuento_vehículo_porcentaje > 0 &&
                                            ` (${cotizacion.descuento_vehículo_porcentaje}%)`}
                                    </p>
                                </div>
                            )}

                            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-xs text-blue-700 font-semibold">
                                    Precio final del vehículo:
                                </p>
                                <p className="text-lg font-bold text-blue-900 mt-1">
                                    ${precioVehiculoConDescuento.toFixed(2)}
                                </p>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4 bg-orange-50 p-4 rounded-lg border border-orange-200">
                            {/* Modo Edición */}
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-semibold text-gray-700">
                                        Tipo de Descuento
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        {!descuentoVehiculoEnMonto ? "Porcentaje (%)" : "Monto ($)"}
                                    </p>
                                </div>
                                <Select
                                    value={descuentoVehiculoEnMonto ? "monto" : "porcentaje"}
                                    onValueChange={(value) => {
                                        onModoChange(value === "monto");
                                    }}
                                    disabled={savingEdit}
                                >
                                    <SelectTrigger className="w-40">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="porcentaje">Por Porcentaje (%)</SelectItem>
                                        <SelectItem value="monto">Por Monto ($)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Campo Porcentaje */}
                            {!descuentoVehiculoEnMonto && (
                                <div>
                                    <label className="text-sm font-semibold text-gray-700 block mb-2">
                                        Descuento en Porcentaje (%)
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={descuentoVehiculoPorcentajeEdit}
                                        onChange={(e) =>
                                            onPorcentajeChange(parseFloat(e.target.value) || 0)
                                        }
                                        disabled={savingEdit}
                                        className="text-sm"
                                    />
                                </div>
                            )}

                            {/* Campo Monto */}
                            {descuentoVehiculoEnMonto && (
                                <div>
                                    <label className="text-sm font-semibold text-gray-700 block mb-2">
                                        Descuento en Monto ($)
                                    </label>
                                    <Input
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        placeholder="0.00"
                                        value={descuentoVehiculoMontoEdit}
                                        onChange={(e) =>
                                            onMontoChange(parseFloat(e.target.value) || 0)
                                        }
                                        disabled={savingEdit}
                                        className="text-sm"
                                    />
                                </div>
                            )}

                            {/* Resumen */}
                            <div className="bg-white p-3 rounded-lg border border-orange-200">
                                <p className="text-sm font-semibold text-gray-900 mb-2">Resumen:</p>
                                <p className="text-xs text-gray-700">
                                    {!descuentoVehiculoEnMonto
                                        ? `Descuento: ${descuentoVehiculoPorcentajeEdit}%`
                                        : `Descuento: $${descuentoVehiculoMontoEdit.toFixed(2)}`}
                                </p>
                            </div>

                            {/* Botones */}
                            <div className="flex gap-2">
                                <Button
                                    size="sm"
                                    onClick={onSave}
                                    disabled={savingEdit}
                                    className="flex-1"
                                >
                                    <Check size={14} className="mr-1" />
                                    {savingEdit ? "Guardando..." : "Guardar"}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        onEditingChange(false);
                                    }}
                                    disabled={savingEdit}
                                    className="flex-1"
                                >
                                    <X size={14} className="mr-1" />
                                    Cancelar
                                </Button>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}