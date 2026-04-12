// app/(dashboard)/cotizaciones/plantilla-pdf/page.jsx

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Upload, Plus, Trash2, Eye } from 'lucide-react';

export default function PlantillaPdfPage() {
    const [plantilla, setPlantilla] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);

    useEffect(() => {
        loadPlantilla();
    }, []);

    async function loadPlantilla() {
        try {
            setLoading(true);
            const res = await fetch('/api/plantilla-pdf', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                setPlantilla(data);
            } else {
                // Crear plantilla por defecto si no existe
                setPlantilla(getDefaultPlantilla());
            }
        } catch (error) {
            console.error(error);
            toast.error('Error cargando plantilla');
            setPlantilla(getDefaultPlantilla());
        } finally {
            setLoading(false);
        }
    }

    function getDefaultPlantilla() {
        return {
            encabezado: {
                titulo: 'COTIZACIÓN',
                logo_url: '',
                mostrar_logo: false,
                mostrar_numero: true,
                color_titulo: '#2ecc71',
            },
            cliente: {
                mostrar: true,
                titulo: 'CLIENTE:',
                posicion_y: 50,
            },
            vehiculo: {
                mostrar: true,
                titulo: 'VEHÍCULO:',
                posicion_y: 80,
            },
            especificaciones: {
                mostrar: true,
                titulo: 'ESPECIFICACIONES:',
            },
            accesorios: {
                mostrar: true,
                titulo: 'ACCESORIOS',
            },
            regalos: {
                mostrar: true,
                titulo: 'REGALOS INCLUIDOS',
            },
            resumen: {
                mostrar: true,
                titulo: 'RESUMEN:',
            },
            pie: {
                vigencia: '30 días',
                mostrar_firma: true,
                texto_firma: 'Autorizado por:',
            },
        };
    }

    async function handleSave() {
        try {
            setSaving(true);
            const res = await fetch('/api/plantilla-pdf', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(plantilla),
            });

            if (!res.ok) throw new Error('Error guardando plantilla');

            toast.success('Plantilla actualizada correctamente');
        } catch (error) {
            console.error(error);
            toast.error('Error: ' + error.message);
        } finally {
            setSaving(false);
        }
    }

    async function handleLogoUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await fetch('/api/upload-logo', {
                method: 'POST',
                body: formData,
            });

            if (!res.ok) throw new Error('Error subiendo logo');

            const { url } = await res.json();
            setPlantilla({
                ...plantilla,
                encabezado: {
                    ...plantilla.encabezado,
                    logo_url: url,
                    mostrar_logo: true,
                },
            });

            toast.success('Logo subido correctamente');
        } catch (error) {
            console.error(error);
            toast.error('Error subiendo logo');
        }
    }

    if (loading) {
        return <div className="flex justify-center items-center min-h-screen">Cargando...</div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
            <div className="max-w-7xl mx-auto space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Plantilla PDF</h1>
                        <p className="text-gray-600 mt-1">Personaliza el diseño de tus cotizaciones</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setPreviewOpen(!previewOpen)}
                            className="gap-2"
                        >
                            <Eye size={16} />
                            Vista Previa
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="gap-2"
                        >
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>
                </div>

                {plantilla && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Panel de edición */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* ENCABEZADO */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Encabezado</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                                            Título
                                        </label>
                                        <Input
                                            value={plantilla.encabezado.titulo}
                                            onChange={(e) =>
                                                setPlantilla({
                                                    ...plantilla,
                                                    encabezado: {
                                                        ...plantilla.encabezado,
                                                        titulo: e.target.value,
                                                    },
                                                })
                                            }
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                                            Color del Título
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={plantilla.encabezado.color_titulo}
                                                onChange={(e) =>
                                                    setPlantilla({
                                                        ...plantilla,
                                                        encabezado: {
                                                            ...plantilla.encabezado,
                                                            color_titulo: e.target.value,
                                                        },
                                                    })
                                                }
                                                className="w-16 h-10 border rounded cursor-pointer"
                                            />
                                            <Input
                                                value={plantilla.encabezado.color_titulo}
                                                onChange={(e) =>
                                                    setPlantilla({
                                                        ...plantilla,
                                                        encabezado: {
                                                            ...plantilla.encabezado,
                                                            color_titulo: e.target.value,
                                                        },
                                                    })
                                                }
                                                className="flex-1"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                                            Logo
                                        </label>
                                        {plantilla.encabezado.logo_url && (
                                            <div className="mb-3">
                                                <img
                                                    src={plantilla.encabezado.logo_url}
                                                    alt="Logo"
                                                    className="h-20 object-contain"
                                                />
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() =>
                                                        setPlantilla({
                                                            ...plantilla,
                                                            encabezado: {
                                                                ...plantilla.encabezado,
                                                                logo_url: '',
                                                                mostrar_logo: false,
                                                            },
                                                        })
                                                    }
                                                    className="text-red-600 mt-2"
                                                >
                                                    <Trash2 size={14} className="mr-1" />
                                                    Eliminar Logo
                                                </Button>
                                            </div>
                                        )}
                                        <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed rounded cursor-pointer hover:bg-gray-50">
                                            <Upload size={16} />
                                            <span>Subir Logo</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoUpload}
                                                className="hidden"
                                            />
                                        </label>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="mostrar_numero"
                                            checked={plantilla.encabezado.mostrar_numero}
                                            onChange={(e) =>
                                                setPlantilla({
                                                    ...plantilla,
                                                    encabezado: {
                                                        ...plantilla.encabezado,
                                                        mostrar_numero: e.target.checked,
                                                    },
                                                })
                                            }
                                        />
                                        <label htmlFor="mostrar_numero" className="text-sm font-semibold text-gray-700">
                                            Mostrar número de cotización
                                        </label>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* CLIENTE */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Cliente</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                                            Título de Sección
                                        </label>
                                        <Input
                                            value={plantilla.cliente.titulo}
                                            onChange={(e) =>
                                                setPlantilla({
                                                    ...plantilla,
                                                    cliente: {
                                                        ...plantilla.cliente,
                                                        titulo: e.target.value,
                                                    },
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="mostrar_cliente"
                                            checked={plantilla.cliente.mostrar}
                                            onChange={(e) =>
                                                setPlantilla({
                                                    ...plantilla,
                                                    cliente: {
                                                        ...plantilla.cliente,
                                                        mostrar: e.target.checked,
                                                    },
                                                })
                                            }
                                        />
                                        <label htmlFor="mostrar_cliente" className="text-sm font-semibold text-gray-700">
                                            Mostrar sección
                                        </label>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* VEHÍCULO */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Vehículo</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                                            Título de Sección
                                        </label>
                                        <Input
                                            value={plantilla.vehiculo.titulo}
                                            onChange={(e) =>
                                                setPlantilla({
                                                    ...plantilla,
                                                    vehiculo: {
                                                        ...plantilla.vehiculo,
                                                        titulo: e.target.value,
                                                    },
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="mostrar_vehiculo"
                                            checked={plantilla.vehiculo.mostrar}
                                            onChange={(e) =>
                                                setPlantilla({
                                                    ...plantilla,
                                                    vehiculo: {
                                                        ...plantilla.vehiculo,
                                                        mostrar: e.target.checked,
                                                    },
                                                })
                                            }
                                        />
                                        <label htmlFor="mostrar_vehiculo" className="text-sm font-semibold text-gray-700">
                                            Mostrar sección
                                        </label>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* ACCESORIOS */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Accesorios</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                                            Título de Sección
                                        </label>
                                        <Input
                                            value={plantilla.accesorios.titulo}
                                            onChange={(e) =>
                                                setPlantilla({
                                                    ...plantilla,
                                                    accesorios: {
                                                        ...plantilla.accesorios,
                                                        titulo: e.target.value,
                                                    },
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="mostrar_accesorios"
                                            checked={plantilla.accesorios.mostrar}
                                            onChange={(e) =>
                                                setPlantilla({
                                                    ...plantilla,
                                                    accesorios: {
                                                        ...plantilla.accesorios,
                                                        mostrar: e.target.checked,
                                                    },
                                                })
                                            }
                                        />
                                        <label htmlFor="mostrar_accesorios" className="text-sm font-semibold text-gray-700">
                                            Mostrar sección
                                        </label>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* REGALOS */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Regalos</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                                            Título de Sección
                                        </label>
                                        <Input
                                            value={plantilla.regalos.titulo}
                                            onChange={(e) =>
                                                setPlantilla({
                                                    ...plantilla,
                                                    regalos: {
                                                        ...plantilla.regalos,
                                                        titulo: e.target.value,
                                                    },
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="mostrar_regalos"
                                            checked={plantilla.regalos.mostrar}
                                            onChange={(e) =>
                                                setPlantilla({
                                                    ...plantilla,
                                                    regalos: {
                                                        ...plantilla.regalos,
                                                        mostrar: e.target.checked,
                                                    },
                                                })
                                            }
                                        />
                                        <label htmlFor="mostrar_regalos" className="text-sm font-semibold text-gray-700">
                                            Mostrar sección
                                        </label>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* PIE */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Pie de Página</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                                            Vigencia (ej: 30 días)
                                        </label>
                                        <Input
                                            value={plantilla.pie.vigencia}
                                            onChange={(e) =>
                                                setPlantilla({
                                                    ...plantilla,
                                                    pie: {
                                                        ...plantilla.pie,
                                                        vigencia: e.target.value,
                                                    },
                                                })
                                            }
                                        />
                                    </div>

                                    <div>
                                        <label className="text-sm font-semibold text-gray-700 block mb-2">
                                            Texto de Firma
                                        </label>
                                        <Input
                                            value={plantilla.pie.texto_firma}
                                            onChange={(e) =>
                                                setPlantilla({
                                                    ...plantilla,
                                                    pie: {
                                                        ...plantilla.pie,
                                                        texto_firma: e.target.value,
                                                    },
                                                })
                                            }
                                        />
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <input
                                            type="checkbox"
                                            id="mostrar_firma"
                                            checked={plantilla.pie.mostrar_firma}
                                            onChange={(e) =>
                                                setPlantilla({
                                                    ...plantilla,
                                                    pie: {
                                                        ...plantilla.pie,
                                                        mostrar_firma: e.target.checked,
                                                    },
                                                })
                                            }
                                        />
                                        <label htmlFor="mostrar_firma" className="text-sm font-semibold text-gray-700">
                                            Mostrar firma
                                        </label>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Panel de vista previa */}
                        {previewOpen && (
                            <div className="lg:col-span-1">
                                <Card className="sticky top-6">
                                    <CardHeader>
                                        <CardTitle className="text-lg">Vista Previa</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm space-y-4">
                                        <div className="bg-gray-100 p-4 rounded text-center">
                                            {plantilla.encabezado.logo_url && (
                                                <img
                                                    src={plantilla.encabezado.logo_url}
                                                    alt="Logo"
                                                    className="h-16 mx-auto mb-2 object-contain"
                                                />
                                            )}
                                            <h1
                                                style={{ color: plantilla.encabezado.color_titulo }}
                                                className="text-2xl font-bold"
                                            >
                                                {plantilla.encabezado.titulo}
                                            </h1>
                                            {plantilla.encabezado.mostrar_numero && (
                                                <p className="text-gray-600 text-xs">Q-000001</p>
                                            )}
                                        </div>

                                        {plantilla.cliente.mostrar && (
                                            <div className="space-y-1">
                                                <p className="font-bold text-gray-700">{plantilla.cliente.titulo}</p>
                                                <p className="text-gray-600 text-xs">Nombre del Cliente</p>
                                            </div>
                                        )}

                                        {plantilla.vehiculo.mostrar && (
                                            <div className="space-y-1">
                                                <p className="font-bold text-gray-700">{plantilla.vehiculo.titulo}</p>
                                                <p className="text-gray-600 text-xs">Marca Modelo Versión</p>
                                            </div>
                                        )}

                                        {plantilla.accesorios.mostrar && (
                                            <div className="space-y-1">
                                                <p className="font-bold text-gray-700">{plantilla.accesorios.titulo}</p>
                                                <p className="text-gray-600 text-xs">Tabla de accesorios...</p>
                                            </div>
                                        )}

                                        {plantilla.regalos.mostrar && (
                                            <div className="space-y-1">
                                                <p className="font-bold text-gray-700">{plantilla.regalos.titulo}</p>
                                                <p className="text-gray-600 text-xs">Tabla de regalos...</p>
                                            </div>
                                        )}

                                        <div className="border-t pt-2 space-y-1">
                                            <p className="font-bold text-gray-700">TOTAL: $0.00</p>
                                            <p className="text-gray-600 text-xs">Vigencia: {plantilla.pie.vigencia}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}