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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  Settings,
  Zap,
  Database,
  Info,
  AlertCircle,
  ImageIcon,
  Video,
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
  const [importType, setImportType] = useState("especificaciones");
  const [savingEspec, setSavingEspec] = useState(false);
  const [importing, setImporting] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);

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
    { value: "media", label: "Imagen / Video" },
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

  async function handleMediaUpload(file) {
    setUploadingMedia(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("Error subiendo archivo");
      const data = await res.json();
      setModeloEspecFormData((prev) => ({ ...prev, valor: data.static_url }));
    } catch (e) {
      toast.error("Error subiendo archivo: " + e.message);
    } finally {
      setUploadingMedia(false);
    }
  }

  function renderMediaPreview(url) {
    if (!url) return null;
    const isVideo = /\.(mp4|webm|ogg|mov)$/i.test(url);
    return isVideo ? (
      <video
        src={url}
        controls
        className="mt-2 max-h-40 w-full rounded-md border border-slate-200 object-contain"
      />
    ) : (
      <img
        src={url}
        alt="preview"
        className="mt-2 max-h-40 w-full rounded-md border border-slate-200 object-contain"
      />
    );
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
            className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
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
            className="w-full p-2 border border-slate-300 rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
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

      case "media":
        return (
          <div className="space-y-2">
            {modeloEspecFormData.valor ? (
              <div className="space-y-2">
                {renderMediaPreview(modeloEspecFormData.valor)}
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-slate-300 text-xs"
                  onClick={() =>
                    setModeloEspecFormData((prev) => ({ ...prev, valor: "" }))
                  }
                >
                  Cambiar archivo
                </Button>
              </div>
            ) : (
              <div className="border-2 border-dashed border-slate-300 rounded-md p-4 text-center">
                {uploadingMedia ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                    <p className="text-xs text-slate-500">Subiendo...</p>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-center gap-2 mb-2">
                      <ImageIcon className="h-5 w-5 text-slate-400" />
                      <Video className="h-5 w-5 text-slate-400" />
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                      Selecciona una imagen o video
                    </p>
                    <input
                      type="file"
                      accept="image/*,video/*"
                      className="hidden"
                      id="media-upload-input"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleMediaUpload(file);
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="border-slate-300 text-xs"
                      onClick={() =>
                        document.getElementById("media-upload-input")?.click()
                      }
                    >
                      <Upload className="h-3.5 w-3.5 mr-1" />
                      Seleccionar archivo
                    </Button>
                  </>
                )}
              </div>
            )}
          </div>
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
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <div className="border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg">
                <Settings className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Especificaciones
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Gestiona atributos y características de vehículos
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ESPECIFICACIONES GENERALES */}
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <Database className="h-5 w-5 text-orange-600" />
              <h2 className="text-xl font-bold text-slate-900">
                Especificaciones Disponibles
              </h2>
            </div>

            <div className="flex flex-wrap gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => {
                      setImportType("especificaciones");
                      setImportDialog(true);
                    }}
                    variant="outline"
                    className="gap-2 border-slate-300"
                  >
                    <Upload className="h-4 w-4" />
                    Importar
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Importar especificaciones desde archivo</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => handleDownloadTemplate("especificaciones")}
                    variant="outline"
                    className="gap-2 border-slate-300"
                  >
                    <Download className="h-4 w-4" />
                    Plantilla
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Descargar plantilla Excel</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={openCreateEspec}
                    className="gap-2 bg-orange-600 hover:bg-orange-700"
                  >
                    <Plus className="h-4 w-4" />
                    Nueva
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Crear nueva especificación</TooltipContent>
              </Tooltip>
            </div>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="pt-6">
              {especificaciones.length === 0 ? (
                <div className="text-center py-8 space-y-2">
                  <Database className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-slate-500">No hay especificaciones creadas</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {especificaciones.map((espec) => (
                    <div
                      key={espec.id}
                      className="border-2 border-slate-200 rounded-lg p-4 hover:border-orange-300 hover:shadow-md transition-all"
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {espec.nombre}
                          </p>
                          <Badge variant="secondary" className="text-xs mt-1">
                            {espec.tipo_dato}
                          </Badge>
                        </div>
                      </div>

                      {espec.opciones && espec.opciones.length > 0 && (
                        <p className="text-xs text-slate-600 mt-2">
                          {espec.opciones.length} opciones
                        </p>
                      )}

                      <div className="flex gap-1 mt-3">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditEspec(espec)}
                              className="flex-1 border-slate-300 hover:bg-amber-50 hover:border-amber-300"
                            >
                              <Pencil size={14} className="text-amber-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar especificación</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDeleteEspec(espec)}
                              className="flex-1 border-slate-300 hover:bg-red-50 hover:border-red-300"
                            >
                              <Trash2 size={14} className="text-red-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar especificación</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ESPECIFICACIONES POR MODELO */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-600" />
            <h2 className="text-xl font-bold text-slate-900">
              Especificaciones por Modelo
            </h2>
          </div>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-4 border-b border-slate-100">
              <CardTitle className="text-lg">
                Selecciona Marca y Modelo
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Marca */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Marca
                    </label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>Selecciona la marca del vehículo</TooltipContent>
                    </Tooltip>
                  </div>
                  <Select value={selectedMarca} onValueChange={setSelectedMarca}>
                    <SelectTrigger className="border-slate-300 focus:border-orange-500">
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
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Modelo
                    </label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>Selecciona el modelo específico</TooltipContent>
                    </Tooltip>
                  </div>
                  <Select value={selectedModelo} onValueChange={setSelectedModelo}>
                    <SelectTrigger className="border-slate-300 focus:border-orange-500">
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
                  <div className="border-t border-slate-200 pt-4 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="font-semibold text-slate-900">
                        {selectedMarcaObj?.name} {selectedModeloObj?.name}
                      </h3>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={openAddModeloEspecificacion}
                            size="sm"
                            className="gap-2 bg-orange-600 hover:bg-orange-700"
                          >
                            <Plus className="h-4 w-4" />
                            Agregar
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          Agregar especificación a este modelo
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {modeloEspecificaciones.length === 0 ? (
                      <div className="text-center py-8 space-y-2">
                        <Zap className="h-8 w-8 text-slate-300 mx-auto" />
                        <p className="text-slate-500">
                          No hay especificaciones agregadas
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {modeloEspecificaciones.map((me) => (
                          <div
                            key={me.id}
                            className="border-2 border-slate-200 rounded-lg overflow-hidden hover:border-orange-300 transition-all"
                          >
                            {/* Header */}
                            <div
                              className="flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                              onClick={() => toggleExpand(me.id)}
                            >
                              <div className="flex items-center gap-3 flex-1">
                                {expandedEspec[me.id] ? (
                                  <ChevronUp className="h-5 w-5 text-slate-600" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-slate-600" />
                                )}
                                <div>
                                  <p className="font-semibold text-slate-900">
                                    {me.especificacion_nombre}
                                  </p>
                                  {me.tipo_dato === "media" ? (
                                    <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1">
                                      {/\.(mp4|webm|ogg|mov)$/i.test(me.valor || "") ? (
                                        <><Video className="h-3.5 w-3.5" /> Video</>
                                      ) : (
                                        <><ImageIcon className="h-3.5 w-3.5" /> Imagen</>
                                      )}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-slate-600 mt-0.5">
                                      {me.valor}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div
                                className="flex gap-1"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => openEditModeloEspecificacion(me)}
                                      className="border-slate-300 hover:bg-amber-50 hover:border-amber-300"
                                    >
                                      <Pencil size={14} className="text-amber-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Editar valor</TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        deleteModeloEspecificacion(me.id)
                                      }
                                      className="border-slate-300 hover:bg-red-50 hover:border-red-300"
                                    >
                                      <Trash2 size={14} className="text-red-600" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>Eliminar especificación</TooltipContent>
                                </Tooltip>
                              </div>
                            </div>

                            {/* Contenido Expandido */}
                            {expandedEspec[me.id] && (
                              <div className="p-4 bg-white border-t border-slate-200 space-y-3">
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                  <div className="bg-blue-50 p-2 rounded border border-blue-200">
                                    <p className="text-blue-600 font-semibold">Tipo</p>
                                    <p className="text-blue-900 mt-1">
                                      {me.tipo_dato}
                                    </p>
                                  </div>
                                  <div className="bg-orange-50 p-2 rounded border border-orange-200">
                                    <p className="text-orange-600 font-semibold">
                                      Valor
                                    </p>
                                    {me.tipo_dato === "media" && me.valor ? (
                                      /\.(mp4|webm|ogg|mov)$/i.test(me.valor) ? (
                                        <video
                                          src={me.valor}
                                          controls
                                          className="mt-2 max-h-48 w-full rounded object-contain"
                                        />
                                      ) : (
                                        <img
                                          src={me.valor}
                                          alt={me.especificacion_nombre}
                                          className="mt-2 max-h-48 w-full rounded object-contain"
                                        />
                                      )
                                    ) : (
                                      <p className="text-orange-900 mt-1">
                                        {me.valor}
                                      </p>
                                    )}
                                  </div>
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

        {/* INFO BOX */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-semibold mb-1">Información:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>
                  Las especificaciones generales son atributos reutilizables
                </li>
                <li>
                  Asigna especificaciones a modelos específicos con valores
                </li>
                <li>
                  Utiliza la importación masiva para cargar datos en lote
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* DIALOG IMPORT */}
        <Dialog open={importDialog} onOpenChange={setImportDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-orange-600" />
                Importar {importType === "especificaciones" ? "Especificaciones" : "Datos"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Tabs */}
              <div className="flex gap-2 border-b border-slate-200">
                <button
                  onClick={() => setImportType("especificaciones")}
                  className={`px-4 py-2 font-medium text-sm border-b-2 ${
                    importType === "especificaciones"
                      ? "border-orange-600 text-orange-600"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Especificaciones
                </button>
                <button
                  onClick={() => setImportType("modelo")}
                  className={`px-4 py-2 font-medium text-sm border-b-2 ${
                    importType === "modelo"
                      ? "border-orange-600 text-orange-600"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  Por Modelo
                </button>
              </div>

              {/* Instrucciones */}
              <div className="bg-orange-50 p-3 rounded border border-orange-200">
                <div className="flex gap-2">
                  <AlertCircle className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                  <div className="text-xs text-orange-700">
                    <p className="font-semibold mb-1">Instrucciones:</p>
                    {importType === "especificaciones" ? (
                      <ul className="list-disc list-inside space-y-1">
                        <li>Columnas: nombre, tipo_dato, opciones</li>
                        <li>Para listas, separa opciones con |</li>
                        <li>Tipos: texto, numero, booleano, lista, media</li>
                      </ul>
                    ) : (
                      <ul className="list-disc list-inside space-y-1">
                        <li>Columnas: marca, modelo, especificacion, valor</li>
                        <li>Marca y modelo deben existir</li>
                        <li>El valor depende del tipo</li>
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {/* File Input */}
              <div>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  className="border-slate-300"
                />
              </div>

              {importFile && (
                <p className="text-sm text-green-600 flex items-center gap-1">
                  ✓ {importFile.name}
                </p>
              )}
            </div>

            <DialogFooter className="gap-2">
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
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Plantilla
              </Button>
              <Button
                onClick={handleImport}
                disabled={!importFile || importing}
                className="gap-2 bg-orange-600 hover:bg-orange-700"
              >
                {importing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Importando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    Importar
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG ESPECIFICACIÓN */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5 text-orange-600" />
                {editingEspec ? "Editar Especificación" : "Nueva Especificación"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Nombre
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Nombre descriptivo (ej: Motor, Potencia)
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  value={formData.nombre}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, nombre: e.target.value }))
                  }
                  placeholder="Ej: Potencia"
                  className="border-slate-300 focus:border-orange-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Tipo de Dato
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Formato del dato a almacenar
                    </TooltipContent>
                  </Tooltip>
                </div>
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
                  <SelectTrigger className="border-slate-300 focus:border-orange-500">
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

              {/* Opciones */}
              {formData.tipo_dato === "lista" && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Opciones
                    </label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Agrega las opciones disponibles
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {formData.opciones.map((opcion, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-200"
                      >
                        <span className="text-sm">{opcion}</span>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => eliminarOpcion(idx)}
                          className="h-6 w-6"
                        >
                          <X size={14} className="text-red-600" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <Input
                      value={nuevoOpcion}
                      onChange={(e) => setNuevoOpcion(e.target.value)}
                      placeholder="Nueva opción"
                      className="text-sm border-slate-300"
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
                      className="border-slate-300"
                    >
                      <Plus size={16} />
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={saveEspec}
                disabled={savingEspec}
                className="bg-orange-600 hover:bg-orange-700"
              >
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

        {/* DIALOG AGREGAR ESPECIFICACIÓN A MODELO */}
        <Dialog open={dialogEspecOpen} onOpenChange={setDialogEspecOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Agregar a {selectedMarcaObj?.name} {selectedModeloObj?.name}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">
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
                  <SelectTrigger className="border-slate-300">
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
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Valor ({selectedEspec.tipo_dato})
                  </label>
                  {renderInputValor(selectedEspec)}
                </div>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogEspecOpen(false)}
                className="border-slate-300"
              >
                Cancelar
              </Button>
              <Button
                onClick={addModeloEspecificacion}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Agregar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DIALOG EDITAR ESPECIFICACIÓN DEL MODELO */}
        <Dialog open={dialogEditOpen} onOpenChange={setDialogEditOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                Editar {editingModeloEspec?.especificacion_nombre}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {editingModeloEspec && (
                <>
                  <div className="bg-slate-50 p-3 rounded border border-slate-200 text-sm space-y-2">
                    <div>
                      <p className="text-slate-600 font-medium">Especificación</p>
                      <p className="text-slate-900 mt-1">
                        {editingModeloEspec.especificacion_nombre}
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600 font-medium">Tipo</p>
                      <p className="text-slate-900 mt-1">
                        {editingModeloEspec.tipo_dato}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Nuevo Valor
                    </label>
                    {renderInputValor(editingModeloEspec)}
                  </div>
                </>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogEditOpen(false)}
                className="border-slate-300"
              >
                Cancelar
              </Button>
              <Button
                onClick={updateModeloEspecificacion}
                className="bg-orange-600 hover:bg-orange-700"
              >
                Actualizar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DELETE DIALOG */}
        <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-red-600" />
                Confirmar eliminación
              </DialogTitle>
            </DialogHeader>

            <p className="text-slate-600">
              ¿Eliminar la especificación{" "}
              <span className="font-semibold text-slate-900">
                {deleteTarget?.nombre}
              </span>
              ?
            </p>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialog(false)}
                className="border-slate-300"
              >
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={confirmDeleteEspec}
              >
                Eliminar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}