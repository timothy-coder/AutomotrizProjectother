// app/(dashboard)/cotizaciones/[id]/resumen/components/ResumenGeneralCard.jsx

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ResumenGeneralCard({
    accesoriosTotales,
    regalosTotal,
    precioVehiculo,
    descuentoVehiculo,
    descuentoTotalAcc,
    descuentoTotalReg,
    igvRate = 0.18,
}) {
    // ✅ Precio del vehículo SIN IGV (necesitamos restar el IGV)
    const precioVehiculoSinIgv = precioVehiculo / (1 + igvRate);
    const igvVehiculo = precioVehiculo - precioVehiculoSinIgv;
    
    // ✅ Precio vehículo con descuento SIN IGV
    const precioVehiculoConDescuentoSinIgv = precioVehiculoSinIgv - (descuentoVehiculo / (1 + igvRate));
    const precioVehiculoConDescuentoConIgv = precioVehiculoConDescuentoSinIgv * (1 + igvRate);

    // ✅ Accesorios YA incluyen los descuentos en sus totales
    const accesoriosTotalSinIgv = parseFloat(accesoriosTotales.totalSinIgv || 0);
    const accesoriosTotalConIgv = parseFloat(accesoriosTotales.totalConIgv || accesoriosTotales.total || 0);
    const accesoriosTotalConDescuentoIndividual = accesoriosTotalConIgv - (descuentoTotalAcc || 0);
    const accesoriosIgv = accesoriosTotalConIgv - accesoriosTotalSinIgv;

    // ✅ Regalos YA incluyen los descuentos en sus totales
    const regalosSlnIgv = parseFloat(regalosTotal.totalSinIgv || 0);
    const regalosConIgv = parseFloat(regalosTotal.totalConIgv || regalosTotal.total || 0);
    const regalosConDescuentoIndividual = regalosConIgv - (descuentoTotalReg || 0);
    const regalosIgv = regalosConIgv - regalosSlnIgv;

    // ✅ Subtotal SIN IGV (vehículo + accesorios + regalos CON DESCUENTOS INDIVIDUALES)
    const subtotalSinIgv = 
        precioVehiculoConDescuentoSinIgv + 
        (accesoriosTotalConDescuentoIndividual / (1 + igvRate)) +
        (regalosConDescuentoIndividual / (1 + igvRate));

    // ✅ IGV total del subtotal
    const igvSubtotal = subtotalSinIgv * igvRate;

    // ✅ Gran total CON IGV
    const granTotal = subtotalSinIgv + igvSubtotal;

    // ✅ Totales para visualización (con IGV y descuentos aplicados)
    const subtotalConIgv = 
        precioVehiculoConDescuentoConIgv + 
        accesoriosTotalConDescuentoIndividual + 
        regalosConDescuentoIndividual;

    return (
        <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
            <CardHeader>
                <CardTitle className="text-xl text-green-900">
                    Resumen General
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {/* Fila 1: Detalles principales */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-white p-4 rounded-lg border border-green-200">
                            <p className="text-xs text-gray-600 font-semibold">Precio Vehículo</p>
                            <p className="text-sm text-gray-500">S/IGV: ${precioVehiculoSinIgv.toFixed(2)}</p>
                            <p className="text-lg font-bold text-gray-900">
                                ${precioVehiculo.toFixed(2)}
                            </p>
                        </div>

                        {descuentoVehiculo > 0 && (
                            <div className="bg-white p-4 rounded-lg border border-green-200">
                                <p className="text-xs text-gray-600 font-semibold">Desc. Vehículo</p>
                                <p className="text-lg font-bold text-red-600">
                                    -${descuentoVehiculo.toFixed(2)}
                                </p>
                            </div>
                        )}

                        <div className="bg-white p-4 rounded-lg border border-green-200">
                            <p className="text-xs text-gray-600 font-semibold">Accesorios (c/IGV)</p>
                            <p className="text-sm text-gray-500">c/desc: ${accesoriosTotalConDescuentoIndividual.toFixed(2)}</p>
                            <p className="text-lg font-bold text-gray-900">
                                ${accesoriosTotalConIgv.toFixed(2)}
                            </p>
                        </div>

                        <div className="bg-white p-4 rounded-lg border border-green-200">
                            <p className="text-xs text-gray-600 font-semibold">Regalos (c/IGV)</p>
                            <p className="text-sm text-gray-500">c/desc: ${regalosConDescuentoIndividual.toFixed(2)}</p>
                            <p className="text-lg font-bold text-gray-900">
                                ${regalosConIgv.toFixed(2)}
                            </p>
                        </div>
                    </div>

                    {/* Fila 2: Descuentos si existen */}
                    {(descuentoTotalAcc > 0 || descuentoTotalReg > 0) && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {descuentoTotalAcc > 0 && (
                                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                    <p className="text-xs text-gray-600 font-semibold">Desc. Accesorios</p>
                                    <p className="text-lg font-bold text-red-600">
                                        -${descuentoTotalAcc.toFixed(2)}
                                    </p>
                                </div>
                            )}
                            {descuentoTotalReg > 0 && (
                                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                    <p className="text-xs text-gray-600 font-semibold">Desc. Regalos</p>
                                    <p className="text-lg font-bold text-red-600">
                                        -${descuentoTotalReg.toFixed(2)}
                                    </p>
                                </div>
                            )}
                            <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                                <p className="text-xs text-gray-600 font-semibold">Total Descuentos</p>
                                <p className="text-lg font-bold text-red-600">
                                    -${(descuentoTotalAcc + descuentoTotalReg).toFixed(2)}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Fila 3: Cálculo detallado */}
                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                                <p className="text-gray-600">Subtotal S/IGV:</p>
                                <p className="font-bold text-gray-900">
                                    ${subtotalSinIgv.toFixed(2)}
                                </p>
                            </div>
                            <div>
                                <p className="text-gray-600">IGV Total ({(igvRate * 100).toFixed(0)}%):</p>
                                <p className="font-bold text-green-600">
                                    +${igvSubtotal.toFixed(2)}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Gran Total */}
                    <div className="bg-white border-2 border-green-400 rounded-lg p-6 mt-4">
                        <p className="text-sm text-gray-600 font-bold">GRAN TOTAL (CON IGV Y DESC.)</p>
                        <p className="text-5xl font-bold text-green-600 mt-2">
                            ${granTotal.toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-500 mt-3 space-y-1">
                            <span className="block">✓ Incluye vehículo, accesorios y regalos</span>
                            <span className="block">✓ Con todos los descuentos aplicados</span>
                            <span className="block">✓ IGV incluido en el total</span>
                        </p>
                    </div>

                    {/* Desglose opcional para referencia */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-xs">
                        <p className="font-bold text-blue-900 mb-2">Desglose Detallado:</p>
                        <div className="grid grid-cols-2 gap-2 text-blue-800">
                            <div>
                                <p className="text-gray-600">Vehículo S/IGV:</p>
                                <p className="font-semibold">${precioVehiculoConDescuentoSinIgv.toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Vehículo IGV:</p>
                                <p className="font-semibold text-green-600">${(precioVehiculo - precioVehiculoConDescuentoConIgv).toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Accesorios S/IGV:</p>
                                <p className="font-semibold">${(accesoriosTotalConDescuentoIndividual / (1 + igvRate)).toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Accesorios IGV:</p>
                                <p className="font-semibold text-green-600">${(accesoriosTotalConDescuentoIndividual - (accesoriosTotalConDescuentoIndividual / (1 + igvRate))).toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Regalos S/IGV:</p>
                                <p className="font-semibold">${(regalosConDescuentoIndividual / (1 + igvRate)).toFixed(2)}</p>
                            </div>
                            <div>
                                <p className="text-gray-600">Regalos IGV:</p>
                                <p className="font-semibold text-green-600">${(regalosConDescuentoIndividual - (regalosConDescuentoIndividual / (1 + igvRate))).toFixed(2)}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}