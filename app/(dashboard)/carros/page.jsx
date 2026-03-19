// ============================================
// COMPONENTE DE PRECIOS CON GUARDADO AUTOMÁTICO (FINAL)
// archivo: components/PreciosPage.jsx
// ============================================

"use client";
import React from "react";
import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Download, Upload, Loader2 } from "lucide-react";

export default function PreciosPage() {
  const [precios, setPrecios] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [versiones, setVersiones] = useState([]);

  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);

  // Estado para precios por marca-modelo-versión
  const [preciosPorMarcaModeloVersion, setPreciosPorMarcaModeloVersion] = useState({});

  // Estado para tracking de guardado
  const [isSaving, setIsSaving] = useState(false);
  const saveTimers = useRef({});

  // Cargar datos
  async function loadData() {
    try {
      setLoading(true);

      const [m, mo, v, p] = await Promise.all([
        fetch("/api/marcas", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/modelos", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/versiones", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/precios-region-version", { cache: "no-store" }).then((r) => r.json()),
      ]);

      const marcasData = Array.isArray(m) ? m : [];
      const modelosData = Array.isArray(mo) ? mo : [];
      const versionesData = Array.isArray(v) ? v : [];
      const preciosData = Array.isArray(p) ? p : [];

      setMarcas(marcasData);
      setModelos(modelosData);
      setVersiones(versionesData.sort((a, b) => a.id - b.id));
      setPrecios(preciosData);

      initializePricesStructure(marcasData, modelosData, versionesData, preciosData);
    } catch (e) {
      console.error(e);
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  function initializePricesStructure(marcasData, modelosData, versionesData, preciosData) {
    try {
      const estructura = {};

      modelosData.forEach((modelo) => {
        const key = `${modelo.marca_id}_${modelo.id}`;
        estructura[key] = {};

        versionesData.forEach((version) => {
          const precio = preciosData.find(
            (p) =>
              p.marca_id === modelo.marca_id &&
              p.modelo_id === modelo.id &&
              p.version_id === version.id
          );

          estructura[key][version.id] = precio?.precio_base || 0;
        });
      });

      setPreciosPorMarcaModeloVersion(estructura);
    } catch (e) {
      console.error("Error en initializePricesStructure:", e);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Descargar plantilla
  async function handleDownloadTemplate() {
    try {
      const response = await fetch(
        "/api/precios-region-version/import?action=template"
      );
      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "plantilla-precios.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("Plantilla descargada");
    } catch (e) {
      console.error(e);
      toast.error("Error descargando plantilla");
    }
  }

  // Importar precios
  async function handleImport() {
    if (!importFile) {
      toast.error("Selecciona un archivo");
      return;
    }

    try {
      setImportLoading(true);

      const formDataImport = new FormData();
      formDataImport.append("file", importFile);

      const response = await fetch("/api/precios-region-version/import", {
        method: "POST",
        body: formDataImport,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`${data.success} precios importados`);
        if (data.errors > 0) {
          toast.error(`${data.errors} errores durante la importación`);
        }
        setImportFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        loadData();
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      console.error(e);
      toast.error("Error importando archivo");
    } finally {
      setImportLoading(false);
    }
  }

  // Cambiar precio y guardar automáticamente
  function handlePriceChange(marcaId, modeloId, versionId, value) {
    const key = `${marcaId}_${modeloId}`;
    
    setPreciosPorMarcaModeloVersion((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [versionId]: parseFloat(value) || 0,
      },
    }));

    // Marcar como guardando
    setIsSaving(true);

    // Limpiar timer anterior si existe
    if (saveTimers.current[key]) {
      clearTimeout(saveTimers.current[key]);
    }

    // Guardar después de 500ms de inactividad
    saveTimers.current[key] = setTimeout(() => {
      savePrice(marcaId, modeloId, versionId, parseFloat(value) || 0, key);
    }, 500);
  }

  // Guardar precio individual
  async function savePrice(marcaId, modeloId, versionId, precio, key) {
    try {
      const res = await fetch("/api/precios-region-version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marca_id: marcaId,
          modelo_id: modeloId,
          version_id: versionId,
          precio_base: precio,
        }),
      });

      if (res.ok) {
        setIsSaving(false);
      } else {
        setIsSaving(false);
        toast.error("Error guardando precio");
      }
    } catch (e) {
      console.error(e);
      setIsSaving(false);
      toast.error("Error guardando precio");
    }
  }

  // Agrupar modelos por marca
  const modelosPorMarca = {};
  modelos.forEach((modelo) => {
    if (!modelosPorMarca[modelo.marca_id]) {
      modelosPorMarca[modelo.marca_id] = [];
    }
    modelosPorMarca[modelo.marca_id].push(modelo);
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Precios por Versión</h1>
        <div className="border rounded-lg p-12 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (marcas.length === 0 || modelos.length === 0 || versiones.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold">Precios por Versión</h1>
        <div className="border rounded-lg p-12 text-center bg-yellow-50 border-yellow-200">
          <p className="text-yellow-800 font-semibold mb-2">
            No se encontraron datos necesarios
          </p>
          <Button onClick={loadData} className="mt-4">
            Reintentar carga
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">Precios por Versión</h1>
        <div className="flex gap-2">
          <Button onClick={handleDownloadTemplate} variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Plantilla
          </Button>
          <Button 
            onClick={loadData} 
            variant="outline" 
            size="sm"
            className="relative"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Loader2 className="w-4 h-4 mr-2" />
                Recargar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Importar */}
      <div className="border rounded-lg p-4 bg-blue-50 border-blue-200">
        <h2 className="font-semibold mb-3 text-blue-900">Importar Precios</h2>
        <div className="flex gap-2">
          <Input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => setImportFile(e.target.files?.[0] || null)}
            placeholder="Selecciona archivo Excel"
            className="flex-1"
          />
          <Button
            onClick={handleImport}
            disabled={!importFile || importLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {importLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Importar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Tabla Principal */}
      <div className="overflow-x-auto border rounded-lg bg-white">
        <table className="w-full text-sm border-collapse">
          {/* Header Fijo */}
          <thead>
            <tr className="bg-gray-50 border-b-2">
              <th className="border p-3 text-left font-bold bg-gray-100 sticky left-0 z-10">
                Marca
              </th>
              <th className="border p-3 text-left font-bold bg-gray-100 sticky left-24 z-10">
                Modelo
              </th>
              {/* Columnas de versiones */}
              {versiones.map((version) => (
                <th
                  key={version.id}
                  className="border p-3 text-center font-bold bg-blue-100 min-w-32"
                >
                  {version.nombre}
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody>
            {Object.entries(modelosPorMarca).map(([marcaId, modelosList]) => {
              const marca = marcas.find((m) => m.id === parseInt(marcaId));

              return (
                <React.Fragment key={marcaId}>
                  {modelosList.map((modelo, idx) => {
                    const key = `${modelo.marca_id}_${modelo.id}`;
                    const preciosData = preciosPorMarcaModeloVersion[key] || {};

                    return (
                      <tr
                        key={modelo.id}
                        className="border-b hover:bg-gray-50 transition-colors"
                      >
                        {/* Marca (solo en la primera fila del grupo) */}
                        {idx === 0 && (
                          <td
                            rowSpan={modelosList.length}
                            className="border p-3 font-bold bg-gray-50 sticky left-0 z-5 align-top"
                          >
                            {marca?.name}
                          </td>
                        )}

                        {/* Modelo */}
                        <td className="border p-3 font-semibold sticky left-24 z-5 bg-white">
                          {modelo.name}
                        </td>

                        {/* Precios por versión */}
                        {versiones.map((version) => (
                          <td key={version.id} className="border p-2 text-center">
                            <input
                              type="number"
                              placeholder="-"
                              value={preciosData[version.id] || ""}
                              onChange={(e) =>
                                handlePriceChange(
                                  modelo.marca_id,
                                  modelo.id,
                                  version.id,
                                  e.target.value
                                )
                              }
                              className="w-full h-9 border rounded px-2 py-1 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="text-xs text-gray-600 space-y-1">
        <p>💡 <strong>Guardado automático:</strong> Los precios se guardan automáticamente 500ms después de dejar de escribir.</p>
        <p>🔄 <strong>Estado de guardado:</strong> Observa el botón Recargar para ver el estado de guardado.</p>
      </div>
    </div>
  );
}