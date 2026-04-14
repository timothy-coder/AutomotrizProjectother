"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";
import { Loader2, AlertCircle, History, Plus, Upload } from "lucide-react";
import { toast } from "sonner";
import HistorialCarrosDialog from "@/app/components/carros/HistorialCarrosDialog";
import HistorialCarrosImport from "@/app/components/carros/HistorialCarrosImport";

// ✅ Función helper para limpiar y validar IDs
function cleanAndValidateId(id) {
    const cleaned = parseInt(String(id).trim());
    return !isNaN(cleaned) && cleaned > 0 ? cleaned : null;
}

// ✅ Función para verificar si un valor es un número válido mayor a 0
function isValidPrice(price) {
    if (!price) return false;
    const parsed = parseFloat(String(price).trim());
    return !isNaN(parsed) && parsed > 0;
}

// ✅ Función para determinar el estado del carro
// PRIORIDAD: Entrega > Facturación > Nota de Pedido > Pendiente
function getCarroStatus(carro) {
    // ✅ PRIORIDAD 1: Si hay entrega
    if (carro.created_at_entrega) {
        return {
            label: "✓ Entregado",
            bgColor: "bg-green-100",
            borderColor: "border-green-300",
            textColor: "text-green-900",
            icon: "🚗",
            tooltip: `Entregado el ${new Date(carro.created_at_entrega).toLocaleDateString("es-PE")}`,
        };
    }
    // ✅ PRIORIDAD 2: Si hay facturación
    else if (carro.created_at_facturacion) {
        return {
            label: "📋 En Facturación",
            bgColor: "bg-blue-100",
            borderColor: "border-blue-300",
            textColor: "text-blue-900",
            icon: "📋",
            tooltip: `Facturado el ${new Date(carro.created_at_facturacion).toLocaleDateString("es-PE")}`,
        };
    }
    // ✅ PRIORIDAD 3: Si hay precio de venta (Nota de Pedido Creada)
    else if (isValidPrice(carro.precioventa)) {
        return {
            label: "📄 Nota de Pedido Creada",
            bgColor: "bg-purple-100",
            borderColor: "border-purple-300",
            textColor: "text-purple-900",
            icon: "📄",
            tooltip: `Precio de venta: S/ ${parseFloat(carro.precioventa).toLocaleString("es-PE", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            })}`,
        };
    }
    // ✅ PRIORIDAD 4: Pendiente
    else {
        return {
            label: "⏳ Pendiente",
            bgColor: "bg-yellow-100",
            borderColor: "border-yellow-300",
            textColor: "text-yellow-900",
            icon: "⏳",
            tooltip: "En espera de acciones",
        };
    }
}

export default function HistorialCarrosSheet({
    marcaId,
    modeloId,
    marcaNombre,
    modeloNombre,
}) {
    // ✅ Limpiar y validar IDs desde el inicio
    const cleanMarcaId = useMemo(() => cleanAndValidateId(marcaId), [marcaId]);
    const cleanModeloId = useMemo(() => cleanAndValidateId(modeloId), [modeloId]);

    const [open, setOpen] = useState(false);
    const [historial, setHistorial] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    async function loadHistorial() {
        try {
            setLoading(true);
            setError(null);

            console.log("🔍 Cargando historial con IDs limpios:", {
                cleanMarcaId,
                cleanModeloId,
            });

            if (!cleanMarcaId || !cleanModeloId) {
                throw new Error(
                    `IDs inválidos después de limpiar - marca: ${cleanMarcaId}, modelo: ${cleanModeloId}`
                );
            }

            const url = `/api/historial-carros?marca_id=${cleanMarcaId}&modelo_id=${cleanModeloId}&limite=100`;
            console.log("📡 URL final:", url);

            const res = await fetch(url, { cache: "no-store" });

            console.log("📊 Status:", res.status);

            if (!res.ok) {
                const errorData = await res.json();
                throw new Error(errorData.message || `Error ${res.status}`);
            }

            const data = await res.json();
            console.log("✅ Datos recibidos:", data);

            // ✅ Manejo flexible de respuesta
            let carros = [];
            if (Array.isArray(data)) {
                carros = data;
            } else if (data.data && Array.isArray(data.data)) {
                carros = data.data;
            } else if (data.carros && Array.isArray(data.carros)) {
                carros = data.carros;
            }

            console.log("🚗 Total carros:", carros.length);
            setHistorial(carros);

            if (carros.length === 0) {
                console.log(
                    `ℹ️ No hay carros registrados para ${marcaNombre} ${modeloNombre}`
                );
            }
        } catch (error) {
            console.error("❌ Error:", error);
            setError(error.message);
            toast.error("Error cargando historial: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    // ✅ EFECTO: Cargar datos cuando el sheet se abre
    useEffect(() => {
        if (open && cleanMarcaId && cleanModeloId) {
            loadHistorial();
        }
    }, [open, cleanMarcaId, cleanModeloId]);

    function handleOpenChange(newOpen) {
        setOpen(newOpen);
    }

    function handleSuccess() {
        loadHistorial();
    }

    // ✅ Si los IDs son inválidos, deshabilita el botón
    if (!cleanMarcaId || !cleanModeloId) {
        return (
            <button
                disabled
                className="flex gap-1 items-center justify-center hover:bg-slate-200 p-1 rounded transition-colors opacity-50 cursor-not-allowed"
                title="IDs inválidos"
            >
                <History size={16} className="text-slate-400" />
            </button>
        );
    }

    return (
        <TooltipProvider>
            <Sheet open={open} onOpenChange={handleOpenChange}>
                <button
                    onClick={() => setOpen(true)}
                    className="flex gap-1 items-center justify-center hover:bg-slate-200 p-1 rounded transition-colors"
                    title="Ver historial de carros"
                >
                    <History size={16} className="text-slate-600" />
                </button>

                <SheetContent side="right" className="w-full sm:w-[700px] overflow-y-auto p-0">
                    <SheetHeader className="space-y-4 p-6 border-b">
                        <SheetTitle className="flex items-center gap-2">
                            <History size={20} />
                            Historial de Carros
                        </SheetTitle>

                        <div className="flex gap-2">
                            <HistorialCarrosDialog
                                marcaId={cleanMarcaId}
                                modeloId={cleanModeloId}
                                marcaNombre={marcaNombre}
                                modeloNombre={modeloNombre}
                                onSuccess={handleSuccess}
                                trigger={
                                    <Button size="sm" className="bg-green-600 hover:bg-green-700 gap-2">
                                        <Plus size={16} />
                                        Agregar Carro
                                    </Button>
                                }
                            />


                        </div>
                    </SheetHeader>

                    <div className="space-y-4 p-6">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
                            </div>
                        ) : error ? (
                            <Card className="bg-red-50 border-red-200">
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <AlertCircle className="w-8 h-8 mx-auto text-red-400 mb-2" />
                                        <p className="text-red-600 text-sm font-medium">Error:</p>
                                        <p className="text-red-500 text-xs mt-1">{error}</p>
                                        <Button
                                            onClick={() => loadHistorial()}
                                            size="sm"
                                            className="mt-4 bg-red-600 hover:bg-red-700"
                                        >
                                            Reintentar
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : historial.length === 0 ? (
                            <Card className="bg-gray-50 border-gray-200">
                                <CardContent className="pt-6">
                                    <div className="text-center">
                                        <AlertCircle className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                                        <p className="text-gray-600 text-sm">No hay carros registrados</p>
                                        <p className="text-gray-500 text-xs mt-2">
                                            Usa "Agregar Carro" o "Importar" para crear registros
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="space-y-3">
                                <Card className="bg-blue-50 border-blue-200">
                                    <CardContent >
                                        <p className="text-sm font-semibold text-blue-900">
                                            📊 Total de carros: {historial.length}
                                        </p>
                                    </CardContent>
                                </Card>

                                {historial.map((carro) => {
                                    const status = getCarroStatus(carro);

                                    return (
                                        <Tooltip key={carro.vin}>
                                            <TooltipTrigger asChild>
                                                <Card
                                                    className={`${status.bgColor} ${status.borderColor} border-2 cursor-help transition-all hover:shadow-lg`}
                                                >
                                                    <CardContent className="">
                                                        <div className="grid grid-cols-1 gap-4">
                                                            {/* ENCABEZADO CON VIN Y ESTADO */}
                                                            <div className="flex items-start justify-between gap-2">
                                                                <div className="flex-1 flex items-start gap-2">
                                                                    <span className={`text-xs font-semibold ${status.textColor} w-20 flex-shrink-0`}>
                                                                        VIN
                                                                    </span>
                                                                    <code className={`text-sm font-mono ${status.bgColor} px-2 py-1 rounded flex-1 break-all`}>
                                                                        {carro.vin}
                                                                    </code>
                                                                </div>
                                                            </div>

                                                            {/* VERSIÓN */}
                                                            <div className="flex items-start gap-2">
                                                                <span className={`text-xs font-semibold ${status.textColor} w-20 flex-shrink-0`}>
                                                                    Versión
                                                                </span>
                                                                <span className={`text-sm font-medium ${status.textColor}`}>
                                                                    {carro.version_nombre}
                                                                </span>
                                                            </div>

                                                            {/* PRECIO COMPRA */}
                                                            {isValidPrice(carro.preciocompra) && (
                                                                <div className="flex items-start gap-2">
                                                                    <span className={`text-xs font-semibold ${status.textColor} w-20 flex-shrink-0`}>
                                                                        Compra
                                                                    </span>
                                                                    <span className={`text-sm font-semibold ${status.textColor}`}>
                                                                        $ {parseFloat(carro.preciocompra).toLocaleString(
                                                                            "es-PE",
                                                                            {
                                                                                minimumFractionDigits: 2,
                                                                                maximumFractionDigits: 2,
                                                                            }
                                                                        )}
                                                                    </span>
                                                                </div>
                                                            )}


                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </TooltipTrigger>
                                            <TooltipContent side="left" className="max-w-xs">
                                                <div className="space-y-2">
                                                    <p className="font-semibold">{status.label}</p>
                                                    {carro.created_at && (
                                                        <p>
                                                            <span className="font-semibold">Fecha de ingreso del Vehículo:</span>{" "}
                                                            {new Date(carro.created_at).toLocaleDateString(
                                                                "es-PE"
                                                            )}
                                                        </p>
                                                    )}

                                                    {carro.created_at_facturacion && (
                                                        <p>
                                                            <span className="font-semibold">Fecha de facturación:</span>{" "}
                                                            {new Date(
                                                                carro.created_at_facturacion
                                                            ).toLocaleDateString("es-PE")}
                                                        </p>
                                                    )}

                                                    {carro.created_at_entrega && (
                                                        <p>
                                                            <span className="font-semibold">Fecha de entrega:</span>{" "}
                                                            {new Date(
                                                                carro.created_at_entrega
                                                            ).toLocaleDateString("es-PE")}
                                                        </p>
                                                    )}
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </SheetContent>
            </Sheet>
        </TooltipProvider>
    );
}