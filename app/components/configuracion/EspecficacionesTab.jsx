// ============================================
// COMPONENTE ACTUALIZADO CON DOBLE IMPORTACIÓN
// ============================================

"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Pencil,
  Trash2,
  Plus,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Download,
  Upload,
  Tabs,
} from "lucide-react";

export default function EspecificacionesTab() {
  const [especificaciones, setEspecificaciones] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [modeloEspecificaciones, setModeloEspecificaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  const [selectedMarca, setSelectedMarca] = useState("");
  const [selectedModelo, setSelectedModelo] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogEspecOpen, setDialogEspecOpen] = useState(false);
  const [dialogEditOpen, setDialogEditOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [importDialog, setImportDialog] = useState(false);
  const [importType, setImportType] = useState("especificaciones"); // "especificaciones" o "modelo"
  const [savingEspec, setSavingEspec] = useState(false);
  const [importing, setImporting] = useState(false);

  const [editingEspec, setEditingEspec] = useState(null);
  const [editingModeloEspec, setEditingModeloEspec] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [expandedEspec, setExpandedEspec] = useState({});
  const [importFile, setImportFile] = useState(null);
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    nombre: "",
    tipo_dato: "texto",
    opciones: [],
  });

  const [nuevoOpcion, setNuevoOpcion] = useState("");

  const [modeloEspecFormData, setModeloEspecFormData] = useState({
    especificacion_id: "",
    valor: "",
  });

  const tiposDatos = [
    { value: "texto", label: "Texto" },
    { value: "numero", label: "Número" },
    { value: "booleano", label: "Booleano" },
    { value: "lista", label: "Lista" },
  ];

  // Cargar datos
  async function loadData() {
    setLoading(true);
    try {
      const [e, m, mo] = await Promise.all([
        fetch("/api/especificaciones", { cache: "no-store" }).then((r) => {
          if (!r.ok) throw new Error(`Error: ${r.status}`);
          return r.json();
        }),
        fetch("/api/marcas", { cache: "no-store" }).then((r) => {
          if (!r.ok) throw new Error(`Error: ${r.status}`);
          return r.json();
        }),
        fetch("/api/modelos", { cache: "no-store" }).then((r) => {
          if (!r.ok) throw new Error(`Error: ${r.status}`);
          return r.json();
        }),
      ]);

      setEspecificaciones(Array.isArray(e) ? e : []);
      setMarcas(Array.isArray(m) ? m : []);
      setModelos(Array.isArray(mo) ? mo : []);
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast.error("Error cargando datos: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  // Cargar especificaciones del modelo seleccionado
  async function loadModeloEspecificaciones() {
    if (!selectedMarca || !selectedModelo) {
      setModeloEspecificaciones([]);
      return;
    }

    try {
      const response = await fetch(
        `/api/modelo-especificaciones?marca_id=${selectedMarca}&modelo_id=${selectedModelo}`,
        { cache: "no-store" }
      );

      if (!response.ok) {
        throw new Error(`Error: ${response.status}`);
      }

      const data = await response.json();
      setModeloEspecificaciones(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error cargando especificaciones:", error);
      toast.error("Error cargando especificaciones");
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadModeloEspecificaciones();
  }, [selectedMarca, selectedModelo]);

  // Descargar plantilla
  async function handleDownloadTemplate(type = "especificaciones") {
    try {
      const url = type === "especificaciones"
        ? "/api/especificaciones/import?action=template"
        : "/api/modelo-especificaciones/import?action=template";

      const response = await fetch(url);
      const blob = await response.blob();

      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = type === "especificaciones"
        ? "plantilla-especificaciones.xlsx"
        : "plantilla-especificaciones-modelo.xlsx";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

      toast.success("Plantilla descargada");
    } catch (e) {
      console.error(e);
      toast.error("Error descargando plantilla");
    }
  }

  // Importar especificaciones
  async function handleImport() {
    if (!importFile) {
      toast.error("Selecciona un archivo");
      return;
    }

    try {
      setImporting(true);

      const formDataImport = new FormData();
      formDataImport.append("file", importFile);

      const url = importType === "especificaciones"
        ? "/api/especificaciones/import"
        : "/api/modelo-especificaciones/import";

      const response = await fetch(url, {
        method: "POST",
        body: formDataImport,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(`${data.success} ${importType} importadas`);
        if (data.errors > 0) {
          toast.error(`${data.errors} errores durante la importación`);

          if (data.details && data.details.length > 0) {
            console.log("Errores de importación:", data.details);
          }
        }
        setImportFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        setImportDialog(false);
        loadData();
        loadModeloEspecificaciones();
      } else {
        toast.error(data.message);
      }
    } catch (e) {
      console.error(e);
      toast.error("Error importando archivo");
    } finally {
      setImporting(false);
    }
  }

  // Especificaciones Generales
  function openCreateEspec() {
    setEditingEspec(null);
    setFormData({
      nombre: "",
      tipo_dato: "texto",
      opciones: [],
    });
    setNuevoOpcion("");
    setDialogOpen(true);
  }

  function openEditEspec(espec) {
    setEditingEspec(espec);
    setFormData({
      nombre: espec.nombre,
      tipo_dato: espec.tipo_dato,
      opciones: espec.opciones || [],
    });
    setNuevoOpcion("");
    setDialogOpen(true);
  }

  async function saveEspec() {
    if (!formData.nombre.trim()) {
      return toast.warning("Ingresa el nombre");
    }

    if (formData.tipo_dato === "lista" && formData.opciones.length === 0) {
      return toast.warning("Agrega al menos una opción para listas");
    }

    setSavingEspec(true);

    try {
      const url = editingEspec
        ? `/api/especificaciones/${editingEspec.id}`
        : "/api/especificaciones";

      const method = editingEspec ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          tipo_dato: formData.tipo_dato,
          opciones: formData.tipo_dato === "lista" ? formData.opciones : [],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error guardando");
      }

      toast.success(editingEspec ? "Actualizado" : "Creado");
      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Error guardando especificación:", error);
      toast.error("Error: " + error.message);
    } finally {
      setSavingEspec(false);
    }
  }

  function agregarOpcion() {
    if (!nuevoOpcion.trim()) {
      return toast.warning("Ingresa la opción");
    }
    if (formData.opciones.includes(nuevoOpcion)) {
      return toast.warning("Esta opción ya existe");
    }

    setFormData((prev) => ({
      ...prev,
      opciones: [...prev.opciones, nuevoOpcion.trim()],
    }));
    setNuevoOpcion("");
  }

  function eliminarOpcion(index) {
    setFormData((prev) => ({
      ...prev,
      opciones: prev.opciones.filter((_, i) => i !== index),
    }));
  }

  function openDeleteEspec(espec) {
    setDeleteTarget(espec);
    setDeleteDialog(true);
  }

  async function confirmDeleteEspec() {
    try {
      const response = await fetch(`/api/especificaciones/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error eliminando");
      }

      toast.success("Eliminado");
      setDeleteDialog(false);
      loadData();
    } catch (error) {
      console.error("Error eliminando:", error);
      toast.error("Error: " + error.message);
    }
  }

  // Especificaciones por Modelo
  function openAddModeloEspecificacion() {
    setModeloEspecFormData({
      especificacion_id: "",
      valor: "",
    });
    setDialogEspecOpen(true);
  }

  function renderInputValor(especificacion) {
    switch (especificacion.tipo_dato) {
      case "texto":
        return (
          <input
            type="text"
            value={modeloEspecFormData.valor}
            onChange={(e) =>
              setModeloEspecFormData((prev) => ({
                ...prev,
                valor: e.target.value,
              }))
            }
            placeholder="Ingresa el texto"
            className="w-full p-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case "numero":
        return (
          <input
            type="number"
            value={modeloEspecFormData.valor}
            onChange={(e) =>
              setModeloEspecFormData((prev) => ({
                ...prev,
                valor: e.target.value,
              }))
            }
            placeholder="Ingresa un número"
            className="w-full p-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case "booleano":
        return (
          <div className="flex gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="booleano"
                value="true"
                checked={modeloEspecFormData.valor === "true"}
                onChange={(e) =>
                  setModeloEspecFormData((prev) => ({
                    ...prev,
                    valor: e.target.value,
                  }))
                }
              />
              <span className="text-sm">Sí</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="booleano"
                value="false"
                checked={modeloEspecFormData.valor === "false"}
                onChange={(e) =>
                  setModeloEspecFormData((prev) => ({
                    ...prev,
                    valor: e.target.value,
                  }))
                }
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        );

      case "lista":
        return (
          <Select
            value={modeloEspecFormData.valor}
            onValueChange={(value) =>
              setModeloEspecFormData((prev) => ({
                ...prev,
                valor: value,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecciona una opción" />
            </SelectTrigger>
            <SelectContent>
              {especificacion.opciones?.map((opcion, idx) => (
                <SelectItem key={idx} value={opcion}>
                  {opcion}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      default:
        return null;
    }
  }

  async function addModeloEspecificacion() {
    if (!selectedMarca || !selectedModelo || !modeloEspecFormData.especificacion_id) {
      return toast.warning("Completa todos los campos");
    }

    if (!modeloEspecFormData.valor && modeloEspecFormData.valor !== "false") {
      return toast.warning("Ingresa un valor");
    }

    try {
      const response = await fetch("/api/modelo-especificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marca_id: parseInt(selectedMarca),
          modelo_id: parseInt(selectedModelo),
          especificacion_id: parseInt(modeloEspecFormData.especificacion_id),
          valor: modeloEspecFormData.valor,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error agregando");
      }

      toast.success("Especificación agregada");
      setModeloEspecFormData({
        especificacion_id: "",
        valor: "",
      });
      setDialogEspecOpen(false);
      loadModeloEspecificaciones();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error: " + error.message);
    }
  }

  function openEditModeloEspecificacion(me) {
    setEditingModeloEspec(me);
    setModeloEspecFormData({
      especificacion_id: me.especificacion_id,
      valor: me.valor || "",
    });
    setDialogEditOpen(true);
  }

  async function updateModeloEspecificacion() {
    if (!modeloEspecFormData.valor && modeloEspecFormData.valor !== "false") {
      return toast.warning("Ingresa un valor");
    }

    try {
      const response = await fetch(
        `/api/modelo-especificaciones/${editingModeloEspec.id}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            valor: modeloEspecFormData.valor,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Error actualizando");
      }

      toast.success("Especificación actualizada");
      setDialogEditOpen(false);
      setEditingModeloEspec(null);
      loadModeloEspecificaciones();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error: " + error.message);
    }
  }

  async function deleteModeloEspecificacion(id) {
    try {
      const response = await fetch(`/api/modelo-especificaciones/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Error eliminando");
      }

      toast.success("Especificación eliminada");
      loadModeloEspecificaciones();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error: " + error.message);
    }
  }

  const toggleExpand = (id) =>
    setExpandedEspec((p) => ({ ...p, [id]: !p[id] }));

  const modelosFiltrados = selectedMarca
    ? modelos.filter((m) => m.marca_id === parseInt(selectedMarca))
    : [];

  const especificacionesDisponibles = especificaciones.filter(
    (e) =>
      !modeloEspecificaciones.some(
        (me) => me.especificacion_id === e.id
      )
  );

  const selectedEspec = especificaciones.find(
    (e) => e.id === parseInt(modeloEspecFormData.especificacion_id)
  );

  const selectedMarcaObj = marcas.find(m => m.id === parseInt(selectedMarca));
  const selectedModeloObj = modelos.find(m => m.id === parseInt(selectedModelo));

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Especificaciones Generales */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">Especificaciones Disponibles</h2>
          <div className="flex gap-2">
            <Button onClick={() => setImportDialog(true)} variant="outline">
              <Upload className="h-4 w-4 mr-2" /> Importar
            </Button>
            <Button onClick={() => handleDownloadTemplate("especificaciones")} variant="outline">
              <Download className="h-4 w-4 mr-2" /> Plantilla
            </Button>
            <Button onClick={openCreateEspec}>
              <Plus className="h-4 w-4 mr-2" /> Nueva
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {especificaciones.length === 0 ? (
                <p className="text-gray-500">No hay especificaciones</p>
              ) : (
                especificaciones.map((espec) => (
                  <div
                    key={espec.id}
                    className="flex justify-between items-center p-3 border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{espec.nombre}</p>
                      <p className="text-xs text-gray-600">{espec.tipo_dato}</p>
                      {espec.opciones && espec.opciones.length > 0 && (
                        <p className="text-xs text-gray-500">
                          {espec.opciones.length} opciones
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => openEditEspec(espec)}
                      >
                        <Pencil size={16} />
                      </Button>
                      <Button
                        size="icon"
                        variant="destructive"
                        onClick={() => openDeleteEspec(espec)}
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Especificaciones por Modelo */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold">
            Especificaciones por Modelo y Marca
          </h2>
          <Button 
            onClick={() => {
              setImportType("modelo");
              setImportDialog(true);
            }} 
            variant="outline"
          >
            <Upload className="h-4 w-4 mr-2" /> Importar Masivamente
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Selecciona Marca y Modelo</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Marca */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Marca
                </label>
                <Select value={selectedMarca} onValueChange={setSelectedMarca}>
                  <SelectTrigger>
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
              </div>

              {/* Modelo */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Modelo
                </label>
                <Select value={selectedModelo} onValueChange={setSelectedModelo}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelosFiltrados.map((m) => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {selectedMarca && selectedModelo && (
              <>
                <div className="border-t pt-4 space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold">
                      {selectedMarcaObj?.name} {selectedModeloObj?.name}
                    </h3>
                    <Button onClick={openAddModeloEspecificacion} size="sm">
                      <Plus className="h-4 w-4 mr-2" /> Agregar
                    </Button>
                  </div>

                  {modeloEspecificaciones.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4">
                      No hay especificaciones agregadas
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {modeloEspecificaciones.map((me) => (
                        <div key={me.id} className="border rounded-lg">
                          {/* Header */}
                          <div
                            className="flex justify-between items-center p-3 bg-gray-50 cursor-pointer hover:bg-gray-100"
                            onClick={() => toggleExpand(me.id)}
                          >
                            <div className="flex items-center gap-2 flex-1">
                              {expandedEspec[me.id] ? (
                                <ChevronUp size={18} />
                              ) : (
                                <ChevronDown size={18} />
                              )}
                              <div>
                                <p className="font-medium">
                                  {me.especificacion_nombre}
                                </p>
                                <p className="text-sm text-gray-600">{me.valor}</p>
                              </div>
                            </div>

                            <div
                              className="flex gap-2"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => openEditModeloEspecificacion(me)}
                              >
                                <Pencil size={16} />
                              </Button>
                              <Button
                                size="icon"
                                variant="destructive"
                                onClick={() =>
                                  deleteModeloEspecificacion(me.id)
                                }
                              >
                                <Trash2 size={16} />
                              </Button>
                            </div>
                          </div>

                          {/* Contenido Expandido */}
                          {expandedEspec[me.id] && (
                            <div className="p-3 bg-white border-t space-y-2">
                              <div className="bg-blue-50 p-2 rounded text-xs text-blue-700">
                                <strong>Tipo:</strong> {me.tipo_dato}
                              </div>
                              <div className="text-sm">
                                <p className="font-medium text-gray-700">Valor:</p>
                                <p className="text-gray-800">{me.valor}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* DIALOG IMPORT CON TABS */}
      <Dialog open={importDialog} onOpenChange={setImportDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Importar</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Tabs para tipo de importación */}
            <div className="flex gap-2 border-b">
              <button
                onClick={() => setImportType("especificaciones")}
                className={`px-4 py-2 font-medium text-sm ${
                  importType === "especificaciones"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Especificaciones
              </button>
              <button
                onClick={() => setImportType("modelo")}
                className={`px-4 py-2 font-medium text-sm ${
                  importType === "modelo"
                    ? "border-b-2 border-blue-600 text-blue-600"
                    : "text-gray-600 hover:text-gray-900"
                }`}
              >
                Por Modelo
              </button>
            </div>

            {/* Instrucciones según tipo */}
            <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
              <p className="font-semibold mb-2">Instrucciones:</p>
              {importType === "especificaciones" ? (
                <ul className="list-disc list-inside space-y-1">
                  <li>Columnas: nombre, tipo_dato, opciones</li>
                  <li>Para listas, separa opciones con |</li>
                  <li>Tipos válidos: texto, numero, booleano, lista</li>
                </ul>
              ) : (
                <ul className="list-disc list-inside space-y-1">
                  <li>Columnas: marca, modelo, especificacion, valor</li>
                  <li>Marca y modelo deben existir</li>
                  <li>Especificación debe estar creada</li>
                  <li>El valor depende del tipo de especificación</li>
                </ul>
              )}
            </div>

            <div>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                placeholder="Selecciona archivo Excel"
              />
            </div>

            {importFile && (
              <p className="text-sm text-gray-600">
                ✓ {importFile.name}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setImportDialog(false);
                setImportFile(null);
                if (fileInputRef.current) {
                  fileInputRef.current.value = "";
                }
              }}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => handleDownloadTemplate(importType)}
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" /> Plantilla
            </Button>
            <Button
              onClick={handleImport}
              disabled={!importFile || importing}
            >
              {importing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG ESPECIFICACIÓN */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingEspec ? "Editar Especificación" : "Nueva Especificación"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Nombre
              </label>
              <Input
                value={formData.nombre}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                }
                placeholder="Ej: Motor, Potencia, etc"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Tipo de Dato
              </label>
              <Select
                value={formData.tipo_dato}
                onValueChange={(value) =>
                  setFormData((prev) => ({
                    ...prev,
                    tipo_dato: value,
                    opciones: value !== "lista" ? [] : prev.opciones,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {tiposDatos.map((tipo) => (
                    <SelectItem key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Opciones (si es lista) */}
            {formData.tipo_dato === "lista" && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Opciones
                </label>
                <div className="space-y-2">
                  {formData.opciones.map((opcion, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-gray-50 p-2 rounded border"
                    >
                      <span className="text-sm">{opcion}</span>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        onClick={() => eliminarOpcion(idx)}
                      >
                        <X size={16} className="text-red-600" />
                      </Button>
                    </div>
                  ))}

                  <div className="flex gap-2">
                    <Input
                      value={nuevoOpcion}
                      onChange={(e) => setNuevoOpcion(e.target.value)}
                      placeholder="Nueva opción"
                      className="text-sm"
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          agregarOpcion();
                        }
                      }}
                    />
                    <Button
                      type="button"
                      onClick={agregarOpcion}
                      variant="outline"
                      size="sm"
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveEspec} disabled={savingEspec}>
              {savingEspec ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG MODELO ESPECIFICACIÓN - AGREGAR */}
      <Dialog open={dialogEspecOpen} onOpenChange={setDialogEspecOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Agregar Especificación a {selectedMarcaObj?.name}{" "}
              {selectedModeloObj?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Especificación
              </label>
              <Select
                value={modeloEspecFormData.especificacion_id}
                onValueChange={(value) =>
                  setModeloEspecFormData((prev) => ({
                    ...prev,
                    especificacion_id: value,
                    valor: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {especificacionesDisponibles.map((e) => (
                    <SelectItem key={e.id} value={e.id.toString()}>
                      {e.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedEspec && (
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">
                  Valor ({selectedEspec.tipo_dato})
                </label>
                {renderInputValor(selectedEspec)}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogEspecOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={addModeloEspecificacion}>Agregar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG MODELO ESPECIFICACIÓN - EDITAR */}
      <Dialog open={dialogEditOpen} onOpenChange={setDialogEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Editar {editingModeloEspec?.especificacion_nombre}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {editingModeloEspec && (
              <>
                <div className="bg-gray-50 p-3 rounded text-sm">
                  <p className="text-gray-600">
                    <strong>Especificación:</strong>{" "}
                    {editingModeloEspec.especificacion_nombre}
                  </p>
                  <p className="text-gray-600">
                    <strong>Tipo:</strong> {editingModeloEspec.tipo_dato}
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Valor
                  </label>
                  {renderInputValor(editingModeloEspec)}
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogEditOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={updateModeloEspecificacion}>Actualizar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>

          <p>
            ¿Eliminar la especificación <b>{deleteTarget?.nombre}</b>?
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteEspec}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}