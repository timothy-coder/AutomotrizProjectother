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
  Package,
} from "lucide-react";

import HistorialCarrosImportGlobal from "@/app/components/carros/HistorialCarrosImportGlobal";
import HistorialCarrosSheet from "@/app/components/carros/HistorialCarrosSheet";

export default function PreciosPage() {
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [versiones, setVersiones] = useState([]);

  const [importLoading, setImportLoading] = useState(false);
  const [importFile, setImportFile] = useState(null);
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const saveTimers = useRef({});

  // Estado editable por version_id
  const [editableData, setEditableData] = useState({});

  useEffect(() => {
    return () => {
      Object.values(saveTimers.current).forEach(clearTimeout);
    };
  }, []);

  async function loadData(signal) {
    try {
      setLoading(true);

      const opts = { cache: "no-store", signal };
      const [m, mo, v] = await Promise.all([
        fetch("/api/marcas", opts).then((r) => r.json()),
        fetch("/api/modelos", opts).then((r) => r.json()),
        fetch("/api/ventas/versiones?activos=0", opts).then((r) => r.json()),
      ]);

      const marcasData = Array.isArray(m) ? m : [];
      const modelosData = Array.isArray(mo) ? mo : [];
      const versionesData = Array.isArray(v.versiones) ? v.versiones : [];

      setMarcas(marcasData);
      setModelos(modelosData);
      setVersiones(versionesData);

      const editable = {};
      for (const ver of versionesData) {
        editable[ver.id] = {
          precio_lista: ver.precio_lista ?? 0,
          en_stock: ver.en_stock ?? 0,
          tiempo_entrega_dias: ver.tiempo_entrega_dias ?? 0,
        };
      }
      setEditableData(editable);
    } catch (e) {
      if (e.name !== "AbortError") toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const ac = new AbortController();
    loadData(ac.signal);
    return () => ac.abort();
  }, []);

  function handleFieldChange(versionId, field, value) {
    const numValue = field === "precio_lista"
      ? parseFloat(value) || 0
      : parseInt(value) || 0;

    setEditableData((prev) => ({
      ...prev,
      [versionId]: {
        ...prev[versionId],
        [field]: numValue,
      },
    }));
    scheduleAutoSave(versionId);
  }

  function scheduleAutoSave(versionId) {
    setIsSaving(true);
    if (saveTimers.current[versionId]) {
      clearTimeout(saveTimers.current[versionId]);
    }
    saveTimers.current[versionId] = setTimeout(() => {
      setEditableData((current) => {
        const data = current[versionId];
        if (data) saveVersion(versionId, data);
        return current;
      });
    }, 500);
  }

  async function saveVersion(versionId, data) {
    try {
      const res = await fetch(`/api/ventas/versiones/${versionId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          precio_lista: data.precio_lista,
          en_stock: data.en_stock,
          tiempo_entrega_dias: data.tiempo_entrega_dias,
        }),
      });

      setIsSaving(false);
      if (!res.ok) {
        toast.error("Error guardando");
      }
    } catch (e) {
      setIsSaving(false);
      toast.error("Error guardando: " + (e.message || "desconocido"));
    }
  }

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
          toast.error(`${data.errors} errores durante la importacion`);
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
      toast.error("Error importando archivo");
    } finally {
      setImportLoading(false);
    }
  }

  // Agrupar versiones por marca → modelo
  const versionesPorModelo = {};
  for (const ver of versiones) {
    if (!versionesPorModelo[ver.modelo_id]) {
      versionesPorModelo[ver.modelo_id] = [];
    }
    versionesPorModelo[ver.modelo_id].push(ver);
  }

  const modelosPorMarca = {};
  modelos.forEach((modelo) => {
    if (!modelosPorMarca[modelo.marca_id]) {
      modelosPorMarca[modelo.marca_id] = [];
    }
    modelosPorMarca[modelo.marca_id].push(modelo);
  });

  const totalStock = versiones.reduce((sum, v) => {
    const ed = editableData[v.id];
    return sum + (ed?.en_stock || 0);
  }, 0);

  const stats = {
    totalMarcas: marcas.length,
    totalModelos: modelos.length,
    totalVersiones: versiones.length,
    totalStock,
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
              Precios y Stock
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Gestiona precios y stock de versiones de venta
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

  if (marcas.length === 0 || modelos.length === 0) {
    return (
      <div className="space-y-6 pb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
            <DollarSign className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              Precios y Stock
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Gestiona precios y stock de versiones de venta
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
              <li>Marcas configuradas: {marcas.length}</li>
              <li>Modelos configurados: {modelos.length}</li>
            </ul>
          </div>
          <Button
            onClick={() => loadData()}
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
                Precios y Stock
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona precios y stock de versiones de venta
              </p>
            </div>
          </div>
        </div>

        {/* ESTADISTICAS */}
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
              Total de versiones de venta configuradas
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">
                        Unidades en Stock
                      </p>
                      <p className="text-3xl font-bold text-orange-900 mt-2">
                        {stats.totalStock}
                      </p>
                    </div>
                    <Package className="h-12 w-12 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Total de unidades disponibles en stock
            </TooltipContent>
          </Tooltip>
        </div>

        {/* BOTONES DE ACCION */}
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
                    onClick={() => handleDownloadTemplate()}
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
                    onClick={() => handleDownloadCarrosTemplate()}
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
                    onClick={() => loadData()}
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

        {/* IMPORTAR SECCION */}
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
                  Carga precios rapidamente desde un archivo
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
                    onClick={() => handleImport()}
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

        {/* TABLA PRINCIPAL — Agrupada por marca/modelo */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-lg">
                <DollarSign className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-bold text-gray-900">
                  Precios y Stock por Version
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Edita precios, stock y dias de entrega para cada version
                </p>
              </div>
            </div>

            <Badge
              variant="secondary"
              className="w-fit bg-blue-100 text-blue-900 border-blue-300"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              {Object.keys(modelosPorMarca).length} marca
              {Object.keys(modelosPorMarca).length !== 1 ? "s" : ""} •{" "}
              {modelos.length} modelo
              {modelos.length !== 1 ? "s" : ""} •{" "}
              {versiones.length} version
              {versiones.length !== 1 ? "es" : ""}
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b-2 border-slate-300">
                    <th className="border-r border-slate-300 p-3 text-left font-bold bg-slate-100 min-w-[120px]">
                      Marca
                    </th>
                    <th className="border-r border-slate-300 p-3 text-left font-bold bg-slate-100 min-w-[140px]">
                      Modelo
                    </th>
                    <th className="border-r border-slate-300 p-3 text-center font-bold bg-slate-100 w-12">
                      Hist.
                    </th>
                    <th className="border-r border-slate-300 p-3 text-left font-bold bg-blue-100 text-blue-900 min-w-[160px]">
                      Version
                    </th>
                    <th className="border-r border-slate-300 p-3 text-center font-bold bg-blue-50 text-blue-700 w-[120px]">
                      Precio (USD)
                    </th>
                    <th className="border-r border-slate-300 p-3 text-center font-bold bg-green-50 text-green-700 w-[100px]">
                      Stock (uds)
                    </th>
                    <th className="border-r border-slate-300 p-3 text-center font-bold bg-orange-50 text-orange-700 w-[90px]">
                      Dias entrega
                    </th>
                    <th className="p-3 text-center font-bold bg-slate-100 w-[80px]">
                      Estado
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {(() => {
                    // Pre-calcular filas planas con rowSpans
                    const rows = [];
                    for (const [marcaId, modelosList] of Object.entries(modelosPorMarca)) {
                      const marca = marcas.find((m) => m.id === parseInt(marcaId));
                      let totalMarcaRows = 0;
                      for (const modelo of modelosList) {
                        totalMarcaRows += Math.max((versionesPorModelo[modelo.id] || []).length, 1);
                      }

                      let marcaRendered = false;
                      for (const modelo of modelosList) {
                        const vers = versionesPorModelo[modelo.id] || [];
                        const modeloRowCount = Math.max(vers.length, 1);

                        if (vers.length === 0) {
                          rows.push({
                            key: `empty-${modelo.id}`,
                            marca, modelo,
                            showMarca: !marcaRendered, marcaRowSpan: totalMarcaRows,
                            showModelo: true, modeloRowSpan: 1,
                            version: null, cell: null,
                          });
                          marcaRendered = true;
                        } else {
                          for (let vIdx = 0; vIdx < vers.length; vIdx++) {
                            rows.push({
                              key: `ver-${vers[vIdx].id}`,
                              marca, modelo,
                              showMarca: !marcaRendered, marcaRowSpan: totalMarcaRows,
                              showModelo: vIdx === 0, modeloRowSpan: modeloRowCount,
                              version: vers[vIdx],
                              cell: editableData[vers[vIdx].id] || {},
                            });
                            marcaRendered = true;
                          }
                        }
                      }
                    }

                    return rows.map((row, rIdx) => {
                      const stockNum = row.cell?.en_stock ?? 0;

                      return (
                        <tr
                          key={row.key}
                          className={`border-b border-slate-200 hover:bg-blue-50 transition-colors ${
                            rIdx % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                          }`}
                        >
                          {row.showMarca && (
                            <td
                              rowSpan={row.marcaRowSpan}
                              className="border-r border-slate-300 p-3 font-bold bg-slate-100 align-top"
                            >
                              {row.marca?.name}
                            </td>
                          )}

                          {row.showModelo && (
                            <>
                              <td
                                rowSpan={row.modeloRowSpan}
                                className="border-r border-slate-300 p-3 font-semibold text-slate-900 align-top"
                              >
                                {row.modelo.name}
                              </td>
                              <td
                                rowSpan={row.modeloRowSpan}
                                className="border-r border-slate-300 p-2 text-center align-top"
                              >
                                <HistorialCarrosSheet
                                  marcaId={row.modelo.marca_id}
                                  modeloId={row.modelo.id}
                                  marcaNombre={row.marca?.name || ""}
                                  modeloNombre={row.modelo.name}
                                />
                              </td>
                            </>
                          )}

                          {!row.version ? (
                            <td
                              colSpan={5}
                              className="p-3 text-center text-slate-400 italic"
                            >
                              Sin versiones de venta configuradas
                            </td>
                          ) : (
                            <>
                              <td className="border-r border-slate-300 p-2 font-medium text-slate-800">
                                {row.version.nombre_version}
                              </td>
                              <td className="border-r border-slate-200 p-1.5 text-center bg-blue-50/30">
                                <Input
                                  type="number"
                                  placeholder="0"
                                  value={row.cell.precio_lista ?? ""}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      row.version.id,
                                      "precio_lista",
                                      e.target.value
                                    )
                                  }
                                  className="h-8 text-center text-sm font-semibold"
                                />
                              </td>
                              <td className="border-r border-slate-200 p-1.5 text-center bg-green-50/30">
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="0"
                                  value={row.cell.en_stock ?? ""}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      row.version.id,
                                      "en_stock",
                                      e.target.value
                                    )
                                  }
                                  className={`h-8 text-center text-sm font-semibold ${
                                    stockNum > 0
                                      ? "border-green-400 bg-green-50 text-green-800"
                                      : ""
                                  }`}
                                />
                              </td>
                              <td className="border-r border-slate-300 p-1.5 text-center bg-orange-50/30">
                                <Input
                                  type="number"
                                  min={0}
                                  placeholder="0"
                                  value={row.cell.tiempo_entrega_dias ?? ""}
                                  onChange={(e) =>
                                    handleFieldChange(
                                      row.version.id,
                                      "tiempo_entrega_dias",
                                      e.target.value
                                    )
                                  }
                                  className="h-8 text-center text-sm"
                                />
                              </td>
                              <td className="p-1.5 text-center">
                                <Badge
                                  variant={stockNum > 0 ? "default" : "secondary"}
                                  className={`text-xs ${
                                    stockNum > 0
                                      ? "bg-green-100 text-green-800 border-green-300"
                                      : "bg-slate-100 text-slate-600 border-slate-300"
                                  }`}
                                >
                                  {stockNum > 0 ? `${stockNum} uds` : "Pedido"}
                                </Badge>
                              </td>
                            </>
                          )}
                        </tr>
                      );
                    });
                  })()}
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
              Guardando cambios automaticamente...
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
                  Guardado Automatico
                </p>
                <p className="text-xs text-gray-600">
                  Los precios se guardan 500ms despues de escribir
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Package
                size={16}
                className="text-blue-600 flex-shrink-0 mt-1"
              />
              <div>
                <p className="font-medium text-sm text-slate-900">
                  Stock Numerico
                </p>
                <p className="text-xs text-gray-600">
                  Ingresa la cantidad real de unidades disponibles
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
