"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Loader2,
  MessageSquare,
  Info,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

export default function PreguntasAtenciónTab() {
  const [preguntas, setPreguntas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [editingPregunta, setEditingPregunta] = useState(null);

  const [formData, setFormData] = useState({
    pregunta: "",
    tipo_respuesta: "texto",
    opciones: [],
    es_obligatoria: true,
    orden: 0,
    es_activa: true,
  });

  const [nuevoOpcion, setNuevoOpcion] = useState("");

  const tiposRespuesta = [
    { value: "texto", label: "Texto" },
    { value: "numero", label: "Número" },
    { value: "si_no", label: "Sí/No" },
    { value: "opcion_multiple", label: "Opción Múltiple" },
    { value: "fecha", label: "Fecha" },
    { value: "hora", label: "Hora" },
  ];

  // ================= LOAD =================
  async function load() {
    setLoading(true);
    try {
      console.log("Cargando preguntas...");

      const response = await fetch("/api/preguntas-atencion", {
        method: "GET",
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
        },
      });

      console.log("Response status:", response.status);

      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Datos recibidos:", data);

      setPreguntas(Array.isArray(data) ? data : []);

      if (Array.isArray(data) && data.length === 0) {
        toast.info("No hay preguntas configuradas");
      }
    } catch (error) {
      console.error("Error cargando preguntas:", error);
      toast.error(`Error cargando preguntas: ${error.message}`);
      setPreguntas([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const toggleExpand = (id) =>
    setExpanded((p) => ({ ...p, [id]: !p[id] }));

  // ================= CRUD =================
  function openCreate() {
    setEditingPregunta(null);
    setFormData({
      pregunta: "",
      tipo_respuesta: "texto",
      opciones: [],
      es_obligatoria: true,
      orden:
        preguntas.length > 0 ? Math.max(...preguntas.map((p) => p.orden)) + 1 : 0,
      es_activa: true,
    });
    setNuevoOpcion("");
    setDialogOpen(true);
  }

  function openEdit(pregunta) {
    setEditingPregunta(pregunta);
    setFormData({
      pregunta: pregunta.pregunta,
      tipo_respuesta: pregunta.tipo_respuesta,
      opciones: pregunta.opciones || [],
      es_obligatoria: pregunta.es_obligatoria,
      orden: pregunta.orden,
      es_activa: pregunta.es_activa,
    });
    setNuevoOpcion("");
    setDialogOpen(true);
  }

  async function savePregunta() {
    if (!formData.pregunta.trim()) {
      return toast.warning("Ingresa la pregunta");
    }

    if (
      formData.tipo_respuesta === "opcion_multiple" &&
      formData.opciones.length === 0
    ) {
      return toast.warning("Agrega al menos una opción");
    }

    try {
      const url = editingPregunta
        ? `/api/preguntas-atencion/${editingPregunta.id}`
        : "/api/preguntas-atencion";

      const method = editingPregunta ? "PUT" : "POST";

      console.log(`${method} ${url}`, formData);

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(
          editingPregunta ? "Pregunta actualizada" : "Pregunta creada"
        );
        setDialogOpen(false);
        load();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Error guardando pregunta");
      }
    } catch (error) {
      console.error("Error guardando pregunta:", error);
      toast.error("Error guardando pregunta");
    }
  }

  // ================= OPCIONES =================
  function agregarOpcion() {
    if (!nuevoOpcion.trim()) return toast.warning("Ingresa la opción");

    if (formData.opciones.includes(nuevoOpcion)) {
      return toast.warning("Esta opción ya existe");
    }

    setFormData((prev) => ({
      ...prev,
      opciones: [...prev.opciones, nuevoOpcion],
    }));
    setNuevoOpcion("");
  }

  function eliminarOpcion(index) {
    setFormData((prev) => ({
      ...prev,
      opciones: prev.opciones.filter((_, i) => i !== index),
    }));
  }

  // ================= DELETE =================
  function openDelete(pregunta) {
    setDeleteTarget(pregunta);
    setDeleteDialog(true);
  }

  async function confirmDelete() {
    try {
      const response = await fetch(
        `/api/preguntas-atencion/${deleteTarget.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Pregunta eliminada");
        setDeleteDialog(false);
        load();
      } else {
        const data = await response.json();
        toast.error(data.message || "Error eliminando pregunta");
      }
    } catch (error) {
      console.error("Error eliminando pregunta:", error);
      toast.error("Error eliminando pregunta");
    }
  }

  // ================= HANDLE CHANGE =================
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "orden" ? parseInt(value) || 0 : value,
    }));
  };

  const handleSwitchChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  // ================= UI =================
  return (
    <TooltipProvider>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <div className="border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg">
                <MessageSquare className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Preguntas de Atención
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Configura las preguntas que se mostrarán en los formularios
                </p>
              </div>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={openCreate}
                  className="gap-2 bg-purple-600 hover:bg-purple-700"
                >
                  <Plus className="h-4 w-4" />
                  Nueva Pregunta
                </Button>
              </TooltipTrigger>
              <TooltipContent>Crear una nueva pregunta</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">
                    Total de Preguntas
                  </p>
                  <p className="text-3xl font-bold text-purple-900 mt-2">
                    {preguntas.length}
                  </p>
                </div>
                <MessageSquare className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    Activas
                  </p>
                  <p className="text-3xl font-bold text-green-900 mt-2">
                    {preguntas.filter((p) => p.es_activa).length}
                  </p>
                </div>
                <CheckCircle2 className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-red-600 font-medium">
                    Obligatorias
                  </p>
                  <p className="text-3xl font-bold text-red-900 mt-2">
                    {preguntas.filter((p) => p.es_obligatoria).length}
                  </p>
                </div>
                <AlertCircle className="h-12 w-12 text-red-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* LISTA DE PREGUNTAS */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                Listado de Preguntas
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {preguntas.length} preguntas
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
              </div>
            ) : preguntas.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="p-3 bg-slate-100 rounded-lg">
                  <MessageSquare className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500 font-medium">
                  No hay preguntas configuradas
                </p>
                <p className="text-xs text-slate-400">
                  Crea la primera pregunta para comenzar
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {preguntas
                  .sort((a, b) => a.orden - b.orden)
                  .map((p) => (
                    <div
                      key={p.id}
                      className={`border-2 rounded-lg overflow-hidden transition-all ${
                        expanded[p.id]
                          ? "border-purple-300 bg-purple-50"
                          : "border-slate-200 bg-white hover:border-purple-200"
                      }`}
                    >
                      {/* HEADER */}
                      <div
                        className="flex justify-between items-center p-4 cursor-pointer hover:bg-slate-50 transition-colors"
                        onClick={() => toggleExpand(p.id)}
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {expanded[p.id] ? (
                            <ChevronDown className="h-5 w-5 text-purple-600 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 truncate">
                              #{p.orden} - {p.pregunta}
                            </p>
                            <div className="flex gap-2 mt-1.5 flex-wrap">
                              <Badge
                                variant="secondary"
                                className="text-xs"
                              >
                                {tiposRespuesta.find(
                                  (t) => t.value === p.tipo_respuesta
                                )?.label || p.tipo_respuesta}
                              </Badge>

                              {p.es_obligatoria && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      className="text-xs bg-red-100 text-red-700 border border-red-300 cursor-help"
                                    >
                                      Obligatoria
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Este campo debe ser completado
                                  </TooltipContent>
                                </Tooltip>
                              )}

                              {!p.es_activa && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Badge
                                      className="text-xs bg-slate-200 text-slate-700 border border-slate-300 cursor-help"
                                    >
                                      Inactiva
                                    </Badge>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Esta pregunta no se mostrará
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        </div>

                        <div
                          className="flex gap-1 flex-shrink-0 ml-2"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openEdit(p)}
                                className="border-slate-300 hover:bg-amber-50 hover:border-amber-300"
                              >
                                <Pencil size={16} className="text-amber-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Editar pregunta</TooltipContent>
                          </Tooltip>

                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openDelete(p)}
                                className="border-slate-300 hover:bg-red-50 hover:border-red-300"
                              >
                                <Trash2 size={16} className="text-red-600" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Eliminar pregunta</TooltipContent>
                          </Tooltip>
                        </div>
                      </div>

                      {/* DETALLES EXPANDIDOS */}
                      {expanded[p.id] && (
                        <div className="p-4 bg-white border-t border-slate-200 space-y-4">
                          <div>
                            <p className="text-xs font-semibold text-slate-600 uppercase mb-1">
                              Pregunta Completa
                            </p>
                            <p className="text-sm text-slate-900">
                              {p.pregunta}
                            </p>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="bg-blue-50 p-2 rounded border border-blue-200">
                              <p className="text-blue-600 font-semibold">Tipo</p>
                              <p className="text-blue-900 mt-1">
                                {tiposRespuesta.find(
                                  (t) => t.value === p.tipo_respuesta
                                )?.label || p.tipo_respuesta}
                              </p>
                            </div>

                            <div className="bg-purple-50 p-2 rounded border border-purple-200">
                              <p className="text-purple-600 font-semibold">
                                Orden
                              </p>
                              <p className="text-purple-900 mt-1">#{p.orden}</p>
                            </div>

                            <div className="bg-slate-50 p-2 rounded border border-slate-200">
                              <p className="text-slate-600 font-semibold">
                                Estado
                              </p>
                              <p className="text-slate-900 mt-1">
                                {p.es_activa ? "Activa" : "Inactiva"}
                              </p>
                            </div>
                          </div>

                          {p.opciones && p.opciones.length > 0 && (
                            <div>
                              <p className="text-xs font-semibold text-slate-600 uppercase mb-2">
                                Opciones Disponibles
                              </p>
                              <div className="space-y-1">
                                {p.opciones.map((opcion, idx) => (
                                  <div
                                    key={idx}
                                    className="text-sm bg-slate-50 px-3 py-2 rounded border border-slate-200 flex items-center gap-2"
                                  >
                                    <span className="text-slate-400">
                                      {idx + 1}.
                                    </span>
                                    <span className="text-slate-900">
                                      {opcion}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-600">
                                Obligatoria:
                              </span>
                              <Badge
                                className={`text-xs ${
                                  p.es_obligatoria
                                    ? "bg-red-100 text-red-700"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {p.es_obligatoria ? "Sí" : "No"}
                              </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-semibold text-slate-600">
                                Activa:
                              </span>
                              <Badge
                                className={`text-xs ${
                                  p.es_activa
                                    ? "bg-green-100 text-green-700"
                                    : "bg-slate-100 text-slate-700"
                                }`}
                              >
                                {p.es_activa ? "Sí" : "No"}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* INFO BOX */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-semibold mb-1">Información:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Las preguntas se mostrarán en orden ascendente</li>
                <li>
                  Las preguntas obligatorias deben ser completadas en los
                  formularios
                </li>
                <li>Las preguntas inactivas no aparecerán en los formularios</li>
              </ul>
            </div>
          </div>
        </div>

        {/* DIALOG PREGUNTA */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-purple-600" />
                {editingPregunta ? "Editar Pregunta" : "Nueva Pregunta"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* Pregunta */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Pregunta
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Redacta la pregunta que se mostrará al usuario
                    </TooltipContent>
                  </Tooltip>
                </div>
                <textarea
                  name="pregunta"
                  value={formData.pregunta}
                  onChange={handleInputChange}
                  placeholder="Ingresa la pregunta"
                  className="w-full p-3 border border-slate-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500"
                  rows="3"
                />
              </div>

              {/* Tipo de Respuesta */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Tipo de Respuesta
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Selecciona el formato de respuesta esperado
                    </TooltipContent>
                  </Tooltip>
                </div>
                <select
                  name="tipo_respuesta"
                  value={formData.tipo_respuesta}
                  onChange={handleInputChange}
                  className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-purple-500 focus:border-purple-500"
                >
                  {tiposRespuesta.map((tipo) => (
                    <option key={tipo.value} value={tipo.value}>
                      {tipo.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Opciones (si es opción múltiple) */}
              {formData.tipo_respuesta === "opcion_multiple" && (
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
                        Añade las opciones disponibles
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {formData.opciones.map((opcion, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-slate-50 p-3 rounded border border-slate-200"
                      >
                        <span className="text-sm text-slate-900">
                          {idx + 1}. {opcion}
                        </span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              size="icon"
                              variant="ghost"
                              onClick={() => eliminarOpcion(idx)}
                              className="h-8 w-8"
                            >
                              <Trash2 size={16} className="text-red-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar opción</TooltipContent>
                        </Tooltip>
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
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          onClick={agregarOpcion}
                          variant="outline"
                          size="sm"
                          className="border-slate-300"
                        >
                          <Plus size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Agregar opción (Enter)</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )}

              {/* Orden */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Orden
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Posición en la que aparecerá la pregunta
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  type="number"
                  name="orden"
                  value={formData.orden}
                  onChange={handleInputChange}
                  className="text-sm border-slate-300"
                />
              </div>

              {/* Switches */}
              <div className="space-y-3 pt-4 border-t border-slate-200">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200 cursor-help">
                      <span className="text-sm font-semibold text-slate-700">
                        Obligatoria
                      </span>
                      <Switch
                        checked={formData.es_obligatoria}
                        onCheckedChange={(value) =>
                          handleSwitchChange("es_obligatoria", value)
                        }
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Indica si este campo debe ser completado obligatoriamente
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center justify-between p-3 bg-slate-50 rounded border border-slate-200 cursor-help">
                      <span className="text-sm font-semibold text-slate-700">
                        Activa
                      </span>
                      <Switch
                        checked={formData.es_activa}
                        onCheckedChange={(value) =>
                          handleSwitchChange("es_activa", value)
                        }
                      />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    Si está desactivada, la pregunta no aparecerá
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                className="border-slate-300"
              >
                Cancelar
              </Button>
              <Button
                onClick={savePregunta}
                className="bg-purple-600 hover:bg-purple-700"
              >
                Guardar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DELETE DIALOG */}
        <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-red-100 p-4 rounded-full">
                <AlertCircle className="h-6 w-6 text-red-600" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  ¿Eliminar pregunta?
                </h3>

                <p className="text-sm text-slate-600 mt-2">
                  Se eliminará permanentemente:
                </p>

                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-semibold text-red-900">
                    {deleteTarget?.pregunta}
                  </p>
                </div>

                <p className="text-xs text-slate-500 mt-3 font-medium">
                  ⚠️ Esta acción no se puede deshacer
                </p>
              </div>

              <div className="flex gap-3 w-full pt-4">
                <Button
                  variant="outline"
                  onClick={() => setDeleteDialog(false)}
                  className="flex-1 border-slate-300"
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  onClick={confirmDelete}
                  className="flex-1"
                >
                  Eliminar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}