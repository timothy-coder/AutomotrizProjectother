"use client";

import { useState, useEffect } from "react";
import { Loader2, ChevronDown, ExternalLink, Image as ImageIcon, Video as VideoIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import EspecificacionesSection from "./EspecificacionesSection";

function isUrl(str) {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

export default function CotizacionFormContent({
  selectedMarca,
  setSelectedMarca,
  selectedModelo,
  setSelectedModelo,
  formData,
  setFormData,
  marcas,
  modelos,
  versiones,
  editingCotizacion,
}) {
  const [expandedEspecificaciones, setExpandedEspecificaciones] = useState(false);

  const modelosFiltrados = selectedMarca
    ? modelos.filter((m) => m.marca_id === parseInt(selectedMarca))
    : [];

  const marcaObj = marcas.find((m) => m.id === parseInt(selectedMarca));
  const modeloObj = modelos.find((m) => m.id === parseInt(selectedModelo));
  const versionObj = versiones.find((v) => v.id === parseInt(formData.version_id));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Columna Izquierda - Selección de Vehículo */}
        <div className="col-span-1">
          <h3 className="font-semibold mb-4 text-sm text-gray-700">
            Selecciona un vehículo
          </h3>

          <div className="space-y-4">
            {/* Marca */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Marca
              </label>
              <Select
                value={selectedMarca}
                onValueChange={(value) => {
                  setSelectedMarca(value);
                  setSelectedModelo("");
                }}
                disabled={!!editingCotizacion}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Selecciona marca" />
                </SelectTrigger>
                <SelectContent>
                  {marcas.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedMarca && marcaObj && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700 font-medium">
                  ✓ {marcaObj.name}
                </div>
              )}
            </div>

            {/* Modelo */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Modelo
              </label>
              <Select
                value={selectedModelo}
                onValueChange={setSelectedModelo}
                disabled={!selectedMarca || !!editingCotizacion}
              >
                <SelectTrigger className="text-sm">
                  <SelectValue
                    placeholder={
                      selectedMarca
                        ? "Selecciona modelo"
                        : "Selecciona marca primero"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {modelosFiltrados.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedModelo && modeloObj && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700 font-medium">
                  ✓ {modeloObj.name}
                </div>
              )}
            </div>

            {/* Año */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Año
              </label>
              <Input
                type="number"
                value={formData.anio}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    anio: e.target.value,
                  }))
                }
                placeholder="2024"
                min={2000}
                max={new Date().getFullYear() + 1}
                className="text-sm"
              />
            </div>

            {/* Versión */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Versión
              </label>
              <Select
                value={formData.version_id}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    version_id: value,
                  }))
                }
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Selecciona versión" />
                </SelectTrigger>
                <SelectContent>
                  {versiones.map((v) => (
                    <SelectItem key={v.id} value={v.id.toString()}>
                      {v.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formData.version_id && versionObj && (
                <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700 font-medium">
                  ✓ {versionObj.nombre}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Columna Centro - Datos de Cotización */}
        <div className="col-span-1">
          <h3 className="font-semibold mb-4 text-sm text-gray-700">
            Detalles
          </h3>

          <div className="space-y-4">
            {/* SKU */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                SKU
              </label>
              <Input
                value={formData.sku}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    sku: e.target.value,
                  }))
                }
                placeholder="R533A01"
                className="text-sm"
              />
            </div>

            {/* Color Externo */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Color externo
              </label>
              <Select
                value={formData.color_externo}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    color_externo: value,
                  }))
                }
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Rojo">Rojo</SelectItem>
                  <SelectItem value="Negro">Negro</SelectItem>
                  <SelectItem value="Blanco">Blanco</SelectItem>
                  <SelectItem value="Plateado">Plateado</SelectItem>
                  <SelectItem value="Azul">Azul</SelectItem>
                  <SelectItem value="Gris">Gris</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Color Interno */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Color interno
              </label>
              <Select
                value={formData.color_interno}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    color_interno: value,
                  }))
                }
              >
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Seleccione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Negro">Negro</SelectItem>
                  <SelectItem value="Café">Café</SelectItem>
                  <SelectItem value="Gris">Gris</SelectItem>
                  <SelectItem value="Beige">Beige</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Columna Derecha - Imagen */}
        <div className="col-span-1">
          <h3 className="font-semibold mb-4 text-sm text-gray-700">
            Vista previa
          </h3>
          <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg h-64 flex items-center justify-center overflow-hidden">
            {modeloObj ? (
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-800">
                  {marcaObj?.name} {modeloObj?.name}
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {versionObj?.nombre || formData.anio || "Versión"}
                </p>
                {formData.color_externo && (
                  <div className="mt-3 flex justify-center gap-2">
                    <div
                      className="w-8 h-8 rounded-full border-2 border-gray-300"
                      style={{
                        backgroundColor:
                          {
                            Rojo: "#EF4444",
                            Negro: "#1F2937",
                            Blanco: "#F3F4F6",
                            Plateado: "#D1D5DB",
                            Azul: "#3B82F6",
                            Gris: "#9CA3AF",
                          }[formData.color_externo] || "#E5E7EB",
                      }}
                    />
                    <div
                      className="w-8 h-8 rounded-full border-2 border-gray-300"
                      style={{
                        backgroundColor:
                          {
                            Negro: "#1F2937",
                            Café: "#92400e",
                            Gris: "#9CA3AF",
                            Beige: "#FDE68A",
                          }[formData.color_interno] || "#E5E7EB",
                      }}
                    />
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center text-gray-500 text-sm">
                Selecciona marca y modelo
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Especificaciones Técnicas */}
      {selectedMarca && selectedModelo && (
        <EspecificacionesSection
          marcaId={selectedMarca}
          modeloId={selectedModelo}
          expanded={expandedEspecificaciones}
          onExpandChange={setExpandedEspecificaciones}
        />
      )}
    </div>
  );
}