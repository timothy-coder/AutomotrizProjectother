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
import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  Pencil,
  Trash2,
  Plus,
  ChevronDown,
  ChevronRight,
  Info,
  AlertTriangle,
  CheckCircle,
  ListTodo,
  Loader2,
} from "lucide-react";

export default function MotivosTab() {
  const [motivos, setMotivos] = useState([]);
  const [subs, setSubs] = useState([]);
  const [expanded, setExpanded] = useState({});

  const [loading, setLoading] = useState(false);

  const [dialogMotivo, setDialogMotivo] = useState(false);
  const [dialogSub, setDialogSub] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);

  const [editingMotivo, setEditingMotivo] = useState(null);
  const [editingSub, setEditingSub] = useState(null);

  const [deleteTarget, setDeleteTarget] = useState(null);

  const [nombre, setNombre] = useState("");
  const [isActive, setIsActive] = useState(true);

  // ================= LOAD =================
  async function load() {
    setLoading(true);
    try {
      const m = await fetch("/api/motivos_citas").then((r) => r.json());
      const s = await fetch("/api/submotivos-citas").then((r) => r.json());
      setMotivos(m);
      setSubs(s);
    } catch {
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  const grouped = motivos.map((m) => ({
    ...m,
    subs: subs.filter((s) => s.motivo_id === m.id),
  }));

  const toggleExpand = (id) =>
    setExpanded((p) => ({ ...p, [id]: !p[id] }));

  // ================= MOTIVOS =================
  function openCreateMotivo() {
    setEditingMotivo(null);
    setNombre("");
    setIsActive(true);
    setDialogMotivo(true);
  }

  function openEditMotivo(m) {
    setEditingMotivo(m);
    setNombre(m.nombre);
    setIsActive(m.is_active !== 0);
    setDialogMotivo(true);
  }

  async function saveMotivo() {
    if (!nombre.trim()) return toast.warning("Ingrese nombre");

    const url = editingMotivo
      ? `/api/motivos_citas/${editingMotivo.id}`
      : `/api/motivos_citas`;

    const method = editingMotivo ? "PUT" : "POST";

    try {
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombre.trim(),
          is_active: isActive ? 1 : 0,
        }),
      });

      toast.success(editingMotivo ? "Motivo actualizado" : "Motivo creado");
      setDialogMotivo(false);
      load();
    } catch {
      toast.error("Error guardando motivo");
    }
  }

  // ================= SUBMOTIVOS =================
  function openCreateSub(motivo) {
    setEditingSub({ motivo_id: motivo.id });
    setNombre("");
    setIsActive(true);
    setDialogSub(true);
  }

  function openEditSub(s) {
    setEditingSub(s);
    setNombre(s.nombre);
    setIsActive(s.is_active !== 0);
    setDialogSub(true);
  }

  async function saveSub() {
    if (!nombre.trim()) return toast.warning("Ingrese nombre");

    const body = {
      motivo_id: editingSub.motivo_id,
      nombre: nombre.trim(),
      is_active: isActive ? 1 : 0,
    };

    const url = editingSub.id
      ? `/api/submotivos-citas/${editingSub.id}`
      : `/api/submotivos-citas`;

    const method = editingSub.id ? "PUT" : "POST";

    try {
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      toast.success(editingSub.id ? "Submotivo actualizado" : "Submotivo creado");
      setDialogSub(false);
      load();
    } catch {
      toast.error("Error guardando submotivo");
    }
  }

  // ================= DELETE =================
  function openDelete(target) {
    setDeleteTarget(target);
    setDeleteDialog(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;

    const isSub = deleteTarget.motivo_id;

    const url = isSub
      ? `/api/submotivos-citas/${deleteTarget.id}`
      : `/api/motivos_citas/${deleteTarget.id}`;

    try {
      await fetch(url, { method: "DELETE" });

      toast.success("Eliminado correctamente");
      setDeleteDialog(false);
      load();
    } catch {
      toast.error("Error eliminando");
    }
  }

  const stats = {
    total: motivos.length,
    activos: motivos.filter((m) => m.is_active !== 0).length,
    totalSubs: subs.length,
  };

  // ================= UI =================
  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 pb-8">
        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">
                        Total de Motivos
                      </p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">
                        {stats.total}
                      </p>
                    </div>
                    <ListTodo className="h-12 w-12 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Cantidad total de motivos registrados
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">
                        Motivos Activos
                      </p>
                      <p className="text-3xl font-bold text-green-900 mt-2">
                        {stats.activos}
                      </p>
                    </div>
                    <CheckCircle className="h-12 w-12 text-green-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Motivos disponibles para seleccionar
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">
                        Total Submotivos
                      </p>
                      <p className="text-3xl font-bold text-purple-900 mt-2">
                        {stats.totalSubs}
                      </p>
                    </div>
                    <Loader2 className="h-12 w-12 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Cantidad total de submotivos
            </TooltipContent>
          </Tooltip>
        </div>

        {/* MAIN CARD */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
                  <ListTodo className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg font-bold text-gray-900">
                    Motivos de Citas
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Gestiona los motivos y submotivos de las citas
                  </p>
                </div>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={openCreateMotivo}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Nuevo Motivo
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Crear nuevo motivo de cita
                </TooltipContent>
              </Tooltip>
            </div>

            <Badge
              variant="secondary"
              className="w-fit bg-blue-100 text-blue-900 border-blue-300"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              {stats.total} motivos registrados
            </Badge>
          </CardHeader>

          <CardContent className="pt-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">Cargando motivos...</p>
              </div>
            ) : grouped.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-gray-100 rounded-full mb-3">
                  <ListTodo className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  No hay motivos configurados
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Haz clic en "Nuevo Motivo" para crear uno
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {grouped.map((m) => (
                  <div key={m.id} className="border-2 rounded-lg overflow-hidden">
                    {/* HEADER */}
                    <div className="flex justify-between items-center p-4 bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all border-b">
                      <div
                        className="flex items-center gap-3 cursor-pointer flex-1"
                        onClick={() => toggleExpand(m.id)}
                      >
                        <div className="text-blue-600">
                          {expanded[m.id] ? (
                            <ChevronDown className="h-5 w-5" />
                          ) : (
                            <ChevronRight className="h-5 w-5" />
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">
                            {m.nombre}
                          </div>
                          <div className="text-xs text-gray-600 mt-1">
                            {m.subs.length} submotivo{m.subs.length !== 1 ? "s" : ""}
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openCreateSub(m)}
                              className="border-blue-300 text-blue-700 hover:bg-blue-50 hover:border-blue-400 gap-1"
                            >
                              <Plus className="h-4 w-4" />
                              <span className="hidden sm:inline">Sub</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Crear submotivo
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => openEditMotivo(m)}
                              className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Editar motivo
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => openDelete(m)}
                              className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Eliminar motivo
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    {/* SUBS */}
                    {expanded[m.id] && (
                      <div className="p-4 space-y-2 bg-white">
                        {m.subs.length === 0 ? (
                          <div className="text-center py-4 text-gray-500">
                            <p className="text-sm">No hay submotivos</p>
                          </div>
                        ) : (
                          m.subs.map((s) => (
                            <div
                              key={s.id}
                              className="flex justify-between items-center border rounded-lg px-3 py-2 hover:bg-blue-50 transition-colors"
                            >
                              <div className="flex items-center gap-3 flex-1">
                                <div className="w-1 h-1 rounded-full bg-blue-500 flex-shrink-0" />
                                <div>
                                  <div className="font-medium text-gray-900">
                                    {s.nombre}
                                  </div>
                                  {s.is_active === 0 && (
                                    <Badge
                                      variant="outline"
                                      className="text-xs mt-1 bg-gray-100 text-gray-700 border-gray-300"
                                    >
                                      Inactivo
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              <div className="flex gap-2">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      onClick={() => openEditSub(s)}
                                      className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
                                    >
                                      <Pencil className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    Editar submotivo
                                  </TooltipContent>
                                </Tooltip>

                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      onClick={() => openDelete(s)}
                                      className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">
                                    Eliminar submotivo
                                  </TooltipContent>
                                </Tooltip>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* INFO BOX */}
        {!loading && grouped.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-1">
              <p className="font-semibold">Información importante:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Los motivos son categorías principales de citas</li>
                <li>Los submotivos permiten mayor especificidad</li>
                <li>Haz clic en el motivo para expandir/contraer submotivos</li>
                <li>Puedes desactivar motivos sin eliminarlos</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* DIALOG MOTIVO */}
      <Dialog open={dialogMotivo} onOpenChange={setDialogMotivo}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingMotivo ? (
                <>
                  <Pencil className="h-5 w-5 text-blue-600" />
                  Editar Motivo
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-blue-600" />
                  Nuevo Motivo
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
                    Nombre descriptivo del motivo de cita
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Consulta médica"
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {editingMotivo && (
              <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Label className="font-semibold text-gray-700">Activo</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Los motivos inactivos no aparecen al crear citas
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  className="data-[state=checked]:bg-blue-600"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogMotivo(false)}
              className="border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveMotivo}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {editingMotivo ? "Actualizar" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIALOG SUB */}
      <Dialog open={dialogSub} onOpenChange={setDialogSub}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingSub?.id ? (
                <>
                  <Pencil className="h-5 w-5 text-purple-600" />
                  Editar Submotivo
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-purple-600" />
                  Nuevo Submotivo
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
                    Nombre específico del submotivo
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <Input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej: Revisión general"
                className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            {editingSub?.id && (
              <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <Label className="font-semibold text-gray-700">Activo</Label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Los submotivos inactivos no aparecen al crear citas
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Switch
                  checked={isActive}
                  onCheckedChange={setIsActive}
                  className="data-[state=checked]:bg-purple-600"
                />
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogSub(false)}
              className="border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={saveSub}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {editingSub?.id ? "Actualizar" : "Guardar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
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
                ¿Estás seguro de que deseas eliminar esto?
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
              <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                <span className="font-semibold text-gray-700">Tipo:</span>
                <Badge
                  variant="outline"
                  className={
                    deleteTarget?.motivo_id
                      ? "bg-purple-100 text-purple-900 border-purple-300"
                      : "bg-blue-100 text-blue-900 border-blue-300"
                  }
                >
                  {deleteTarget?.motivo_id ? "Submotivo" : "Motivo"}
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(false)}
              className="border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}