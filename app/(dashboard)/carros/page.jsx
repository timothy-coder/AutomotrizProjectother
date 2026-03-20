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
  Info,
  CheckCircle,
  TrendingUp,
} from "lucide-react";

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
  async function loadData() {
    try {
      setLoading(true);

      const [m, mo, v, p] = await Promise.all([
        fetch("/api/marcas", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/modelos", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/versiones?limit=1000", { cache: "no-store" }).then(
          (r) => r.json()
        ),
        fetch("/api/precios-region-version", { cache: "no-store" }).then(
          (r) => r.json()
        ),
      ]);

      // Manejar respuestas con paginación
      const marcasData = Array.isArray(m) ? m : [];
      const modelosData = Array.isArray(mo) ? mo : [];
      
      // Las versiones pueden venir con paginación
      let versionesData = [];
      if (v.data && Array.isArray(v.data)) {
        versionesData = v.data;
      } else if (Array.isArray(v)) {
        versionesData = v;
      }
      
      const preciosData = Array.isArray(p) ? p : [];

      console.log("Marcas:", marcasData);
      console.log("Modelos:", modelosData);
      console.log("Versiones:", versionesData);
      console.log("Precios:", preciosData);

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

    setIsSaving(true);

    if (saveTimers.current[key]) {
      clearTimeout(saveTimers.current[key]);
    }

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
                    Descargar Plantilla
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Descarga la plantilla de Excel para importar precios
                </TooltipContent>
              </Tooltip>

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
                {/* HEADER */}
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-300">
                    <th className="border-r border-slate-300 p-3 text-left font-bold bg-slate-100 sticky left-0 z-10 min-w-max">
                      Marca
                    </th>
                    <th className="border-r border-slate-300 p-3 text-left font-bold bg-slate-100 sticky left-32 z-10 min-w-max">
                      Modelo
                    </th>

                    {/* Columnas de versiones */}
                    {versiones.map((version) => (
                      <Tooltip key={version.id}>
                        <TooltipTrigger asChild>
                          <th className="border-r border-slate-300 p-3 text-center font-bold bg-blue-100 text-blue-900 min-w-[140px] cursor-help hover:bg-blue-200 transition-colors">
                            {version.nombre}
                          </th>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Ingresa el precio base para {version.nombre}
                        </TooltipContent>
                      </Tooltip>
                    ))}
                  </tr>
                </thead>

                {/* BODY */}
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
                                {/* Marca (solo en la primera fila del grupo) */}
                                {idx === 0 && (
                                  <td
                                    rowSpan={modelosList.length}
                                    className="border-r border-slate-300 p-3 font-bold bg-slate-100 sticky left-0 z-5 align-top min-w-max"
                                  >
                                    {marca?.name}
                                  </td>
                                )}

                                {/* Modelo */}
                                <td className="border-r border-slate-300 p-3 font-semibold text-slate-900 sticky left-32 z-5 min-w-max">
                                  {modelo.name}
                                </td>

                                {/* Precios por versión */}
                                {versiones.map((version) => (
                                  <td
                                    key={version.id}
                                    className="border-r border-slate-300 p-2 text-center"
                                  >
                                    <input
                                      type="number"
                                      placeholder="—"
                                      value={
                                        preciosData[version.id] || ""
                                      }
                                      onChange={(e) =>
                                        handlePriceChange(
                                          modelo.marca_id,
                                          modelo.id,
                                          version.id,
                                          e.target.value
                                        )
                                      }
                                      className="w-full h-9 border border-slate-300 rounded-md px-2 py-1 text-center text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    />
                                  </td>
                                ))}
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
          {/* Estado de guardado */}
          {isSaving && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 border border-blue-200 px-4 py-3 rounded-lg">
              <Loader2 size={16} className="animate-spin" />
              Guardando cambios automáticamente...
            </div>
          )}

          {/* Leyenda */}
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
              <AlertCircle
                size={16}
                className="text-amber-600 flex-shrink-0 mt-1"
              />
              <div>
                <p className="font-medium text-sm text-slate-900">
                  Validación
                </p>
                <p className="text-xs text-gray-600">
                  Verifica que todos los campos requeridos estén completos
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}