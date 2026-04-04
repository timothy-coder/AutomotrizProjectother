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
import { Card, CardContent } from "@/components/ui/card";
import {
  Pencil,
  Trash2,
  Plus,
  Loader2,
  ChevronDown,
  ChevronUp,
  FileText,
  Info,
  AlertCircle,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

export default function CierresDetalleTab() {
  const [detalles, setDetalles] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [savingDetalle, setSavingDetalle] = useState(false);

  const [editingDetalle, setEditingDetalle] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [expandedDetalle, setExpandedDetalle] = useState({});

  const [formData, setFormData] = useState({
    detalle: "",
  });

  // Cargar datos
  async function loadData() {
    setLoading(true);
    try {
      const response = await fetch("/api/cierres-detalles", { cache: "no-store" });
      
      if (!response.ok) throw new Error(`Error: ${response.status}`);
      
      const data = await response.json();
      setDetalles(Array.isArray(data.data) ? data.data : []);
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast.error("Error cargando datos: " + error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Crear/Editar
  function openCreateDetalle() {
    setEditingDetalle(null);
    setFormData({
      detalle: "",
    });
    setDialogOpen(true);
  }

  function openEditDetalle(detalle) {
    setEditingDetalle(detalle);
    setFormData({
      detalle: detalle.detalle,
    });
    setDialogOpen(true);
  }

  async function saveDetalle() {
    if (!formData.detalle.trim()) {
      return toast.warning("Ingresa el detalle");
    }

    setSavingDetalle(true);

    try {
      const url = editingDetalle
        ? `/api/cierres-detalles/${editingDetalle.id}`
        : "/api/cierres-detalles";

      const method = editingDetalle ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          detalle: formData.detalle.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error guardando");
      }

      toast.success(editingDetalle ? "Actualizado" : "Creado");
      setDialogOpen(false);
      loadData();
    } catch (error) {
      console.error("Error guardando detalle:", error);
      toast.error("Error: " + error.message);
    } finally {
      setSavingDetalle(false);
    }
  }

  function openDeleteDetalle(detalle) {
    setDeleteTarget(detalle);
    setDeleteDialog(true);
  }

  async function confirmDeleteDetalle() {
    try {
      const response = await fetch(`/api/cierres-detalles/${deleteTarget.id}`, {
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

  const toggleExpand = (id) =>
    setExpandedDetalle((p) => ({ ...p, [id]: !p[id] }));

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Detalles de Cierre
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Gestiona los detalles y notas de cierres de período
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* ACCIONES */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Detalles Registrados
          </h2>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={openCreateDetalle}
                className="gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4" />
                Nuevo
              </Button>
            </TooltipTrigger>
            <TooltipContent>Crear nuevo detalle</TooltipContent>
          </Tooltip>
        </div>

        {/* CONTENIDO */}
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="pt-6">
            {detalles.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <FileText className="h-12 w-12 text-slate-300 mx-auto" />
                <p className="text-slate-500 font-medium">
                  No hay detalles de cierre creados
                </p>
                <p className="text-xs text-slate-400">
                  Crea el primero haciendo clic en "Nuevo"
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {detalles.map((detalle) => (
                  <div
                    key={detalle.id}
                    className="border-2 border-slate-200 rounded-lg overflow-hidden hover:border-blue-300 transition-all"
                  >
                    {/* Header */}
                    <div
                      className="flex justify-between items-center p-4 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors"
                      onClick={() => toggleExpand(detalle.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {expandedDetalle[detalle.id] ? (
                          <ChevronUp className="h-5 w-5 text-slate-600 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="h-5 w-5 text-slate-600 flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-900 line-clamp-1">
                            {detalle.detalle}
                          </p>
                          <p className="text-xs text-slate-500 mt-1">
                            Creado: {formatDate(detalle.created_at)}
                          </p>
                        </div>
                      </div>

                      <div
                        className="flex gap-1 ml-2 flex-shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openEditDetalle(detalle)}
                              className="border-slate-300 hover:bg-amber-50 hover:border-amber-300"
                            >
                              <Pencil size={14} className="text-amber-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Editar detalle</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openDeleteDetalle(detalle)}
                              className="border-slate-300 hover:bg-red-50 hover:border-red-300"
                            >
                              <Trash2 size={14} className="text-red-600" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Eliminar detalle</TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Contenido Expandido */}
                    {expandedDetalle[detalle.id] && (
                      <div className="p-4 bg-white border-t border-slate-200 space-y-3">
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                          <p className="text-xs text-blue-600 font-semibold mb-2">
                            Contenido
                          </p>
                          <p className="text-sm text-blue-900 whitespace-pre-wrap">
                            {detalle.detalle}
                          </p>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="bg-slate-50 p-2 rounded border border-slate-200">
                            <p className="text-slate-600 font-semibold">ID</p>
                            <p className="text-slate-900 mt-1">{detalle.id}</p>
                          </div>
                          <div className="bg-slate-50 p-2 rounded border border-slate-200">
                            <p className="text-slate-600 font-semibold">
                              Actualizado
                            </p>
                            <p className="text-slate-900 mt-1">
                              {formatDate(detalle.updated_at)}
                            </p>
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
                <li>Los detalles de cierre son notas descriptivas</li>
                <li>Puedes crear, editar y eliminar detalles</li>
                <li>Haz clic para expandir y ver el contenido completo</li>
              </ul>
            </div>
          </div>
        </div>

        {/* DIALOG CREAR/EDITAR */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                {editingDetalle ? "Editar Detalle" : "Nuevo Detalle"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Detalle
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Descripción del detalle de cierre
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Textarea
                  value={formData.detalle}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, detalle: e.target.value }))
                  }
                  placeholder="Ingresa la descripción del detalle..."
                  className="min-h-32 border-slate-300 focus:border-blue-500 resize-none"
                />
                <p className="text-xs text-slate-500">
                  {formData.detalle.length} / 65000 caracteres
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button
                onClick={saveDetalle}
                disabled={savingDetalle}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {savingDetalle ? (
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
              ¿Eliminar este detalle? Esta acción no se puede deshacer.
            </p>

            <div className="bg-red-50 p-3 rounded border border-red-200">
              <p className="text-sm text-red-900 line-clamp-2">
                {deleteTarget?.detalle}
              </p>
            </div>

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
                onClick={confirmDeleteDetalle}
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