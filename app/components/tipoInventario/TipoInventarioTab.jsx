"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  Info,
  Package,
  CheckCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";

export default function TipoInventarioTab() {
  const { permissions } = useAuth();

  const permView = hasPermission(permissions, "configuracion", "view");
  const permCreate = hasPermission(permissions, "configuracion", "create");
  const permEdit = hasPermission(permissions, "configuracion", "edit");
  const permDelete = hasPermission(permissions, "configuracion", "delete");

  const [tipos, setTipos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [form, setForm] = useState({
    nombre: "",
    description: "",
  });

  async function loadTipos() {
    try {
      setLoading(true);
      const res = await fetch("/api/tipo-inventario", { cache: "no-store" });
      const data = await res.json();
      setTipos(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Error cargando tipos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadTipos();
  }, []);

  if (!permView) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-red-700">
          <p className="font-semibold">Sin permiso</p>
          <p className="text-xs mt-1">
            No tienes permisos para ver esta sección
          </p>
        </div>
      </div>
    );
  }

  function openDialog() {
    setEditItem(null);
    setForm({ nombre: "", description: "" });
    setDialogOpen(true);
  }

  function editTipo(item) {
    setEditItem(item);
    setForm({
      nombre: item.nombre,
      description: item.description || "",
    });
    setDialogOpen(true);
  }

  function openDelete(item) {
    setDeleteTarget(item);
    setDeleteOpen(true);
  }

  async function save() {
    if (!form.nombre.trim()) {
      toast.warning("Ingrese nombre");
      return;
    }

    try {
      setSaving(true);

      if (editItem) {
        await fetch(`/api/tipo-inventario/${editItem.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        toast.success("Tipo actualizado");
      } else {
        await fetch("/api/tipo-inventario", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        toast.success("Tipo creado");
      }
      loadTipos();
      setDialogOpen(false);
    } catch {
      toast.error("Error guardando");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);

      await fetch(`/api/tipo-inventario/${deleteTarget.id}`, {
        method: "DELETE",
      });
      toast.success("Tipo eliminado");
      setDeleteOpen(false);
      setDeleteTarget(null);
      loadTipos();
    } catch {
      toast.error("Error eliminando");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Tipos de Inventario
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona las categorías de inventario disponibles
              </p>
            </div>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">
                      Total de Tipos
                    </p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">
                      {tipos.length}
                    </p>
                  </div>
                  <Package className="h-12 w-12 text-blue-200" />
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="top">
            Cantidad total de tipos registrados
          </TooltipContent>
        </Tooltip>

        {/* MAIN CARD */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 rounded-lg">
                  <Package className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg font-bold text-gray-900">
                    Lista de Tipos
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Todos los tipos de inventario disponibles
                  </p>
                </div>
              </div>

              {permCreate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      onClick={openDialog}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Nuevo Tipo</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Crear nuevo tipo de inventario
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <Badge
              variant="secondary"
              className="w-fit bg-blue-100 text-blue-900 border-blue-300"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              {tipos.length} tipo{tipos.length !== 1 ? "s" : ""} registrado
              {tipos.length !== 1 ? "s" : ""}
            </Badge>
          </CardHeader>

          <CardContent className="pt-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">Cargando tipos...</p>
              </div>
            ) : tipos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-gray-100 rounded-full mb-3">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  No hay tipos registrados
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {permCreate
                    ? 'Haz clic en "Nuevo Tipo" para crear uno'
                    : "Sin tipos disponibles"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {tipos.map((t, idx) => (
                  <div
                    key={t.id}
                    className={`border-2 rounded-lg p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between hover:shadow-md transition-all ${
                      idx % 2 === 0
                        ? "border-blue-200 bg-white hover:border-blue-300"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-start gap-3 flex-1 mb-3 sm:mb-0">
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-gray-900">
                          {t.nombre}
                        </div>
                        {t.description && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <p className="text-sm text-gray-600 truncate cursor-help hover:text-gray-900 transition-colors">
                                {t.description}
                              </p>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="max-w-xs">
                              {t.description}
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2">
                      {permEdit && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => editTipo(t)}
                              className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Editar tipo
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {permDelete && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => openDelete(t)}
                              className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Eliminar tipo
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* INFO BOX */}
        {!loading && tipos.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-1">
              <p className="font-semibold">Información importante:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>
                  Los tipos clasifican los artículos del inventario
                </li>
                <li>Puedes editar o eliminar tipos en cualquier momento</li>
                <li>
                  Eliminar un tipo puede afectar registros existentes
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* DIALOG CREATE / EDIT */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editItem ? (
                <>
                  <Pencil className="h-5 w-5 text-blue-600" />
                  Editar Tipo
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-blue-600" />
                  Nuevo Tipo
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Nombre */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">Nombre</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Nombre descriptivo del tipo (ej: Electrónica, Muebles)
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <Input
                value={form.nombre}
                onChange={(e) =>
                  setForm({ ...form, nombre: e.target.value })
                }
                placeholder="Ej: Electrónica"
                disabled={saving}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">
                  Descripción
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Descripción adicional (opcional)
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Descripción del tipo"
                disabled={saving}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : editItem ? (
                "Actualizar"
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmar eliminación
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-red-50 border-l-4 border-l-red-500 rounded-lg">
              <p className="text-sm text-red-900 font-semibold">
                ¿Estás seguro de que deseas eliminar este tipo?
              </p>
              <p className="text-xs text-red-700 mt-2">
                ⚠️ Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="space-y-2 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Nombre:</span>
                <span className="text-gray-900 font-medium">
                  {deleteTarget?.nombre ?? "-"}
                </span>
              </div>
              {deleteTarget?.description && (
                <div className="flex justify-between items-start pt-2 border-t border-gray-300">
                  <span className="font-semibold text-gray-700">
                    Descripción:
                  </span>
                  <span className="text-gray-900 text-right text-xs max-w-xs">
                    {deleteTarget.description}
                  </span>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}