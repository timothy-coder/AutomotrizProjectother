"use client";
import React from "react";
import { useEffect, useRef, useState } from "react";
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
} from "lucide-react";

import HistorialCarrosImportGlobal from "@/app/components/carros/HistorialCarrosImportGlobal";
import HistorialCarrosSheet from "@/app/components/carros/HistorialCarrosSheet";

export default function PreciosPage() {
  const [precios, setPrecios] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [versiones, setVersiones] = useState([]);

  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);

  const [preciosPorMarcaModeloVersion, setPreciosPorMarcaModeloVersion] =
    useState({});

  const [isSaving, setIsSaving] = useState(false);
  const saveTimers = useRef({});

  // Cargar datos
  async function loadData(signal) {
    try {
      setLoading(true);

      const [m, mo, v, p] = await Promise.all([
        fetch("/api/marcas", { cache: "no-store", signal }).then((r) => r.json()),
        fetch("/api/modelos", { cache: "no-store", signal }).then((r) => r.json()),
        fetch("/api/versiones?limit=1000", { cache: "no-store", signal }).then(
          (r) => r.json()
        ),
        fetch("/api/precios-region-version", { cache: "no-store", signal }).then(
          (r) => r.json()
        ),
      ]);

      if (signal?.aborted) return;

      const marcasData = Array.isArray(m) ? m : [];
      const modelosData = Array.isArray(mo) ? mo : [];

      let versionesData = [];
      if (v.data && Array.isArray(v.data)) {
        versionesData = v.data;
      } else if (Array.isArray(v)) {
        versionesData = v;
      }

      const preciosData = Array.isArray(p) ? p : [];

      setMarcas(marcasData);
      setModelos(modelosData);
      setVersiones(versionesData.sort((a, b) => a.id - b.id));
      setPrecios(preciosData);

      initializePricesStructure(
        marcasData,
        modelosData,
        versionesData,
        preciosData
      );
    } catch (e) {
      if (e.name === "AbortError") return;
      console.error(e);
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  function initializePricesStructure(
    marcasData,
    modelosData,
    versionesData,
    preciosData
  ) {
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
        'WBADT43452G917604,8,11,1,FAC-001,25000,2024-01-15,2024-01-20',
        'JTHBP5C2XA5034186,8,11,1,FAC-002,28000,2024-01-16,2024-01-21',
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
          <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Precios por Versión
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Gestiona precios de mantenimiento por versión de vehículo
            </p>
          </div>
        </div>
        <div className="border rounded-lg p-12 text-center bg-slate-50">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-gray-600">Cargando datos...</p>
        </div>
      </div>
    );
  }

  if (
    marcas.length === 0 ||
    modelos.length === 0 ||
    versiones.length === 0
  ) {
    return (
      <div className="space-y-6 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Precios por Versión
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Gestiona precios de mantenimiento por versión de vehículo
            </p>
          </div>
        </div>
        <div className="border rounded-lg p-12 text-center bg-amber-50 border-amber-200">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 text-amber-600" />
          <p className="text-amber-900 font-semibold mb-2">
            No se encontraron datos necesarios
          </p>
          <div className="text-amber-700 text-sm mb-4 text-left max-w-md mx-auto">
            <p className="mb-2">Verifica que existan:</p>
            <ul className="list-disc list-inside space-y-1">
              <li>✓ Marcas configuradas: {marcas.length}</li>
              <li>✓ Modelos configurados: {modelos.length}</li>
              <li>✓ Versiones configuradas: {versiones.length}</li>
            </ul>
          </div>
          <Button
            onClick={loadData}
            className="bg-amber-600 hover:bg-amber-700"
          >
            Reintentar carga
          </Button>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Precios por Versión
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona precios de mantenimiento por versión de vehículo
              </p>
            </div>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">
                        Marcas
                      </p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">
                        {stats.totalMarcas}
                      </p>
                    </div>
                    <CheckCircle className="h-12 w-12 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Total de marcas registradas
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">
                        Modelos
                      </p>
                      <p className="text-3xl font-bold text-purple-900 mt-2">
                        {stats.totalModelos}
                      </p>
                    </div>
                    <TrendingUp className="h-12 w-12 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Total de modelos registrados
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">
                        Versiones
                      </p>
                      <p className="text-3xl font-bold text-green-900 mt-2">
                        {stats.totalVersiones}
                      </p>
                    </div>
                    <CheckCircle className="h-12 w-12 text-green-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Total de versiones registradas
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">
                        Precios
                      </p>
                      <p className="text-3xl font-bold text-orange-900 mt-2">
                        {stats.totalPrecios}
                      </p>
                    </div>
                    <DollarSign className="h-12 w-12 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Total de precios configurados
            </TooltipContent>
          </Tooltip>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <CardTitle className="text-lg font-bold text-gray-900">
              Herramientas
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleDownloadTemplate}
                    variant="outline"
                    className="border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 gap-2"
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
                    className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 gap-2"
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
                      className="border-purple-300 text-purple-700 hover:bg-purple-50 hover:border-purple-400 gap-2"
                    >
                      <Upload size={16} />
                      Importar Carros
                    </Button>
                  }
                />
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={loadData}
                    variant="outline"
                    className="border-gray-300 gap-2"
                    disabled={loading}
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        <span className="hidden sm:inline">Guardando...</span>
                      </>
                    ) : (
                      <>
                        <Loader2 size={16} />
                        <span className="hidden sm:inline">Recargar</span>
                      </>
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  {isSaving
                    ? "Guardando cambios..."
                    : "Recargar todos los precios"}
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        {/* IMPORTAR SECCIÓN */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-lg">
                <FileUp className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-bold text-gray-900">
                  Importar Precios desde Excel
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Carga múltiples precios rápidamente desde un archivo
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="pt-6 space-y-4">
            <div className="flex gap-3 flex-col sm:flex-row">
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                placeholder="Selecciona archivo Excel"
                className="flex-1 h-10 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
              />
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleImport}
                    disabled={!importFile || importLoading}
                    className="bg-blue-600 hover:bg-blue-700 text-white gap-2 min-w-fit"
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
                </TooltipTrigger>
                <TooltipContent side="top">
                  Importa precios desde el archivo Excel seleccionado
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
              <AlertCircle
                size={16}
                className="text-blue-600 flex-shrink-0 mt-0.5"
              />
              <p className="text-xs text-blue-700">
                Descarga la plantilla primero para asegurar el formato correcto
              </p>
            </div>
          </CardContent>
        </Card>

        {/* TABLA PRINCIPAL */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-bold text-gray-900">
                  Matriz de Precios
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Ingresa los precios para cada marca, modelo y versión
                </p>
              </div>
            </div>

            <Badge
              variant="secondary"
              className="w-fit bg-blue-100 text-blue-900 border-blue-300"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              {Object.keys(modelosPorMarca).length} marca
              {Object.keys(modelosPorMarca).length !== 1 ? "s" : ""} •
              {modelos.length} modelo
              {modelos.length !== 1 ? "s" : ""}
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-300">
                    <th className="border-r border-slate-300 p-3 text-left font-bold bg-slate-100 sticky left-0 z-10 min-w-max">
                      Marca
                    </th>
                    <th className="border-r border-slate-300 p-3 text-left font-bold bg-slate-100 sticky left-32 z-10 min-w-max">
                      Modelo
                    </th>
                    <th className="border-r border-slate-300 p-3 text-center font-bold bg-slate-100 w-12">
                      Acciones
                    </th>

                    {versiones.map((version) => (
                      <Tooltip key={version.id}>
                        <TooltipTrigger asChild>
                          <th
                            colSpan={4}
                            className="border-r border-slate-300 p-3 text-center font-bold bg-blue-100 text-blue-900 min-w-[280px] cursor-help hover:bg-blue-200 transition-colors"
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
                  <tr className="bg-slate-50 border-b border-slate-300">
                    <th className="border-r border-slate-300 p-2 text-left text-xs font-semibold text-slate-500 bg-slate-100 sticky left-0 z-10 min-w-[128px]"></th>
                    <th className="border-r border-slate-300 p-2 text-left text-xs font-semibold text-slate-500 bg-slate-100 sticky left-32 z-10 min-w-[128px]"></th>
                    <th className="border-r border-slate-300 p-2 text-center text-xs font-semibold text-slate-500 bg-slate-100 w-12"></th>
                    {versiones.map((version) => (
                      <React.Fragment key={version.id}>
                        <th className="border-r border-slate-200 p-2 text-center text-xs font-semibold text-blue-700 bg-blue-50 w-[95px]">
                          Precio
                        </th>
                        <th className="border-r border-slate-200 p-2 text-center text-xs font-semibold text-green-700 bg-green-50 w-[60px]">
                          Stock
                        </th>
                        <th className="border-r border-slate-200 p-2 text-center text-xs font-semibold text-purple-700 bg-purple-50 w-[60px]">
                          Existe
                        </th>
                        <th className="border-r border-slate-300 p-2 text-center text-xs font-semibold text-orange-700 bg-orange-50 w-[65px]">
                          Días
                        </th>
                      </React.Fragment>
                    ))}
                  </tr>
                </thead>

                <tbody>
                  {Object.entries(modelosPorMarca).map(
                    ([marcaId, modelosList]) => {
                      const marca = marcas.find(
                        (m) => m.id === parseInt(marcaId)
                      );

                      return (
                        <React.Fragment key={marcaId}>
                          {modelosList.map((modelo, idx) => {
                            const key = `${modelo.marca_id}_${modelo.id}`;
                            const preciosData =
                              preciosPorMarcaModeloVersion[key] || {};

                            return (
                              <tr
                                key={modelo.id}
                                className={`border-b border-slate-200 hover:bg-blue-50 transition-colors ${
                                  idx % 2 === 0
                                    ? "bg-white"
                                    : "bg-slate-50/30"
                                }`}
                              >
                                {idx === 0 && (
                                  <td
                                    rowSpan={modelosList.length}
                                    className="border-r border-slate-300 p-3 font-bold bg-slate-100 sticky left-0 z-5 align-top min-w-max"
                                  >
                                    {marca?.name}
                                  </td>
                                )}

                                <td className="border-r border-slate-300 p-3 font-semibold text-slate-900 sticky left-32 z-5 min-w-max">
                                  {modelo.name}
                                </td>

                                <td className="border-r border-slate-300 p-2 text-center">
                                  <HistorialCarrosSheet
                                    marcaId={modelo.marca_id}
                                    modeloId={modelo.id}
                                    marcaNombre={marca?.name || ""}
                                    modeloNombre={modelo.name}
                                  />
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
                                          className="w-full h-8 border border-slate-300 rounded px-1.5 py-1 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
                                        />
                                      </td>
                                      <td className="border-r border-slate-200 p-1.5 text-center bg-green-50/30">
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
                                              className={`w-8 h-8 rounded-md flex items-center justify-center mx-auto transition-all border-2 ${
                                                cell.en_stock !== false
                                                  ? "bg-green-500 border-green-600 text-white hover:bg-green-600"
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
                                              className={`w-8 h-8 rounded-md flex items-center justify-center mx-auto transition-all border-2 ${
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
                                      <td className="border-r border-slate-300 p-1.5 text-center bg-orange-50/30">
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
                                          className="w-full h-8 border border-slate-300 rounded px-1.5 py-1 text-center text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-all bg-white"
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
                    }
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* STATUS Y LEYENDA */}
        <div className="space-y-3">
          {isSaving && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg">
              <Loader2 size={16} className="animate-spin" />
              Guardando cambios automáticamente...
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex items-start gap-3">
              <DollarSign
                size={16}
                className="text-green-600 flex-shrink-0 mt-1"
              />
              <div>
                <p className="font-medium text-sm text-slate-900">
                  Guardado Automático
                </p>
                <p className="text-xs text-gray-600">
                  Los precios se guardan 500ms después de escribir
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Upload size={16} className="text-blue-600 flex-shrink-0 mt-1" />
              <div>
                <p className="font-medium text-sm text-slate-900">
                  Importación
                </p>
                <p className="text-xs text-gray-600">
                  Usa Excel para importar múltiples precios rápidamente
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <History
                size={16}
                className="text-purple-600 flex-shrink-0 mt-1"
              />
              <div>
                <p className="font-medium text-sm text-slate-900">
                  Historial
                </p>
                <p className="text-xs text-gray-600">
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