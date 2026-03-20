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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

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
      orden: preguntas.length > 0 ? Math.max(...preguntas.map(p => p.orden)) + 1 : 0,
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
        toast.success(editingPregunta ? "Pregunta actualizada" : "Pregunta creada");
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Preguntas de Atención</h2>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nueva Pregunta
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Lista de Preguntas ({preguntas.length})
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-2 min-h-64">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            </div>
          ) : preguntas.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No hay preguntas configuradas
            </div>
          ) : (
            preguntas.map((p) => (
              <div key={p.id} className="border rounded-md">
                {/* HEADER */}
                <div className="flex justify-between items-center p-3 bg-muted">
                  <div
                    className="flex items-center gap-2 cursor-pointer flex-1"
                    onClick={() => toggleExpand(p.id)}
                  >
                    {expanded[p.id] ? (
                      <ChevronDown size={18} />
                    ) : (
                      <ChevronRight size={18} />
                    )}
                    <span className="font-medium">{p.pregunta}</span>
                    <div className="ml-auto flex gap-2 items-center text-xs">
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                        {p.tipo_respuesta}
                      </span>
                      {p.es_obligatoria && (
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded">
                          Obligatoria
                        </span>
                      )}
                      {!p.es_activa && (
                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          Inactiva
                        </span>
                      )}
                    </div>
                  </div>

                  <div
                    className="flex gap-2 ml-2"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => openEdit(p)}
                    >
                      <Pencil size={16} />
                    </Button>

                    <Button
                      size="icon"
                      variant="destructive"
                      onClick={() => openDelete(p)}
                    >
                      <Trash2 size={16} />
                    </Button>
                  </div>
                </div>

                {/* DETALLES */}
                {expanded[p.id] && (
                  <div className="p-3 space-y-3 border-t bg-gray-50">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Pregunta</p>
                      <p className="text-sm">{p.pregunta}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <p className="font-medium text-gray-600">Tipo</p>
                        <p>{p.tipo_respuesta}</p>
                      </div>
                      <div>
                        <p className="font-medium text-gray-600">Orden</p>
                        <p>{p.orden}</p>
                      </div>
                    </div>

                    {p.opciones && p.opciones.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-gray-600 mb-2">
                          Opciones
                        </p>
                        <div className="space-y-1">
                          {p.opciones.map((opcion, idx) => (
                            <div
                              key={idx}
                              className="text-sm bg-white px-2 py-1 rounded border"
                            >
                              • {opcion}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex gap-4 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Obligatoria:</span>
                        <span className="font-medium">
                          {p.es_obligatoria ? "Sí" : "No"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-600">Activa:</span>
                        <span className="font-medium">
                          {p.es_activa ? "Sí" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* DIALOG PREGUNTA */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPregunta ? "Editar Pregunta" : "Nueva Pregunta"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Pregunta */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Pregunta *
              </label>
              <textarea
                name="pregunta"
                value={formData.pregunta}
                onChange={handleInputChange}
                placeholder="Ingresa la pregunta"
                className="w-full mt-1 p-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                rows="3"
              />
            </div>

            {/* Tipo de Respuesta */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Tipo de Respuesta
              </label>
              <select
                name="tipo_respuesta"
                value={formData.tipo_respuesta}
                onChange={handleInputChange}
                className="w-full mt-1 p-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
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
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Opciones
                </label>
                <div className="space-y-2 mt-1">
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
                        <Trash2 size={16} className="text-red-600" />
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

            {/* Orden */}
            <div>
              <label className="text-sm font-medium text-gray-700">Orden</label>
              <Input
                type="number"
                name="orden"
                value={formData.orden}
                onChange={handleInputChange}
                className="text-sm"
              />
            </div>

            {/* Switches */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                <span className="text-sm font-medium">Obligatoria</span>
                <Switch
                  checked={formData.es_obligatoria}
                  onCheckedChange={(value) =>
                    handleSwitchChange("es_obligatoria", value)
                  }
                />
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 rounded border">
                <span className="text-sm font-medium">Activa</span>
                <Switch
                  checked={formData.es_activa}
                  onCheckedChange={(value) =>
                    handleSwitchChange("es_activa", value)
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={savePregunta}>Guardar</Button>
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
            ¿Eliminar la pregunta <b>{deleteTarget?.pregunta}</b>?
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}