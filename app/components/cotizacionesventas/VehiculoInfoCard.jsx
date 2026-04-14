// app/(dashboard)/cotizaciones/[id]/resumen/components/VehiculoInfoCard.jsx

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
import { Check, X } from "lucide-react";

export function VehiculoInfoCard({
    cotizacion,
    marcas,
    modelos,
    versiones,
    editingField,
    editValues,
    savingEdit,
    loadingOptions,
    onStartEdit,
    onCancelEdit,
    onSaveEdit,
    onEditValuesChange,
}) {
    return (
        <Card>
            <CardHeader className="pb-3 sm:pb-6">
                <CardTitle className="text-base sm:text-lg">
                    Información General - Vehículo
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                    {/* Marca */}
                    <div>
                        <p className="text-xs text-gray-600 font-semibold mb-1">Marca</p>
                        {editingField === "marca_id" ? (
                            <div className="flex gap-1 sm:gap-2 mt-1">
                                <Select
                                    value={String(editValues.marca_id || "")}
                                    onValueChange={(value) =>
                                        onEditValuesChange({ ...editValues, marca_id: parseInt(value) })
                                    }
                                    disabled={savingEdit || loadingOptions}
                                >
                                    <SelectTrigger className="text-xs sm:text-sm h-8">
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {marcas.map((marca) => (
                                            <SelectItem key={marca.id} value={String(marca.id)}>
                                                {marca.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    size="sm"
                                    onClick={() => onSaveEdit("marca_id")}
                                    disabled={savingEdit}
                                    className="h-8 w-8 p-0"
                                >
                                    <Check size={14} />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={onCancelEdit}
                                    disabled={savingEdit}
                                    className="h-8 w-8 p-0"
                                >
                                    <X size={14} />
                                </Button>
                            </div>
                        ) : (
                            <div
                                className="text-sm sm:text-lg font-bold text-gray-900 cursor-pointer hover:bg-gray-100 p-1 sm:p-2 rounded truncate"
                                onClick={() => onStartEdit("marca_id", cotizacion.marca_id)}
                            >
                                {cotizacion.marca}
                            </div>
                        )}
                    </div>

                    {/* Modelo */}
                    <div>
                        <p className="text-xs text-gray-600 font-semibold mb-1">Modelo</p>
                        {editingField === "modelo_id" ? (
                            <div className="flex gap-1 sm:gap-2 mt-1">
                                <Select
                                    value={String(editValues.modelo_id || "")}
                                    onValueChange={(value) =>
                                        onEditValuesChange({
                                            ...editValues,
                                            modelo_id: parseInt(value),
                                        })
                                    }
                                    disabled={savingEdit || loadingOptions}
                                >
                                    <SelectTrigger className="text-xs sm:text-sm h-8">
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {modelos.map((modelo) => (
                                            <SelectItem key={modelo.id} value={String(modelo.id)}>
                                                {modelo.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    size="sm"
                                    onClick={() => onSaveEdit("modelo_id")}
                                    disabled={savingEdit}
                                    className="h-8 w-8 p-0"
                                >
                                    <Check size={14} />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={onCancelEdit}
                                    disabled={savingEdit}
                                    className="h-8 w-8 p-0"
                                >
                                    <X size={14} />
                                </Button>
                            </div>
                        ) : (
                            <div
                                className="text-sm sm:text-lg font-bold text-gray-900 cursor-pointer hover:bg-gray-100 p-1 sm:p-2 rounded truncate"
                                onClick={() => onStartEdit("modelo_id", cotizacion.modelo_id)}
                            >
                                {cotizacion.modelo}
                            </div>
                        )}
                    </div>

                    {/* Versión */}
                    <div>
                        <p className="text-xs text-gray-600 font-semibold mb-1">Versión</p>
                        {editingField === "version_id" ? (
                            <div className="flex gap-1 sm:gap-2 mt-1">
                                <Select
                                    value={String(editValues.version_id || "null")}
                                    onValueChange={(value) => {
                                        onEditValuesChange({
                                            ...editValues,
                                            version_id: value === "null" ? null : parseInt(value),
                                        });
                                    }}
                                    disabled={savingEdit || loadingOptions}
                                >
                                    <SelectTrigger className="text-xs sm:text-sm h-8">
                                        <SelectValue placeholder="Seleccionar" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="null">Sin versión</SelectItem>
                                        {versiones.map((version) => (
                                            <SelectItem key={version.id} value={String(version.id)}>
                                                {version.nombre}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button
                                    size="sm"
                                    onClick={() => onSaveEdit("version_id")}
                                    disabled={savingEdit}
                                    className="h-8 w-8 p-0"
                                >
                                    <Check size={14} />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={onCancelEdit}
                                    disabled={savingEdit}
                                    className="h-8 w-8 p-0"
                                >
                                    <X size={14} />
                                </Button>
                            </div>
                        ) : (
                            <div
                                className="text-sm sm:text-lg font-bold text-gray-900 cursor-pointer hover:bg-gray-100 p-1 sm:p-2 rounded truncate"
                                onClick={() => onStartEdit("version_id", cotizacion.version_id)}
                            >
                                {cotizacion.version || "N/A"}
                            </div>
                        )}
                    </div>

                    {/* Año */}
                    <div>
                        <p className="text-xs text-gray-600 font-semibold mb-1">Año</p>
                        {editingField === "anio" ? (
                            <div className="flex gap-1 sm:gap-2 mt-1">
                                <Input
                                    type="number"
                                    value={editValues.anio || ""}
                                    onChange={(e) =>
                                        onEditValuesChange({
                                            ...editValues,
                                            anio: e.target.value ? parseInt(e.target.value) : null,
                                        })
                                    }
                                    className="text-xs sm:text-sm h-8"
                                    disabled={savingEdit}
                                />
                                <Button
                                    size="sm"
                                    onClick={() => onSaveEdit("anio")}
                                    disabled={savingEdit}
                                    className="h-8 w-8 p-0"
                                >
                                    <Check size={14} />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={onCancelEdit}
                                    disabled={savingEdit}
                                    className="h-8 w-8 p-0"
                                >
                                    <X size={14} />
                                </Button>
                            </div>
                        ) : (
                            <div
                                className="text-sm sm:text-lg font-bold text-gray-900 cursor-pointer hover:bg-gray-100 p-1 sm:p-2 rounded truncate"
                                onClick={() => onStartEdit("anio", cotizacion.anio)}
                            >
                                {cotizacion.anio || "N/A"}
                            </div>
                        )}
                    </div>

                    {/* Color Externo */}
                    <div>
                        <p className="text-xs text-gray-600 font-semibold mb-1">Color Ext.</p>
                        {editingField === "color_externo" ? (
                            <div className="flex gap-1 sm:gap-2 mt-1">
                                <Input
                                    value={editValues.color_externo || ""}
                                    onChange={(e) =>
                                        onEditValuesChange({
                                            ...editValues,
                                            color_externo: e.target.value,
                                        })
                                    }
                                    className="text-xs sm:text-sm h-8"
                                    disabled={savingEdit}
                                />
                                <Button
                                    size="sm"
                                    onClick={() => onSaveEdit("color_externo")}
                                    disabled={savingEdit}
                                    className="h-8 w-8 p-0"
                                >
                                    <Check size={14} />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={onCancelEdit}
                                    disabled={savingEdit}
                                    className="h-8 w-8 p-0"
                                >
                                    <X size={14} />
                                </Button>
                            </div>
                        ) : (
                            <div
                                className="text-sm sm:text-lg font-bold text-gray-900 cursor-pointer hover:bg-gray-100 p-1 sm:p-2 rounded truncate"
                                onClick={() =>
                                    onStartEdit("color_externo", cotizacion.color_externo)
                                }
                            >
                                {cotizacion.color_externo || "N/A"}
                            </div>
                        )}
                    </div>

                    {/* Color Interno */}
                    <div>
                        <p className="text-xs text-gray-600 font-semibold mb-1">Color Int.</p>
                        {editingField === "color_interno" ? (
                            <div className="flex gap-1 sm:gap-2 mt-1">
                                <Input
                                    value={editValues.color_interno || ""}
                                    onChange={(e) =>
                                        onEditValuesChange({
                                            ...editValues,
                                            color_interno: e.target.value,
                                        })
                                    }
                                    className="text-xs sm:text-sm h-8"
                                    disabled={savingEdit}
                                />
                                <Button
                                    size="sm"
                                    onClick={() => onSaveEdit("color_interno")}
                                    disabled={savingEdit}
                                    className="h-8 w-8 p-0"
                                >
                                    <Check size={14} />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={onCancelEdit}
                                    disabled={savingEdit}
                                    className="h-8 w-8 p-0"
                                >
                                    <X size={14} />
                                </Button>
                            </div>
                        ) : (
                            <div
                                className="text-sm sm:text-lg font-bold text-gray-900 cursor-pointer hover:bg-gray-100 p-1 sm:p-2 rounded truncate"
                                onClick={() =>
                                    onStartEdit("color_interno", cotizacion.color_interno)
                                }
                            >
                                {cotizacion.color_interno || "N/A"}
                            </div>
                        )}
                    </div>

                    {/* SKU */}
                    <div>
                        <p className="text-xs text-gray-600 font-semibold mb-1">SKU</p>
                        {editingField === "sku" ? (
                            <div className="flex gap-1 sm:gap-2 mt-1">
                                <Input
                                    value={editValues.sku || ""}
                                    onChange={(e) =>
                                        onEditValuesChange({ ...editValues, sku: e.target.value })
                                    }
                                    className="text-xs sm:text-sm h-8"
                                    disabled={savingEdit}
                                />
                                <Button
                                    size="sm"
                                    onClick={() => onSaveEdit("sku")}
                                    disabled={savingEdit}
                                    className="h-8 w-8 p-0"
                                >
                                    <Check size={14} />
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={onCancelEdit}
                                    disabled={savingEdit}
                                    className="h-8 w-8 p-0"
                                >
                                    <X size={14} />
                                </Button>
                            </div>
                        ) : (
                            <div
                                className="text-sm sm:text-lg font-bold text-gray-900 cursor-pointer hover:bg-gray-100 p-1 sm:p-2 rounded truncate"
                                onClick={() => onStartEdit("sku", cotizacion.sku)}
                            >
                                {cotizacion.sku || "N/A"}
                            </div>
                        )}
                    </div>

                    {/* Estado */}
                    <div>
                        <p className="text-xs text-gray-600 font-semibold mb-1">Estado</p>
                        <p
                            className={`text-sm sm:text-lg font-bold ${
                                cotizacion.estado === "aceptada"
                                    ? "text-green-600"
                                    : cotizacion.estado === "enviada"
                                    ? "text-blue-600"
                                    : cotizacion.estado === "cancelado"
                                    ? "text-red-600"
                                    : "text-gray-600"
                            }`}
                        >
                            {cotizacion.estado === "borrador"
                                ? "Abierto"
                                : cotizacion.estado.charAt(0).toUpperCase() +
                                cotizacion.estado.slice(1)}
                        </p>
                    </div>

                    {/* Creado */}
                    <div>
                        <p className="text-xs text-gray-600 font-semibold mb-1">Creado</p>
                        <p className="text-sm sm:text-lg font-bold text-gray-900">
                            {new Date(cotizacion.created_at).toLocaleDateString("es-ES", {
                                month: "2-digit",
                                day: "2-digit",
                            })}
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}