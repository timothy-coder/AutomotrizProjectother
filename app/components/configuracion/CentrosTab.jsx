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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  Pencil,
  Trash2,
  Plus,
  AlertTriangle,
  Loader2,
  Building2,
  MapPin,
  Info,
} from "lucide-react";

export default function CentrosTab() {
  const [items, setItems] = useState([]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [editing, setEditing] = useState(null);
  const [nombre, setNombre] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(false);

  // ================= LOAD =================

  async function load() {
    try {
      setLoading(true);
      const r = await fetch("/api/centros", { cache: "no-store" });
      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Error cargando centros");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ================= CREATE =================

  function openCreate() {
    setEditing(null);
    setNombre("");
    setDialogOpen(true);
  }

  // ================= EDIT =================

  function openEdit(item) {
    setEditing(item);
    setNombre(item.nombre);
    setDialogOpen(true);
  }

  // ================= SAVE =================

  async function save() {
    if (!nombre.trim()) return toast.warning("Ingrese nombre del centro");

    try {
      const res = await fetch(
        editing ? `/api/centros/${editing.id}` : `/api/centros`,
        {
          method: editing ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre }),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "Error guardando");
        return;
      }

      toast.success(
        editing ? "Centro actualizado correctamente" : "Centro creado correctamente"
      );

      setDialogOpen(false);
      load();
    } catch {
      toast.error("Error guardando");
    }
  }

  // ================= DELETE =================

  function openDelete(item) {
    setDeleteTarget(item);
    setDeleteOpen(true);
  }

  async function deleteConfirm() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);

      const res = await fetch(`/api/centros/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.message || "No se pudo eliminar");
        return;
      }

      toast.success("Centro eliminado correctamente");

      setDeleteOpen(false);
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("Error eliminando el centro");
    } finally {
      setDeleting(false);
    }
  }

  // ================= UI =================

  return (
    <TooltipProvider>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <div className="border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg">
                <Building2 className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">Centros</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Gestiona los centros de atención disponibles
                </p>
              </div>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={openCreate}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo Centro
                </Button>
              </TooltipTrigger>
              <TooltipContent>Crear un nuevo centro de atención</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-emerald-600 font-medium">Total de Centros</p>
                  <p className="text-3xl font-bold text-emerald-900 mt-2">{items.length}</p>
                </div>
                <Building2 className="h-12 w-12 text-emerald-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">Centros Activos</p>
                  <p className="text-3xl font-bold text-blue-900 mt-2">
                    {items.filter((c) => c.activo !== false).length}
                  </p>
                </div>
                <MapPin className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* LISTA */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5 text-emerald-600" />
                Listado de Centros
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {items.length} registros
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-emerald-600 mx-auto" />
                  <p className="text-sm text-slate-500">Cargando centros...</p>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="p-3 bg-slate-100 rounded-lg">
                  <Building2 className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500 font-medium">
                  No hay centros registrados
                </p>
                <p className="text-xs text-slate-400">
                  Crea el primer centro para comenzar
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {items.map((c) => (
                  <Row
                    key={c.id}
                    item={c}
                    onEdit={() => openEdit(c)}
                    onDelete={() => openDelete(c)}
                  />
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
              <p className="font-medium mb-1">Información:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Cada centro puede tener su propio horario de atención</li>
                <li>Los centros pueden ser editados o eliminados en cualquier momento</li>
                <li>Se requiere al menos un centro para crear citas</li>
              </ul>
            </div>
          </div>
        </div>

        {/* DIALOG CREATE / EDIT */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-emerald-600" />
                {editing ? "Editar Centro" : "Nuevo Centro"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700">
                  Nombre del Centro
                </label>
                <Input
                  placeholder="Ej: Centro Principal, Centro Sucursal..."
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="border-slate-300 focus:border-emerald-500"
                  autoFocus
                />
                <p className="text-xs text-slate-500">
                  Ingresa un nombre único y descriptivo para el centro
                </p>
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
                onClick={save}
                className="bg-emerald-600 hover:bg-emerald-700"
              >
                {editing ? "Actualizar" : "Crear"} Centro
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DELETE DIALOG */}
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogContent className="sm:max-w-md">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-red-100 p-4 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  ¿Eliminar centro?
                </h3>

                <p className="text-sm text-slate-600 mt-2">
                  Se eliminará permanentemente:
                </p>

                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-semibold text-red-900">
                    {deleteTarget?.nombre}
                  </p>
                </div>

                <p className="text-xs text-slate-500 mt-3">
                  Esta acción no se puede deshacer. Asegúrate de que no haya
                  citas relacionadas.
                </p>
              </div>

              <div className="flex gap-3 w-full pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-300"
                  onClick={() => setDeleteOpen(false)}
                  disabled={deleting}
                >
                  Cancelar
                </Button>

                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={deleteConfirm}
                  disabled={deleting}
                >
                  {deleting && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {deleting ? "Eliminando..." : "Eliminar"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}

// ================= ROW =================

function Row({ item, onEdit, onDelete }) {
  return (
    <TooltipProvider>
      <div className="border border-slate-200 rounded-lg p-4 flex justify-between items-center hover:bg-slate-50 hover:border-emerald-200 transition-all group">
        <div className="flex items-center gap-3 flex-1">
          <div className="p-2 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors">
            <Building2 className="h-4 w-4 text-emerald-700" />
          </div>
          <div className="flex-1">
            <p className="font-semibold text-slate-900">{item.nombre}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              ID: {item.id}
            </p>
          </div>
        </div>

        <div className="flex gap-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={onEdit}
                className="border-slate-300 hover:bg-amber-50 hover:border-amber-300"
              >
                <Pencil className="h-4 w-4 text-amber-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar centro</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                onClick={onDelete}
                className="border-slate-300 hover:bg-red-50 hover:border-red-300"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Eliminar centro</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}