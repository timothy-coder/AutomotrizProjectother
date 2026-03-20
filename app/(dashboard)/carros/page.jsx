// ============================================
// PRECIOS DE CARROS - Precio + Stock por Versión
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

  // Estado por marca-modelo-version: { precio_base, en_stock, tiempo_entrega_dias }
  const [datosPorMVV, setDatosPorMVV] = useState({});

  const [isSaving, setIsSaving] = useState(false);
  const saveTimers = useRef({});

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
      initDatos(modelosData, versionesData, preciosData);
    } catch (e) {
      console.error(e);
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  function initDatos(modelosData, versionesData, preciosData) {
    const estructura = {};
    modelosData.forEach((modelo) => {
      versionesData.forEach((version) => {
        const key = `${modelo.marca_id}_${modelo.id}_${version.id}`;
        const precio = preciosData.find(
          (p) =>
            p.marca_id === modelo.marca_id &&
            p.modelo_id === modelo.id &&
            p.version_id === version.id
        );
        estructura[key] = {
          precio_base: precio?.precio_base ?? "",
          en_stock: precio ? Boolean(precio.en_stock) : true,
          tiempo_entrega_dias: precio?.tiempo_entrega_dias ?? 0,
        };
      });
    });
    setDatosPorMVV(estructura);
  }

  useEffect(() => { loadData(); }, []);

  async function handleDownloadTemplate() {
    try {
      const response = await fetch("/api/precios-region-version/import?action=template");
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
      toast.error("Error descargando plantilla");
    }
  }

  async function handleImport() {
    if (!importFile) { toast.error("Selecciona un archivo"); return; }
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
        if (data.errors > 0) toast.error(`${data.errors} errores durante la importación`);
        setImportFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        loadData();
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      toast.error("Error importando archivo");
    } finally {
      setImportLoading(false);
    }
  }

  function handleFieldChange(marcaId, modeloId, versionId, field, value) {
    const key = `${marcaId}_${modeloId}_${versionId}`;
    setDatosPorMVV((prev) => ({
      ...prev,
      [key]: { ...prev[key], [field]: value },
    }));

    setIsSaving(true);
    if (saveTimers.current[key]) clearTimeout(saveTimers.current[key]);
    saveTimers.current[key] = setTimeout(() => {
      const current = { ...datosPorMVV[key], [field]: value };
      saveRow(marcaId, modeloId, versionId, current);
    }, 600);
  }

  async function saveRow(marcaId, modeloId, versionId, datos) {
    try {
      const res = await fetch("/api/precios-region-version", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marca_id: marcaId,
          modelo_id: modeloId,
          version_id: versionId,
          precio_base: parseFloat(datos.precio_base) || 0,
          en_stock: datos.en_stock,
          tiempo_entrega_dias: Number(datos.tiempo_entrega_dias) || 0,
        }),
      });
      if (!res.ok) toast.error("Error guardando");
    } catch (e) {
      toast.error("Error guardando");
    } finally {
      setIsSaving(false);
    }
  }

  const modelosPorMarca = {};
  modelos.forEach((modelo) => {
    if (!modelosPorMarca[modelo.marca_id]) modelosPorMarca[modelo.marca_id] = [];
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
          <p className="text-yellow-800 font-semibold mb-2">No se encontraron datos necesarios</p>
          <Button onClick={loadData} className="mt-4">Reintentar carga</Button>
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
          <Button onClick={loadData} variant="outline" size="sm">
            {isSaving ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Guardando...</>
            ) : (
              <><Loader2 className="w-4 h-4 mr-2" />Recargar</>
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
            className="flex-1"
          />
          <Button onClick={handleImport} disabled={!importFile || importLoading} className="bg-blue-600 hover:bg-blue-700">
            {importLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importando...</> : <><Upload className="w-4 h-4 mr-2" />Importar</>}
          </Button>
        </div>
      </div>

      {/* Tabla */}
      <div className="overflow-x-auto border rounded-lg bg-white">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b-2">
              <th className="border p-3 text-left font-bold bg-gray-100 sticky left-0 z-10">Marca</th>
              <th className="border p-3 text-left font-bold bg-gray-100 sticky left-24 z-10">Modelo</th>
              {versiones.map((version) => (
                <th key={version.id} className="border p-2 text-center font-bold bg-blue-100 min-w-48" colSpan={1}>
                  <div>{version.nombre}</div>
                  <div className="flex text-xs font-normal text-gray-500 justify-center gap-4 mt-1">
                    <span>Precio</span>
                    <span>Stock</span>
                    <span>Días</span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.entries(modelosPorMarca).map(([marcaId, modelosList]) => {
              const marca = marcas.find((m) => m.id === parseInt(marcaId));
              return (
                <React.Fragment key={marcaId}>
                  {modelosList.map((modelo, idx) => (
                    <tr key={modelo.id} className="border-b hover:bg-gray-50 transition-colors">
                      {idx === 0 && (
                        <td rowSpan={modelosList.length} className="border p-3 font-bold bg-gray-50 sticky left-0 z-5 align-top">
                          {marca?.name}
                        </td>
                      )}
                      <td className="border p-3 font-semibold sticky left-24 z-5 bg-white">{modelo.name}</td>
                      {versiones.map((version) => {
                        const key = `${modelo.marca_id}_${modelo.id}_${version.id}`;
                        const datos = datosPorMVV[key] || { precio_base: "", en_stock: true, tiempo_entrega_dias: 0 };
                        return (
                          <td key={version.id} className="border p-2">
                            <div className="flex items-center gap-1">
                              {/* Precio */}
                              <input
                                type="number"
                                min={0}
                                placeholder="-"
                                value={datos.precio_base}
                                onChange={(e) => handleFieldChange(modelo.marca_id, modelo.id, version.id, "precio_base", e.target.value)}
                                className="w-24 h-8 border rounded px-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                              {/* Stock toggle */}
                              <button
                                title={datos.en_stock ? "En stock — click para cambiar a bajo pedido" : "Bajo pedido — click para marcar en stock"}
                                onClick={() => handleFieldChange(modelo.marca_id, modelo.id, version.id, "en_stock", !datos.en_stock)}
                                className={`h-8 px-2 rounded text-xs font-medium border transition-colors ${
                                  datos.en_stock
                                    ? "bg-green-100 text-green-700 border-green-300 hover:bg-green-200"
                                    : "bg-amber-100 text-amber-700 border-amber-300 hover:bg-amber-200"
                                }`}
                              >
                                {datos.en_stock ? "✓" : "P"}
                              </button>
                              {/* Días de entrega (solo visible si no hay stock) */}
                              {!datos.en_stock && (
                                <input
                                  type="number"
                                  min={0}
                                  placeholder="días"
                                  value={datos.tiempo_entrega_dias}
                                  onChange={(e) => handleFieldChange(modelo.marca_id, modelo.id, version.id, "tiempo_entrega_dias", e.target.value)}
                                  className="w-14 h-8 border rounded px-1 text-center text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                                  title="Días hábiles de entrega"
                                />
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className="text-xs text-gray-500 space-y-1 border rounded p-3 bg-gray-50">
        <p><strong>Precio:</strong> Precio de lista del vehículo.</p>
        <p><strong>✓ (verde):</strong> En stock. <strong>P (amarillo):</strong> Bajo pedido — aparece campo de días de entrega.</p>
        <p><strong>Guardado automático:</strong> Los cambios se guardan 600ms después de editar.</p>
      </div>
    </div>
  );
}
