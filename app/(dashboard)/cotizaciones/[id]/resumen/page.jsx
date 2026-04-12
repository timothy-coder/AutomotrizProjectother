// app/(dashboard)/cotizaciones/[id]/resumen/page.jsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Loader, Download, Link as LinkIcon, Eye } from "lucide-react";
import { toast } from "sonner";

import { OportunidadInfoCard } from "@/app/components/cotizacionesventas/OportunidadInfoCard";
import { VehiculoInfoCard } from "@/app/components/cotizacionesventas/VehiculoInfoCard";
import { EspecificacionesCard } from "@/app/components/cotizacionesventas/EspecificacionesCard";
import { PrecioVehiculoCard } from "@/app/components/cotizacionesventas/PrecioVehiculoCard";
import { AccesoriosSection } from "@/app/components/cotizacionesventas/AccesoriosSection";
import { RegalosSection } from "@/app/components/cotizacionesventas/RegalosSection";
import { ResumenGeneralCard } from "@/app/components/cotizacionesventas/ResumenGeneralCard";

import { AgregarRegalosDialog } from "@/app/components/cotizacionesventas/dialogs/AgregarRegalosDialog";
import { EditarAccesorioDialog } from "@/app/components/cotizacionesventas/dialogs/EditarAccesorioDialog";
import { EditarRegaloDialog } from "@/app/components/cotizacionesventas/dialogs/EditarRegaloDialog";
import { EncabezadoPage } from "@/app/components/cotizacionesventas/EncabezadoPage";
import { AgregarAccesorioDialog } from "@/app/components/cotizacionesventas/dialogs/AgregarAccesorioDialog";

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

    // ✅ Estados para los diálogos
    const [openAccesoriosDialog, setOpenAccesoriosDialog] = useState(false);
    const [openRegalosDialog, setOpenRegalosDialog] = useState(false);
    const [editingAccesorio, setEditingAccesorio] = useState(null);
    const [editingRegalo, setEditingRegalo] = useState(null);
    const [openEditAccesorio, setOpenEditAccesorio] = useState(false);
    const [openEditRegalo, setOpenEditRegalo] = useState(false);

    // ✅ Estados para descuentos de accesorios
    const [editingDescuentoAcc, setEditingDescuentoAcc] = useState(false);
    const [descuentoAccValue, setDescuentoAccValue] = useState(0);

    // ✅ Estados para descuentos de regalos
    const [editingDescuentoReg, setEditingDescuentoReg] = useState(false);
    const [descuentoRegValue, setDescuentoRegValue] = useState(0);

    // ✅ Estados para descuento del vehículo
    const [editingDescuentoVehiculo, setEditingDescuentoVehiculo] = useState(false);
    const [descuentoVehiculoEnMonto, setDescuentoVehiculoEnMonto] = useState(false);
    const [descuentoVehiculoPorcentajeEdit, setDescuentoVehiculoPorcentajeEdit] = useState(0);
    const [descuentoVehiculoMontoEdit, setDescuentoVehiculoMontoEdit] = useState(0);

    const [loadingReserva, setLoadingReserva] = useState(false);
    const [igvRate, setIgvRate] = useState(0.18);

    // ✅ Estados para enlace público
    const [generatingLink, setGeneratingLink] = useState(false);
    const [showEnlaceDialog, setShowEnlaceDialog] = useState(false);
    const [enlaceUrl, setEnlaceUrl] = useState("");
    const [enlacePublicoToken, setEnlacePublicoToken] = useState(null);

    useEffect(() => {
        loadData();
        loadOptions();
    }, [cotizacionId]);

    async function loadData() {
        try {
            setLoading(true);

            // ✅ Primero obtener la cotización actual
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

                    // ✅ Obtener TODAS las cotizaciones de esta oportunidad
                    const resCotizaciones = await fetch(
                        `/api/cotizacionesagenda?oportunidad_id=${data.oportunidad_id}`,
                        { cache: "no-store" }
                    );
                    if (resCotizaciones.ok) {
                        const cotizaciones = await resCotizaciones.json();
                        // ✅ Buscar la cotización actual en el array
                        const cotizacionActual = cotizaciones.find(
                            (cot) => cot.id === parseInt(cotizacionId)
                        );
                        if (cotizacionActual && cotizacionActual.enlace_publico_token) {
                            setEnlacePublicoToken(cotizacionActual.enlace_publico_token);
                        }
                    }
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

            const resVersiones = await fetch("/api/versiones", {
                cache: "no-store",
            });
            if (resVersiones.ok) {
                const response = await resVersiones.json();
                setVersiones(Array.isArray(response.data) ? response.data : []);
            }

            // ✅ Cargar IGV
            const resImpuestos = await fetch("/api/impuestos", {
                cache: "no-store",
            });
            if (resImpuestos.ok) {
                const impuestos = await resImpuestos.json();
                if (Array.isArray(impuestos) && impuestos.length > 0) {
                    const igv = impuestos.find((imp) => imp.nombre === "IGV");
                    if (igv) {
                        setIgvRate(parseFloat(igv.porcentaje) / 100);
                    }
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Error cargando opciones");
        } finally {
            setLoadingOptions(false);
        }
    }

    // ✅ Función para recargar accesorios (sin recargar toda la página)
    async function reloadAccesorios() {
        try {
            const resAcc = await fetch(
                `/api/cotizaciones-accesorios/by-cotizacion/${cotizacionId}`,
                { cache: "no-store" }
            );
            if (resAcc.ok) {
                const data = await resAcc.json();
                setAccesorios(Array.isArray(data) ? data : []);
            }
        } catch (error) {
            console.error(error);
        }
    }

    // ✅ Función para recargar regalos (sin recargar toda la página)
    async function reloadRegalos() {
        try {
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
        }
    }

    // ✅ Funciones para agregar accesorios y regalos
    const handleAccesoriosAdded = async () => {
        await reloadAccesorios();
    };

    const handleRegalosAdded = async () => {
        await reloadRegalos();
    };

    // ✅ Generar enlace público y actualizar token
    async function handleGenerarEnlacePublico() {
        try {
            setGeneratingLink(true);

            const res = await fetch(
                `/api/cotizacionesagenda/${cotizacionId}/enlace-publico`,
                { cache: "no-store" }
            );

            if (!res.ok) {
                throw new Error("Error generando enlace");
            }

            const data = await res.json();

            if (!data.token) {
                throw new Error("No se recibió token en la respuesta");
            }

            const url = `${window.location.origin}/cotizacion-publica/${data.token}`;
            setEnlaceUrl(url);
            setEnlacePublicoToken(data.token); // ✅ Guardar el token nuevo
            setShowEnlaceDialog(true);

            // ✅ Copiar al portapapeles automáticamente
            if (navigator.clipboard && navigator.clipboard.writeText) {
                try {
                    await navigator.clipboard.writeText(url);
                    toast.success("Enlace copiado al portapapeles");
                } catch (err) {
                    console.warn("Error copiando al portapapeles:", err);
                }
            }
        } catch (error) {
            console.error(error);
            toast.error("Error: " + error.message);
        } finally {
            setGeneratingLink(false);
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

    async function handleSaveDescuentoVehiculo() {
        try {
            setSavingEdit(true);

            const payload = {
                descuento_vehículo: descuentoVehiculoEnMonto ? descuentoVehiculoMontoEdit : 0,
                descuento_vehículo_porcentaje: !descuentoVehiculoEnMonto ? descuentoVehiculoPorcentajeEdit : 0,
            };

            const res = await fetch(`/api/cotizacionesagenda/${cotizacionId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) throw new Error("Error guardando descuento");

            const data = await res.json();
            setCotizacion(data);
            setEditingDescuentoVehiculo(false);
            toast.success("Descuento del vehículo actualizado");
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

    function handleCancelEdit() {
        setEditingField(null);
        setEditValues({});
    }

    function handleStartEdit(field, value) {
        setEditingField(field);
        setEditValues({ [field]: value });
    }

    // Cálculos
    const precioActual = preciosRegion.find(
        (p) => p.modelo_id === cotizacion?.modelo_id && p.version_id === cotizacion?.version_id
    );

    const precioVehiculo = precioActual ? parseFloat(precioActual.precio_base) : 0;

    const descuentoVehiculo = cotizacion
        ? parseFloat(cotizacion.descuento_vehículo) > 0
            ? parseFloat(cotizacion.descuento_vehículo)
            : precioVehiculo * (parseFloat(cotizacion.descuento_vehículo_porcentaje) / 100 || 0)
        : 0;

    const precioVehiculoConDescuento = precioVehiculo - descuentoVehiculo;

    const accesoriosTotales = {
        subtotal: accesorios.reduce((sum, a) => sum + (parseFloat(a.subtotal) || 0), 0),
        descuentos: accesorios.reduce((sum, a) => sum + (parseFloat(a.descuento_monto) || 0), 0),
        totalSinIgv: 0,
        igv: 0,
        total: 0,
    };

    accesoriosTotales.total = accesoriosTotales.subtotal - accesoriosTotales.descuentos;

    const regalosTotal = {
        subtotal: regalos.reduce((sum, r) => sum + (parseFloat(r.subtotal) || 0), 0),
        descuentos: regalos.reduce((sum, r) => sum + (parseFloat(r.descuento_monto) || 0), 0),
        totalSinIgv: 0,
        igv: 0,
        total: 0,
    };

    regalosTotal.total = regalosTotal.subtotal - regalosTotal.descuentos;

    const descuentoTotalAcc = parseFloat(cotizacion?.descuento_total_accesorios) || 0;
    const descuentoTotalReg = parseFloat(cotizacion?.descuento_total_regalos) || 0;

    const granTotal =
        precioVehiculoConDescuento +
        accesoriosTotales.total +
        regalosTotal.total -
        descuentoTotalAcc -
        descuentoTotalReg;

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

    return (
        <div className="min-h-screen bg-gray-50 p-3 sm:p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
                <EncabezadoPage
                    cotizacion={cotizacion}
                    loadingReserva={loadingReserva}
                    onGoToOportunidad={() => router.push(`/oportunidades/${cotizacion.oportunidad_id}`)}
                    onGoToReserva={handleIrAReserva}
                />

                <OportunidadInfoCard oportunidad={oportunidad} />

                <VehiculoInfoCard
                    cotizacion={cotizacion}
                    marcas={marcas}
                    modelos={modelos}
                    versiones={versiones}
                    editingField={editingField}
                    editValues={editValues}
                    savingEdit={savingEdit}
                    loadingOptions={loadingOptions}
                    onStartEdit={handleStartEdit}
                    onCancelEdit={handleCancelEdit}
                    onSaveEdit={handleSaveEdit}
                    onEditValuesChange={setEditValues}
                />

                <EspecificacionesCard especificaciones={especificaciones} />

                <PrecioVehiculoCard
                    precioActual={precioActual}
                    precioVehiculo={precioVehiculo}
                    descuentoVehiculo={descuentoVehiculo}
                    precioVehiculoConDescuento={precioVehiculoConDescuento}
                    cotizacion={cotizacion}
                    editingDescuentoVehiculo={editingDescuentoVehiculo}
                    descuentoVehiculoEnMonto={descuentoVehiculoEnMonto}
                    descuentoVehiculoPorcentajeEdit={descuentoVehiculoPorcentajeEdit}
                    descuentoVehiculoMontoEdit={descuentoVehiculoMontoEdit}
                    savingEdit={savingEdit}
                    onEditingChange={setEditingDescuentoVehiculo}
                    onModoChange={setDescuentoVehiculoEnMonto}
                    onPorcentajeChange={setDescuentoVehiculoPorcentajeEdit}
                    onMontoChange={setDescuentoVehiculoMontoEdit}
                    onSave={handleSaveDescuentoVehiculo}
                />

                <AccesoriosSection
                    accesorios={accesorios}
                    savingEdit={savingEdit}
                    onAddClick={() => setOpenAccesoriosDialog(true)}
                    onEditClick={(accesorio) => {
                        setEditingAccesorio(accesorio);
                        setOpenEditAccesorio(true);
                    }}
                    onEditingDescuentoChange={setEditingDescuentoAcc}
                    onDescuentoValueChange={setDescuentoAccValue}
                    onSaveDescuento={handleSaveDescuentoAcc}
                    editingDescuentoAcc={editingDescuentoAcc}
                    descuentoAccValue={descuentoAccValue}
                    descuentoTotalAcc={descuentoTotalAcc}
                    onAccesorioDeleted={reloadAccesorios}
                />

                <RegalosSection
                    regalos={regalos}
                    savingEdit={savingEdit}
                    onAddClick={() => setOpenRegalosDialog(true)}
                    onEditClick={(regalo) => {
                        setEditingRegalo(regalo);
                        setOpenEditRegalo(true);
                    }}
                    onEditingDescuentoChange={setEditingDescuentoReg}
                    onDescuentoValueChange={setDescuentoRegValue}
                    onSaveDescuento={handleSaveDescuentoReg}
                    editingDescuentoReg={editingDescuentoReg}
                    descuentoRegValue={descuentoRegValue}
                    descuentoTotalReg={descuentoTotalReg}
                    onRegaloDeleted={reloadRegalos}
                />

                <ResumenGeneralCard
                    accesoriosTotales={accesoriosTotales}
                    regalosTotal={regalosTotal}
                    precioVehiculo={precioVehiculo}
                    descuentoVehiculo={descuentoVehiculo}
                    descuentoTotalAcc={descuentoTotalAcc}
                    descuentoTotalReg={descuentoTotalReg}
                    granTotal={granTotal}
                    igvRate={igvRate}
                />

                {/* ✅ ACCIONES */}
                <div className="flex gap-4 justify-center flex-wrap">
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

                    {/* ✅ BOTÓN PARA ENLACE PÚBLICO */}
                    {enlacePublicoToken ? (
                        <Button
                            onClick={() => {
                                const url = `${window.location.origin}/cotizacion-publica/${enlacePublicoToken}`;
                                window.open(url, "_blank", "noopener,noreferrer");
                            }}
                            className="gap-2 bg-green-600 hover:bg-green-700"
                        >
                            <Eye size={16} />
                            Ver Enlace Público
                        </Button>
                    ) : (
                        <Button
                            onClick={handleGenerarEnlacePublico}
                            disabled={generatingLink}
                            className="gap-2 bg-blue-600 hover:bg-blue-700"
                        >
                            <LinkIcon size={16} />
                            {generatingLink ? "Generando..." : "Generar Enlace Público"}
                        </Button>
                    )}
                </div>

                {/* ✅ DIÁLOGO DEL ENLACE PÚBLICO */}
                {showEnlaceDialog && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                        <div className="bg-white rounded-lg p-6 max-w-md w-full">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">
                                ✓ Enlace Público Generado
                            </h2>
                            <p className="text-gray-600 mb-4">
                                Comparte este enlace con tu cliente para que vea la cotización:
                            </p>
                            <div className="bg-gray-100 p-3 rounded mb-4 break-all text-sm text-blue-600 font-mono">
                                {enlaceUrl}
                            </div>
                            <div className="flex flex-col gap-2">
                                <Button
                                    onClick={() => {
                                        navigator.clipboard.writeText(enlaceUrl);
                                        toast.success("Enlace copiado al portapapeles");
                                    }}
                                    className="w-full bg-blue-600 hover:bg-blue-700"
                                >
                                    📋 Copiar Enlace
                                </Button>
                                <Button
                                    onClick={() => {
                                        window.open(enlaceUrl, "_blank", "noopener,noreferrer");
                                    }}
                                    variant="outline"
                                    className="w-full"
                                >
                                    🔗 Abrir en Nueva Pestaña
                                </Button>
                                <Button
                                    onClick={() => setShowEnlaceDialog(false)}
                                    variant="ghost"
                                    className="w-full"
                                >
                                    Cerrar
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ✅ DIÁLOGOS */}
            <AgregarAccesorioDialog
                open={openAccesoriosDialog}
                onOpenChange={setOpenAccesoriosDialog}
                cotizacion={cotizacion}
                marcaId={cotizacion?.marca_id}
                modeloId={cotizacion?.modelo_id}
                onAccesorioAdded={handleAccesoriosAdded}
                igvRate={igvRate}
            />

            <AgregarRegalosDialog
                open={openRegalosDialog}
                onOpenChange={setOpenRegalosDialog}
                cotizacion={cotizacion}
                onRegaloAdded={handleRegalosAdded}
                igvRate={igvRate}
            />

            <EditarAccesorioDialog
                open={openEditAccesorio}
                onOpenChange={setOpenEditAccesorio}
                accesorio={editingAccesorio}
                onAccesorioUpdated={reloadAccesorios}
                igvRate={igvRate}
            />

            <EditarRegaloDialog
                open={openEditRegalo}
                onOpenChange={setOpenEditRegalo}
                regalo={editingRegalo}
                onRegaloUpdated={reloadRegalos}
                igvRate={igvRate}
            />
        </div>
    );
}