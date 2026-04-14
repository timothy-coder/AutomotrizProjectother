// app/(dashboard)/cotizaciones/plantilla-pdf-designer/page.jsx

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Upload, Plus, Trash2, Save, RotateCcw, Edit2 } from 'lucide-react';

export default function PlantillaDesignerPage() {
    const [plantilla, setPlantilla] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [selectedElement, setSelectedElement] = useState(null);
    const [zoomLevel, setZoomLevel] = useState(100);

    useEffect(() => {
        loadPlantilla();
    }, []);

    async function loadPlantilla() {
        try {
            setLoading(true);
            const res = await fetch('/api/plantilla-pdf', { cache: 'no-store' });
            if (res.ok) {
                const data = await res.json();
                // ✅ Si no tiene elementos, usar plantilla por defecto
                if (!data.elementos) {
                    setPlantilla(getDefaultPlantilla());
                } else {
                    setPlantilla(data);
                }
            } else {
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
            elementos: [
                {
                    id: 'titulo',
                    tipo: 'titulo',
                    titulo: 'COTIZACIÓN',
                    x: 50,
                    y: 20,
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: '#2ecc71',
                    mostrar: true,
                },
                {
                    id: 'numero',
                    tipo: 'numero',
                    titulo: 'Q-000001',
                    x: 50,
                    y: 35,
                    fontSize: 12,
                    fontWeight: 'normal',
                    color: '#000000',
                    mostrar: true,
                },
                {
                    id: 'logo',
                    tipo: 'logo',
                    titulo: 'LOGO',
                    x: 15,
                    y: 20,
                    width: 30,
                    height: 15,
                    color: '#cccccc',
                    mostrar: false,
                    logo_url: '',
                },
                {
                    id: 'cliente_titulo',
                    tipo: 'seccion',
                    titulo: 'CLIENTE:',
                    x: 15,
                    y: 55,
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: '#000000',
                    mostrar: true,
                },
                {
                    id: 'vehiculo_titulo',
                    tipo: 'seccion',
                    titulo: 'VEHÍCULO:',
                    x: 15,
                    y: 85,
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: '#000000',
                    mostrar: true,
                },
                {
                    id: 'accesorios_titulo',
                    tipo: 'seccion',
                    titulo: 'ACCESORIOS',
                    x: 15,
                    y: 130,
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: '#000000',
                    mostrar: true,
                },
                {
                    id: 'regalos_titulo',
                    tipo: 'seccion',
                    titulo: 'REGALOS INCLUIDOS',
                    x: 15,
                    y: 160,
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: '#000000',
                    mostrar: true,
                },
                {
                    id: 'resumen_titulo',
                    tipo: 'seccion',
                    titulo: 'RESUMEN:',
                    x: 15,
                    y: 190,
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: '#000000',
                    mostrar: true,
                },
                {
                    id: 'total_titulo',
                    tipo: 'total',
                    titulo: 'TOTAL:',
                    x: 120,
                    y: 240,
                    fontSize: 12,
                    fontWeight: 'bold',
                    color: '#2ecc71',
                    mostrar: true,
                },
                {
                    id: 'vigencia',
                    tipo: 'pie',
                    titulo: 'Vigencia: 30 días',
                    x: 15,
                    y: 270,
                    fontSize: 9,
                    fontWeight: 'normal',
                    color: '#000000',
                    mostrar: true,
                },
                {
                    id: 'firma',
                    tipo: 'firma',
                    titulo: 'Autorizado por:',
                    x: 15,
                    y: 280,
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: '#000000',
                    mostrar: true,
                },
            ],
            encabezado: {
                color_fondo: '#ffffff',
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

            toast.success('Plantilla guardada correctamente');
        } catch (error) {
            console.error(error);
            toast.error('Error: ' + error.message);
        } finally {
            setSaving(false);
        }
    }

    function handleElementDrag(elementId, newX, newY) {
        setPlantilla({
            ...plantilla,
            elementos: plantilla.elementos.map((el) =>
                el.id === elementId ? { ...el, x: newX, y: newY } : el
            ),
        });
    }

    function handleElementUpdate(elementId, updates) {
        setPlantilla({
            ...plantilla,
            elementos: plantilla.elementos.map((el) =>
                el.id === elementId ? { ...el, ...updates } : el
            ),
        });
    }

    function handleReset() {
        if (confirm('¿Restaurar la plantilla por defecto?')) {
            setPlantilla(getDefaultPlantilla());
            toast.success('Plantilla restaurada');
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p>Cargando...</p>
                </div>
            </div>
        );
    }

    if (!plantilla) {
        return (
            <div className="flex justify-center items-center min-h-screen">
                <p className="text-red-600">Error cargando la plantilla</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 p-4 lg:p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Diseñador de Plantilla PDF</h1>
                        <p className="text-gray-600 mt-1">Arrastra y personaliza cada elemento</p>
                    </div>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            onClick={handleReset}
                            className="gap-2"
                        >
                            <RotateCcw size={16} />
                            Restaurar
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={saving}
                            className="gap-2"
                        >
                            <Save size={16} />
                            {saving ? 'Guardando...' : 'Guardar'}
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Canvas del PDF */}
                    <div className="lg:col-span-3">
                        <Card className="bg-white">
                            <CardHeader>
                                <div className="flex justify-between items-center">
                                    <CardTitle>Vista Previa del PDF (A4)</CardTitle>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
                                        >
                                            −
                                        </Button>
                                        <span className="w-12 text-center text-sm font-medium">
                                            {zoomLevel}%
                                        </span>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setZoomLevel(Math.min(200, zoomLevel + 10))}
                                        >
                                            +
                                        </Button>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div
                                    className="overflow-auto rounded border-2 border-gray-300 bg-white"
                                    style={{
                                        width: '100%',
                                        maxWidth: '600px',
                                        height: '800px',
                                    }}
                                >
                                    <div
                                        className="relative bg-white"
                                        style={{
                                            width: '600px',
                                            height: '800px',
                                            transform: `scale(${zoomLevel / 100})`,
                                            transformOrigin: 'top left',
                                        }}
                                    >
                                        {/* Elementos arrastables */}
                                        {plantilla.elementos && plantilla.elementos.map((element) =>
                                            element.mostrar ? (
                                                <DraggableElement
                                                    key={element.id}
                                                    element={element}
                                                    selected={selectedElement?.id === element.id}
                                                    onSelect={() => setSelectedElement(element)}
                                                    onDrag={(x, y) => handleElementDrag(element.id, x, y)}
                                                />
                                            ) : null
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Panel de propiedades */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Selector de elementos */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-sm">Elementos</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-2 max-h-96 overflow-y-auto">
                                {plantilla.elementos && plantilla.elementos.map((element) => (
                                    <button
                                        key={element.id}
                                        onClick={() => setSelectedElement(element)}
                                        className={`w-full p-2 text-left text-sm rounded transition-colors ${
                                            selectedElement?.id === element.id
                                                ? 'bg-blue-100 border-2 border-blue-500'
                                                : 'bg-gray-100 hover:bg-gray-200'
                                        }`}
                                    >
                                        <div className="font-semibold truncate">{element.titulo}</div>
                                        <div className="text-xs text-gray-600">({element.tipo})</div>
                                    </button>
                                ))}
                            </CardContent>
                        </Card>

                        {/* Propiedades del elemento seleccionado */}
                        {selectedElement && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">Propiedades</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4 max-h-96 overflow-y-auto">
                                    {/* Texto */}
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700 block mb-2">
                                            Texto
                                        </label>
                                        <Input
                                            value={selectedElement.titulo}
                                            onChange={(e) => {
                                                handleElementUpdate(selectedElement.id, {
                                                    titulo: e.target.value,
                                                });
                                                setSelectedElement({ ...selectedElement, titulo: e.target.value });
                                            }}
                                            className="text-sm"
                                        />
                                    </div>

                                    {/* Posición X */}
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700 block mb-2">
                                            Posición X: {selectedElement.x.toFixed(1)}mm
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="190"
                                            step="0.5"
                                            value={selectedElement.x}
                                            onChange={(e) => {
                                                const newX = parseFloat(e.target.value);
                                                handleElementUpdate(selectedElement.id, { x: newX });
                                                setSelectedElement({ ...selectedElement, x: newX });
                                            }}
                                            className="w-full"
                                        />
                                    </div>

                                    {/* Posición Y */}
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700 block mb-2">
                                            Posición Y: {selectedElement.y.toFixed(1)}mm
                                        </label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="280"
                                            step="0.5"
                                            value={selectedElement.y}
                                            onChange={(e) => {
                                                const newY = parseFloat(e.target.value);
                                                handleElementUpdate(selectedElement.id, { y: newY });
                                                setSelectedElement({ ...selectedElement, y: newY });
                                            }}
                                            className="w-full"
                                        />
                                    </div>

                                    {/* Tamaño de fuente */}
                                    {selectedElement.fontSize && (
                                        <div>
                                            <label className="text-xs font-semibold text-gray-700 block mb-2">
                                                Tamaño de Fuente: {selectedElement.fontSize}pt
                                            </label>
                                            <input
                                                type="range"
                                                min="8"
                                                max="32"
                                                step="1"
                                                value={selectedElement.fontSize}
                                                onChange={(e) => {
                                                    const newSize = parseInt(e.target.value);
                                                    handleElementUpdate(selectedElement.id, { fontSize: newSize });
                                                    setSelectedElement({ ...selectedElement, fontSize: newSize });
                                                }}
                                                className="w-full"
                                            />
                                        </div>
                                    )}

                                    {/* Color */}
                                    <div>
                                        <label className="text-xs font-semibold text-gray-700 block mb-2">
                                            Color
                                        </label>
                                        <div className="flex gap-2">
                                            <input
                                                type="color"
                                                value={selectedElement.color}
                                                onChange={(e) => {
                                                    handleElementUpdate(selectedElement.id, { color: e.target.value });
                                                    setSelectedElement({ ...selectedElement, color: e.target.value });
                                                }}
                                                className="w-12 h-10 border rounded cursor-pointer"
                                            />
                                            <Input
                                                value={selectedElement.color}
                                                onChange={(e) => {
                                                    handleElementUpdate(selectedElement.id, { color: e.target.value });
                                                    setSelectedElement({ ...selectedElement, color: e.target.value });
                                                }}
                                                className="flex-1 text-sm"
                                            />
                                        </div>
                                    </div>

                                    {/* Peso de fuente */}
                                    {selectedElement.fontWeight !== undefined && (
                                        <div>
                                            <label className="text-xs font-semibold text-gray-700 block mb-2">
                                                Peso
                                            </label>
                                            <select
                                                value={selectedElement.fontWeight}
                                                onChange={(e) => {
                                                    handleElementUpdate(selectedElement.id, {
                                                        fontWeight: e.target.value,
                                                    });
                                                    setSelectedElement({
                                                        ...selectedElement,
                                                        fontWeight: e.target.value,
                                                    });
                                                }}
                                                className="w-full p-2 border rounded text-sm"
                                            >
                                                <option value="normal">Normal</option>
                                                <option value="bold">Bold</option>
                                            </select>
                                        </div>
                                    )}

                                    {/* Mostrar/Ocultar */}
                                    <div className="flex items-center gap-2 pt-2 border-t">
                                        <input
                                            type="checkbox"
                                            id="mostrar"
                                            checked={selectedElement.mostrar}
                                            onChange={(e) => {
                                                handleElementUpdate(selectedElement.id, {
                                                    mostrar: e.target.checked,
                                                });
                                                setSelectedElement({ ...selectedElement, mostrar: e.target.checked });
                                            }}
                                        />
                                        <label htmlFor="mostrar" className="text-xs font-semibold text-gray-700">
                                            Mostrar elemento
                                        </label>
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {!selectedElement && (
                            <Card className="bg-blue-50 border-blue-200">
                                <CardContent className="p-4 text-center text-sm text-gray-600 mt-4">
                                    Selecciona un elemento en el canvas o en la lista de arriba para editar
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

// Componente para elementos arrastables
function DraggableElement({ element, selected, onSelect, onDrag }) {
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        if (e.button !== 0) return; // Solo click izquierdo
        
        setIsDragging(true);
        const rect = e.currentTarget.getBoundingClientRect();
        const parentRect = e.currentTarget.parentElement.getBoundingClientRect();
        
        setDragOffset({
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        });
        onSelect();
    };

    const handleMouseMove = (e) => {
        if (!isDragging) return;

        const parentRect = document.querySelector('[data-canvas-parent]')?.getBoundingClientRect();
        if (!parentRect) return;

        const newPxX = e.clientX - parentRect.left - dragOffset.x;
        const newPxY = e.clientY - parentRect.top - dragOffset.y;

        const newX = newPxX / 2.83; // Convertir px a mm
        const newY = newPxY / 2.83;

        onDrag(Math.max(0, Math.min(190, newX)), Math.max(0, Math.min(280, newY)));
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);

            return () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [isDragging, dragOffset]);

    const pxX = element.x * 2.83;
    const pxY = element.y * 2.83;

    return (
        <div
            onMouseDown={handleMouseDown}
            className={`absolute cursor-move select-none p-2 rounded transition-all ${
                selected
                    ? 'bg-blue-100 border-2 border-blue-500 shadow-lg'
                    : 'border-2 border-dashed border-gray-300 hover:border-gray-500 hover:bg-gray-50'
            }`}
            style={{
                left: `${pxX}px`,
                top: `${pxY}px`,
                color: element.color,
                fontSize: element.fontSize ? `${element.fontSize * 0.35}px` : '12px',
                fontWeight: element.fontWeight || 'normal',
                minWidth: '50px',
                minHeight: '20px',
                whiteSpace: 'nowrap',
            }}
        >
            <div className="text-xs font-semibold pointer-events-none break-words">
                {element.titulo}
            </div>
        </div>
    );
}