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
import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  Pencil,
  Trash2,
  Plus,
  AlertTriangle,
  Loader2,
  Info,
  CheckCircle,
  MapPin,
} from "lucide-react";

export default function OrigenesTab() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);

  // ---------------- LOAD ----------------

  async function load() {
    try {
      setLoading(true);
      const r = await fetch("/api/origenes_citas", { cache: "no-store" });
      const data = await r.json();
      setItems(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Error cargando orígenes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  // ---------------- CREATE / EDIT ----------------

  function openCreate() {
    setEditing(null);
    setName("");
    setDialogOpen(true);
  }

  function openEdit(item) {
    setEditing(item);
    setName(item.name);
    setDialogOpen(true);
  }

  async function save() {
    if (!name.trim()) return toast.warning("Ingrese nombre");

    try {
      setSaving(true);

      if (editing) {
        const r = await fetch(`/api/origenes_citas/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        });

        if (!r.ok) throw new Error();

        toast.success("Origen actualizado");
      } else {
        const r = await fetch("/api/origenes_citas", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
        });

        if (!r.ok) throw new Error();

        toast.success("Origen creado");
      }

      setDialogOpen(false);
      setName("");
      setEditing(null);
      load();
    } catch {
      toast.error("Error guardando origen");
    } finally {
      setSaving(false);
    }
  }

  // ---------------- DELETE ----------------

  function openDelete(item) {
    setDeleteTarget(item);
    setDeleteOpen(true);
  }

  async function deleteConfirm() {
    try {
      setDeleting(true);

      const r = await fetch(`/api/origenes_citas/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (!r.ok) throw new Error();

      toast.success("Origen eliminado");

      setDeleteOpen(false);
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("Error eliminando");
    } finally {
      setDeleting(false);
    }
  }

  // ---------------- UI ----------------

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 pb-8">
        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">
                        Total de Orígenes
                      </p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">
                        {items.length}
                      </p>
                    </div>
                    <CheckCircle className="h-12 w-12 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Cantidad total de orígenes configurados
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">
                        Estado
                      </p>
                      <p className="text-3xl font-bold text-purple-900 mt-2">
                        {loading ? "-" : items.length > 0 ? "✓" : "○"}
                      </p>
                    </div>
                    <MapPin className="h-12 w-12 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              {items.length > 0
                ? "Hay orígenes configurados"
                : "Sin orígenes configurados"}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* MAIN CARD */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg font-bold text-gray-900">
                    Orígenes de Citas
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Gestiona los orígenes o fuentes de las citas
                  </p>
                </div>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={openCreate}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Nuevo Origen
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Crear nuevo origen de cita
                </TooltipContent>
              </Tooltip>
            </div>

            <Badge
              variant="secondary"
              className="w-fit bg-blue-100 text-blue-900 border-blue-300"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              {items.length} origen{items.length !== 1 ? "es" : ""} registrado
              {items.length !== 1 ? "s" : ""}
            </Badge>
          </CardHeader>

          <CardContent className="pt-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">Cargando orígenes...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-gray-100 rounded-full mb-3">
                  <MapPin className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  No hay orígenes configurados
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Haz clic en "Nuevo Origen" para crear uno
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((o, idx) => (
                  <div
                    key={o.id}
                    className={`border-2 rounded-lg p-4 flex justify-between items-center hover:shadow-md transition-all ${
                      idx % 2 === 0
                        ? "border-blue-200 bg-white hover:border-blue-300"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                      <span className="font-medium text-gray-900">
                        {o.name}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => openEdit(o)}
                            className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Editar origen
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="icon"
                            variant="outline"
                            onClick={() => openDelete(o)}
                            className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Eliminar origen
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* INFO BOX */}
        {!loading && items.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-1">
              <p className="font-semibold">Información importante:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>
                  Los orígenes identifican de dónde proviene cada cita
                </li>
                <li>
                  Ejemplos: Teléfono, Web, Red social, Referencia, etc.
                </li>
                <li>Puedes editar o eliminar orígenes en cualquier momento</li>
                <li>
                  Los cambios afectarán futuras citas asignadas a estos
                  orígenes
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* ---------- DIALOG CREATE / EDIT ---------- */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? (
                <>
                  <Pencil className="h-5 w-5 text-blue-600" />
                  Editar Origen
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-blue-600" />
                  Nuevo Origen
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">Nombre</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Nombre descriptivo del origen (ej: Teléfono, Web, Referencia)
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <Input
                placeholder="Ej: Teléfono"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={saving}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Ejemplos comunes */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-900 mb-2">
                Ejemplos comunes:
              </p>
              <div className="flex flex-wrap gap-2">
                {["Teléfono", "Web", "Red Social", "Referencia", "Email"].map(
                  (example) => (
                    <Badge
                      key={example}
                      variant="secondary"
                      className="bg-blue-100 text-blue-900 border-blue-300 cursor-pointer hover:bg-blue-200"
                      onClick={() => setName(example)}
                    >
                      {example}
                    </Badge>
                  )
                )}
              </div>
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
              ) : editing ? (
                "Actualizar"
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---------- DELETE CONFIRM ---------- */}
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
                ¿Estás seguro de que deseas eliminar este origen?
              </p>
              <p className="text-xs text-red-700 mt-2">
                ⚠️ Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="space-y-2 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Nombre:</span>
                <span className="text-gray-900 font-medium">
                  "{deleteTarget?.name ?? "-"}"
                </span>
              </div>
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
              onClick={deleteConfirm}
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