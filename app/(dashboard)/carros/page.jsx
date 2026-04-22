"use client";

import React, { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import {
  Download,
  Upload,
  Loader2,
  AlertCircle,
  DollarSign,
  FileUp,
  CheckCircle,
  TrendingUp,
  History,
  File,
  Sparkles,
  Database,
  RefreshCw,
  Clock3,
} from "lucide-react";

import HistorialCarrosImportGlobal from "@/app/components/carros/HistorialCarrosImportGlobal";
import HistorialCarrosSheet from "@/app/components/carros/HistorialCarrosSheet";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

function cleanId(value) {
  if (!value) return null;
  const cleaned = parseInt(String(value).trim());
  return !isNaN(cleaned) && cleaned > 0 ? cleaned : null;
}

export default function PreciosPage() {
  const [precios, setPrecios] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [versiones, setVersiones] = useState([]);

  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [preciosPorMarcaModeloVersion, setPreciosPorMarcaModeloVersion] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const saveTimers = useRef({});

  async function loadData(signal) {
    try {
      setLoading(true);

      const [m, mo, v, p] = await Promise.all([
        fetch("/api/marcas", { cache: "no-store", signal }).then((r) => r.json()),
        fetch("/api/modelos", { cache: "no-store", signal }).then((r) => r.json()),
        fetch("/api/versiones?limit=1000", { cache: "no-store", signal }).then((r) => r.json()),
        fetch("/api/precios-region-version", { cache: "no-store", signal }).then((r) => r.json()),
      ]);

      if (signal?.aborted) return;

      const marcasData = Array.isArray(m) ? m : [];
      const modelosData = Array.isArray(mo) ? mo : [];

      let versionesData = [];
      if (v.data && Array.isArray(v.data)) versionesData = v.data;
      else if (Array.isArray(v)) versionesData = v;

      const preciosData = Array.isArray(p) ? p : [];

      setMarcas(marcasData);
      setModelos(modelosData);
      setVersiones(versionesData.sort((a, b) => a.id - b.id));
      setPrecios(preciosData);

      initializePricesStructure(marcasData, modelosData, versionesData, preciosData);
    } catch (e) {
      if (e.name === "AbortError") return;
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

          estructura[key][version.id] = {
            precio_base: precio?.precio_base ?? "",
            en_stock: precio ? Boolean(Number(precio.en_stock)) : true,
            existe: precio ? Boolean(Number(precio.existe)) : true,
            tiempo_entrega_dias: precio?.tiempo_entrega_dias ?? 0,
          };
        });
      });

      setPreciosPorMarcaModeloVersion(estructura);
    } catch (e) {
      console.error("Error en initializePricesStructure:", e);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, []);

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
      console.error(e);
      toast.error("Error descargando plantilla");
    }
  }

  async function handleDownloadCarrosTemplate() {
    try {
      const headers = [
        "vin",
        "marca_id",
        "modelo_id",
        "version_id",
        "numerofactura",
        "preciocompra",
        "created_at_facturacion",
        "created_at_entrega",
      ];
      const exampleData = [
        headers.join(","),
        "WBADT43452G917604,8,11,1,FAC-001,25000,2024-01-15,2024-01-20",
        "JTHBP5C2XA5034186,8,11,1,FAC-002,28000,2024-01-16,2024-01-21",
      ].join("\n");

      const blob = new Blob([exampleData], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", "plantilla-carros.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      toast.success("Plantilla de carros descargada");
    } catch (e) {
      console.error(e);
      toast.error("Error descargando plantilla de carros");
    }
  }

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
        if (data.errors > 0) toast.error(`${data.errors} errores durante la importación`);
        setImportFile(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
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

  function handlePriceChange(marcaId, modeloId, versionId, value) {
    const key = `${marcaId}_${modeloId}`;
    setPreciosPorMarcaModeloVersion((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [versionId]: {
          ...(prev[key]?.[versionId] || {}),
          precio_base: parseFloat(value) || 0,
        },
      },
    }));
    scheduleAutoSave(marcaId, modeloId, versionId, key);
  }

  function handleStockChange(marcaId, modeloId, versionId, checked) {
    const key = `${marcaId}_${modeloId}`;
    setPreciosPorMarcaModeloVersion((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [versionId]: {
          ...(prev[key]?.[versionId] || {}),
          en_stock: checked,
        },
      },
    }));
    scheduleAutoSave(marcaId, modeloId, versionId, key);
  }

  function handleExisteChange(marcaId, modeloId, versionId, checked) {
    const key = `${marcaId}_${modeloId}`;
    setPreciosPorMarcaModeloVersion((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [versionId]: {
          ...(prev[key]?.[versionId] || {}),
          existe: checked,
        },
      },
    }));
    scheduleAutoSave(marcaId, modeloId, versionId, key);
  }

  function handleDiasChange(marcaId, modeloId, versionId, value) {
    const key = `${marcaId}_${modeloId}`;
    setPreciosPorMarcaModeloVersion((prev) => ({
      ...prev,
      [key]: {
        ...prev[key],
        [versionId]: {
          ...(prev[key]?.[versionId] || {}),
          tiempo_entrega_dias: parseInt(value) || 0,
        },
      },
    }));
    scheduleAutoSave(marcaId, modeloId, versionId, key);
  }

  function scheduleAutoSave(marcaId, modeloId, versionId, key) {
    setIsSaving(true);

    if (saveTimers.current[`${key}_${versionId}`]) {
      clearTimeout(saveTimers.current[`${key}_${versionId}`]);
    }

    saveTimers.current[`${key}_${versionId}`] = setTimeout(() => {
      setPreciosPorMarcaModeloVersion((current) => {
        const cell = current[key]?.[versionId] || {};
        savePrice(marcaId, modeloId, versionId, cell);
        return current;
      });
    }, 500);
  }

  async function savePrice(marcaId, modeloId, versionId, cell) {
    try {
      const res = await fetch("/api/precios-region-version", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marca_id: marcaId,
          modelo_id: modeloId,
          version_id: versionId,
          precio_base: cell.precio_base ?? 0,
          en_stock: cell.en_stock !== false,
          existe: cell.existe !== false,
          tiempo_entrega_dias: cell.tiempo_entrega_dias ?? 0,
        }),
      });

      setIsSaving(false);
      if (!res.ok) {
        toast.error("Error guardando");
      }
    } catch (e) {
      console.error(e);
      setIsSaving(false);
      toast.error("Error guardando");
    }
  }

  const modelosPorMarca = {};
  modelos.forEach((modelo) => {
    if (!modelosPorMarca[modelo.marca_id]) {
      modelosPorMarca[modelo.marca_id] = [];
    }
    modelosPorMarca[modelo.marca_id].push(modelo);
  });

  const stats = {
    totalMarcas: marcas.length,
    totalModelos: modelos.length,
    totalVersiones: versiones.length,
    totalPrecios: precios.length,
  };

  if (loading) {
    return (
      <div className="space-y-6 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 rounded-xl shadow-lg" style={{ backgroundColor: BRAND_PRIMARY }}>
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Precios por Versión
            </h1>
            <p className="text-sm mt-1" style={{ color: BRAND_SECONDARY }}>
              Gestiona precios de mantenimiento por versión de vehículo
            </p>
          </div>
        </div>

        <div className="border rounded-2xl p-12 text-center bg-slate-50 shadow-sm">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: BRAND_PRIMARY }} />
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 pb-8">
        {/* HERO */}
        <Card className="overflow-hidden border-0 shadow-lg text-white">
          <CardContent
            className="p-6 sm:p-8"
            
          >
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="flex items-start gap-4">
                
                <div className="p-2.5 rounded-xl" style={{ backgroundColor: BRAND_PRIMARY }}>
                <DollarSign className="h-5 w-5 text-white" />
              </div>
                <div>
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h1 className="text-3xl font-bold tracking-tight text-black">
                      Precios por Versión
                    </h1>
                  </div>
                  <p className="text-black/80 text-sm max-w-2xl">
                    Configura precios de mantenimiento por marca, modelo y versión.
                    Los cambios se guardan automáticamente.
                  </p>

                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge className="bg-white/10 text-black border-[#5d16ec]">
                      {stats.totalMarcas} marcas
                    </Badge>
                    <Badge className="bg-white/10 text-black border-[#5d16ec]">
                      {stats.totalModelos} modelos
                    </Badge>
                    <Badge className="bg-white/10 text-black border-[#5d16ec]">
                      {stats.totalVersiones} versiones
                    </Badge>
                    <Badge className="bg-white/10 text-black border-[#5d16ec]">
                      {stats.totalPrecios} precios
                    </Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: "Marcas", value: stats.totalMarcas, icon: Database },
                  { label: "Modelos", value: stats.totalModelos, icon: TrendingUp },
                  { label: "Versiones", value: stats.totalVersiones, icon: CheckCircle },
                  { label: "Precios", value: stats.totalPrecios, icon: DollarSign },
                ].map((item, index) => (
                  <div
                    key={item.label}
                    className="rounded-2xl bg-[#5d16ec]/30 border border-[#5d16ec]/60 p-4 backdrop-blur-sm"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-black/70">{item.label}</p>
                      <item.icon className="h-4 w-4 text-black/80" />
                    </div>
                    <p className="text-2xl font-bold text-black">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* TOOLBAR */}
        <Card className="shadow-sm border border-slate-200">
          <CardHeader className="border-b bg-slate-50/80">
            <CardTitle className="text-lg font-semibold text-slate-900">
              Herramientas
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleDownloadTemplate}
                    variant="outline"
                    className="gap-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <Download size={16} />
                    Plantilla Precios
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Descarga la plantilla de Excel para importar precios
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleDownloadCarrosTemplate}
                    variant="outline"
                    className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50"
                  >
                    <File size={16} />
                    Plantilla Carros
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Descarga la plantilla CSV para importar carros en masa
                </TooltipContent>
              </Tooltip>

              <div onClick={(e) => e.stopPropagation()}>
                <HistorialCarrosImportGlobal
                  onSuccess={loadData}
                  trigger={
                    <Button
                      variant="outline"
                      className="gap-2 border-violet-300 text-violet-700 hover:bg-violet-50"
                    >
                      <Upload size={16} />
                      Importar Carros
                    </Button>
                  }
                />
              </div>

              <Button
                onClick={loadData}
                variant="outline"
                className="gap-2 border-slate-300 hover:bg-slate-50"
                disabled={loading}
              >
                {isSaving ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Recargar
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* IMPORT */}
        <Card className="shadow-sm border border-blue-200 overflow-hidden">
          <CardHeader
            className="border-b"
            style={{ backgroundColor: `${BRAND_PRIMARY}08` }}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl" style={{ backgroundColor: BRAND_PRIMARY }}>
                <FileUp className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-lg font-bold text-gray-900">
                  Importar Precios desde Excel
                </CardTitle>
                <p className="text-sm mt-1" style={{ color: BRAND_SECONDARY }}>
                  Carga múltiples precios rápidamente desde un archivo
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4">
            <div className="flex gap-3 flex-col sm:flex-row">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                className="flex-1 h-11 file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
              />
              <Button
                onClick={handleImport}
                disabled={!importFile || importLoading}
                className="text-white gap-2 min-w-fit h-11"
                style={{ backgroundColor: BRAND_PRIMARY }}
              >
                {importLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload size={16} />
                    Importar
                  </>
                )}
              </Button>
            </div>

            <div
              className="rounded-xl border p-4 flex gap-3"
              style={{
                backgroundColor: `${BRAND_PRIMARY}08`,
                borderColor: `${BRAND_PRIMARY}25`,
              }}
            >
              <AlertCircle size={18} style={{ color: BRAND_PRIMARY }} className="flex-shrink-0 mt-0.5" />
              <p className="text-sm" style={{ color: BRAND_SECONDARY }}>
                Descarga la plantilla primero para asegurar el formato correcto.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* TABLE */}
        <Card className="shadow-sm border border-slate-200 overflow-hidden">
          <CardHeader
            className="border-b"
            style={{ backgroundColor: `${BRAND_PRIMARY}08` }}
          >
            <div className="flex flex-col gap-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="p-2.5 rounded-xl" style={{ backgroundColor: BRAND_PRIMARY }}>
                    <DollarSign className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900">
                      Matriz de Precios
                    </CardTitle>
                    <p className="text-sm mt-1" style={{ color: BRAND_SECONDARY }}>
                      Ingresa precios, stock y días de entrega por versión
                    </p>
                  </div>
                </div>

                <Badge
                  variant="secondary"
                  className="hidden md:inline-flex text-white border-0"
                  style={{ backgroundColor: BRAND_PRIMARY }}
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {Object.keys(modelosPorMarca).length} marcas • {modelos.length} modelos
                </Badge>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200">
                    <th className="border-r border-slate-200 p-3 text-left font-semibold bg-slate-100 sticky left-0 z-20 min-w-[150px]">
                      Marca
                    </th>
                    <th className="border-r border-slate-200 p-3 text-left font-semibold bg-slate-100 sticky left-[150px] z-20 min-w-[180px]">
                      Modelo
                    </th>
                    <th className="border-r border-slate-200 p-3 text-center font-semibold bg-slate-100 w-14">
                      Hist.
                    </th>

                    {versiones.map((version) => (
                      <Tooltip key={version.id}>
                        <TooltipTrigger asChild>
                          <th
                            colSpan={4}
                            className="border-r border-slate-200 p-3 text-center font-semibold text-white min-w-[280px] cursor-help"
                            style={{ backgroundColor: BRAND_PRIMARY }}
                          >
                            {version.nombre}
                          </th>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Precio, Stock, Existe y Días de entrega para {version.nombre}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </tr>

                  <tr className="bg-white border-b border-slate-200">
                    <th className="border-r border-slate-200 p-2 bg-slate-50 sticky left-0 z-20"></th>
                    <th className="border-r border-slate-200 p-2 bg-slate-50 sticky left-[150px] z-20"></th>
                    <th className="border-r border-slate-200 p-2 bg-slate-50"></th>

                    {versiones.map((version) => (
                      <React.Fragment key={version.id}>
                        <th className="border-r border-slate-200 p-2 text-center text-xs font-semibold text-white w-[95px]" style={{ backgroundColor: BRAND_PRIMARY }}>
                          Precio
                        </th>
                        <th className="border-r border-slate-200 p-2 text-center text-xs font-semibold text-white w-[60px]" style={{ backgroundColor: BRAND_SECONDARY }}>
                          Stock
                        </th>
                        <th className="border-r border-slate-200 p-2 text-center text-xs font-semibold text-white w-[60px]" style={{ backgroundColor: "#7c3aed" }}>
                          Existe
                        </th>
                        <th className="border-r border-slate-200 p-2 text-center text-xs font-semibold text-white w-[65px]" style={{ backgroundColor: "#d97706" }}>
                          Días
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(modelosPorMarca).map(([marcaId, modelosList]) => {
                    const marca = marcas.find((m) => m.id === parseInt(marcaId));

                    return (
                      <React.Fragment key={marcaId}>
                        {modelosList.map((modelo, idx) => {
                          const key = `${modelo.marca_id}_${modelo.id}`;
                          const preciosData = preciosPorMarcaModeloVersion[key] || {};

                          const cleanMarcaId = cleanId(modelo.marca_id);
                          const cleanModeloId = cleanId(modelo.id);

                          return (
                            <tr
                              key={modelo.id}
                              className={`border-b border-slate-200 hover:bg-blue-50/40 transition-colors ${
                                idx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                              }`}
                            >
                              {idx === 0 && (
                                <td
                                  rowSpan={modelosList.length}
                                  className="border-r border-slate-200 p-3 font-bold bg-slate-50 sticky left-0 z-10 align-top min-w-[150px]"
                                >
                                  {marca?.name}
                                </td>
                              )}

                              <td className="border-r border-slate-200 p-3 font-semibold text-slate-900 sticky left-[150px] z-10 min-w-[180px] bg-inherit">
                                {modelo.name}
                              </td>

                              <td className="border-r border-slate-200 p-2 text-center bg-inherit">
                                {cleanMarcaId && cleanModeloId ? (
                                  <HistorialCarrosSheet
                                    marcaId={cleanMarcaId}
                                    modeloId={cleanModeloId}
                                    marcaNombre={marca?.name || ""}
                                    modeloNombre={modelo.name}
                                  />
                                ) : (
                                  <div className="text-xs text-gray-400" title="IDs inválidos">
                                    —
                                  </div>
                                )}
                              </td>

                              {versiones.map((version) => {
                                const cell = preciosData[version.id] || {};
                                return (
                                  <React.Fragment key={version.id}>
                                    <td className="border-r border-slate-200 p-1.5 text-center bg-blue-50/30">
                                      <input
                                        type="number"
                                        placeholder="—"
                                        value={cell.precio_base ?? ""}
                                        onChange={(e) =>
                                          handlePriceChange(
                                            modelo.marca_id,
                                            modelo.id,
                                            version.id,
                                            e.target.value
                                          )
                                        }
                                        className="w-full h-9 border border-slate-300 rounded-lg px-2 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                      />
                                    </td>
                                    <td className="border-r border-slate-200 p-1.5 text-center bg-emerald-50/30">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleStockChange(
                                                modelo.marca_id,
                                                modelo.id,
                                                version.id,
                                                !cell.en_stock
                                              )
                                            }
                                            className={`w-9 h-9 rounded-lg flex items-center justify-center mx-auto transition-all border-2 ${
                                              cell.en_stock !== false
                                                ? "bg-emerald-500 border-emerald-600 text-white hover:bg-emerald-600"
                                                : "bg-white border-slate-300 text-slate-400 hover:bg-slate-50"
                                            }`}
                                          >
                                            <CheckCircle className="w-4 h-4" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                          {cell.en_stock !== false
                                            ? "En stock — clic para marcar sin stock"
                                            : "Sin stock — clic para marcar en stock"}
                                        </TooltipContent>
                                      </Tooltip>
                                    </td>
                                    <td className="border-r border-slate-200 p-1.5 text-center bg-purple-50/30">
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleExisteChange(
                                                modelo.marca_id,
                                                modelo.id,
                                                version.id,
                                                !(cell.existe !== false)
                                              )
                                            }
                                            className={`w-9 h-9 rounded-lg flex items-center justify-center mx-auto transition-all border-2 ${
                                              cell.existe !== false
                                                ? "bg-purple-500 border-purple-600 text-white hover:bg-purple-600"
                                                : "bg-white border-slate-300 text-slate-400 hover:bg-slate-50"
                                            }`}
                                          >
                                            <CheckCircle className="w-4 h-4" />
                                          </button>
                                        </TooltipTrigger>
                                        <TooltipContent side="top">
                                          {cell.existe !== false
                                            ? "Existe en esta región — clic para marcar como no disponible"
                                            : "No existe en esta región — clic para marcar como disponible"}
                                        </TooltipContent>
                                      </Tooltip>
                                    </td>
                                    <td className="border-r border-slate-200 p-1.5 text-center bg-orange-50/30">
                                      <input
                                        type="number"
                                        min={0}
                                        value={cell.tiempo_entrega_dias ?? ""}
                                        onChange={(e) =>
                                          handleDiasChange(
                                            modelo.marca_id,
                                            modelo.id,
                                            version.id,
                                            e.target.value
                                          )
                                        }
                                        className="w-full h-9 border border-slate-300 rounded-lg px-2 text-center text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all bg-white"
                                      />
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                            </tr>
                          );
                        })}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* FOOTER */}
        <div className="space-y-3">
          {isSaving && (
            <div className="flex items-center gap-2 text-sm text-white px-4 py-3 rounded-xl shadow-sm"
              style={{ backgroundColor: BRAND_PRIMARY }}
            >
              <Loader2 size={16} className="animate-spin" />
              Guardando cambios automáticamente...
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 rounded-xl border shadow-sm"
            style={{
              backgroundColor: `${BRAND_PRIMARY}08`,
              borderColor: `${BRAND_PRIMARY}20`,
            }}
          >
            <div className="flex items-start gap-3">
              <Clock3 size={16} style={{ color: BRAND_PRIMARY }} className="flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium text-sm text-slate-900">Guardado Automático</p>
                <p className="text-xs" style={{ color: BRAND_SECONDARY }}>
                  Los precios se guardan 500ms después de escribir
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Upload size={16} style={{ color: BRAND_PRIMARY }} className="flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium text-sm text-slate-900">Importación</p>
                <p className="text-xs" style={{ color: BRAND_SECONDARY }}>
                  Usa Excel para importar múltiples precios rápidamente
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <History size={16} style={{ color: BRAND_PRIMARY }} className="flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium text-sm text-slate-900">Historial</p>
                <p className="text-xs" style={{ color: BRAND_SECONDARY }}>
                  Ver, agregar e importar carros por marca y modelo
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}