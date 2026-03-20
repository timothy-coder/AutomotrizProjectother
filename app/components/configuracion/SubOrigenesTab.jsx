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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Switch } from "@/components/ui/switch";
import {
  Pencil,
  Trash2,
  Plus,
  AlertTriangle,
  Loader2,
  Info,
  RefreshCw,
  GitBranch,
  CheckCircle,
  Zap,
} from "lucide-react";

const EMPTY_FORM = {
  id: null,
  origen_id: "",
  name: "",
  is_active: true,
};

export default function SubOrigenesTab() {
  const [rows, setRows] = useState([]);
  const [origenes, setOrigenes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [filterOrigen, setFilterOrigen] = useState("all");

  const [open, setOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [mode, setMode] = useState("create");
  const [form, setForm] = useState(EMPTY_FORM);
  const isEdit = mode === "edit";

  async function loadData(origenId = filterOrigen) {
    try {
      setLoading(true);

      const [subRes, origenesRes] = await Promise.all([
        fetch(
          origenId && origenId !== "all"
            ? `/api/suborigenes_citas?origen_id=${origenId}`
            : `/api/suborigenes_citas`,
          { cache: "no-store" }
        ),
        fetch(`/api/origenes_citas`, { cache: "no-store" }),
      ]);

      const subData = await subRes.json();
      const origenesData = await origenesRes.json();

      setRows(Array.isArray(subData) ? subData : []);
      setOrigenes(Array.isArray(origenesData) ? origenesData : []);
    } catch (error) {
      console.error(error);
      toast.error("Error cargando suborígenes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadData(filterOrigen);
  }, [filterOrigen]);

  function handleNew() {
    setMode("create");
    setForm(EMPTY_FORM);
    setOpen(true);
  }

  function handleEdit(row) {
    setMode("edit");
    setForm({
      id: row.id,
      origen_id: String(row.origen_id || ""),
      name: row.name || "",
      is_active: !!row.is_active,
    });
    setOpen(true);
  }

  function handleAskDelete(row) {
    setDeleteTarget(row);
    setDeleteOpen(true);
  }

  async function handleDelete() {
    if (!deleteTarget) return;

    try {
      setDeleting(true);

      const res = await fetch(`/api/suborigenes_citas/${deleteTarget.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Error al eliminar");
      }

      toast.success("Suborigen eliminado");
      setDeleteOpen(false);
      setDeleteTarget(null);
      loadData(filterOrigen);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "No se pudo eliminar");
    } finally {
      setDeleting(false);
    }
  }

  async function handleSave() {
    if (!form.origen_id || !form.name.trim()) {
      toast.error("Origen y nombre son obligatorios");
      return;
    }

    try {
      setSaving(true);

      const url = isEdit
        ? `/api/suborigenes_citas/${form.id}`
        : `/api/suborigenes_citas`;

      const method = isEdit ? "PUT" : "POST";

      const payload = {
        origen_id: Number(form.origen_id),
        name: form.name.trim(),
        is_active: form.is_active ? 1 : 0,
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Error al guardar");
      }

      toast.success(
        isEdit ? "Suborigen actualizado" : "Suborigen creado"
      );
      setOpen(false);
      setForm(EMPTY_FORM);
      loadData(filterOrigen);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "No se pudo guardar");
    } finally {
      setSaving(false);
    }
  }

  const stats = {
    total: rows.length,
    activos: rows.filter((r) => r.is_active).length,
    inactivos: rows.filter((r) => !r.is_active).length,
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
              <GitBranch className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Suborígenes de Citas
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona las subcategorías de orígenes de citas
              </p>
            </div>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">
                        Total Suborígenes
                      </p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">
                        {stats.total}
                      </p>
                    </div>
                    <GitBranch className="h-12 w-12 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Cantidad total de suborígenes registrados
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">
                        Activos
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
              Suborígenes disponibles para usar
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">
                        Inactivos
                      </p>
                      <p className="text-3xl font-bold text-orange-900 mt-2">
                        {stats.inactivos}
                      </p>
                    </div>
                    <Zap className="h-12 w-12 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Suborígenes desactivados
            </TooltipContent>
          </Tooltip>
        </div>

        {/* MAIN CARD */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b space-y-3">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-blue-600 rounded-lg">
                <GitBranch className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-bold text-gray-900">
                  Lista de Suborígenes
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Filtra y gestiona los suborígenes
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 pt-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex-1">
                    <Select
                      value={filterOrigen}
                      onValueChange={setFilterOrigen}
                    >
                      <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="Filtrar por origen" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos los orígenes</SelectItem>
                        {origenes.map((origen) => (
                          <SelectItem
                            key={origen.id}
                            value={String(origen.id)}
                          >
                            {origen.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Filtra los suborígenes por su origen padre
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={() => loadData(filterOrigen)}
                    disabled={loading}
                    className="border-gray-300 gap-2"
                  >
                    <RefreshCw
                      className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
                    />
                    <span className="hidden sm:inline">Recargar</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Recargar datos</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleNew}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">Nuevo</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Crear nuevo suborigen
                </TooltipContent>
              </Tooltip>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">Cargando suborígenes...</p>
              </div>
            ) : rows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-gray-100 rounded-full mb-3">
                  <GitBranch className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  No hay suborígenes registrados
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Haz clic en "Nuevo" para crear uno
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {rows.map((row, idx) => (
                  <div
                    key={row.id}
                    className={`border-2 rounded-lg p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between hover:shadow-md transition-all ${
                      idx % 2 === 0
                        ? "border-blue-200 bg-white hover:border-blue-300"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                        <div className="font-semibold text-gray-900">
                          {row.name}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="outline"
                          className="bg-blue-100 text-blue-900 border-blue-300 text-xs"
                        >
                          {row.origen_name || `Origen ID ${row.origen_id}`}
                        </Badge>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Badge
                              variant="outline"
                              className={
                                row.is_active
                                  ? "bg-green-100 text-green-900 border-green-300 text-xs"
                                  : "bg-gray-100 text-gray-700 border-gray-300 text-xs"
                              }
                            >
                              {row.is_active ? "✓ Activo" : "✗ Inactivo"}
                            </Badge>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            {row.is_active
                              ? "Disponible para usar"
                              : "Desactivado"}
                          </TooltipContent>
                        </Tooltip>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(row)}
                            className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
                          >
                            <Pencil className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">Editar</span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Editar suborigen
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAskDelete(row)}
                            className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span className="hidden sm:inline ml-1">
                              Eliminar
                            </span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Eliminar suborigen
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
        {!loading && rows.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-1">
              <p className="font-semibold">Información importante:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Los suborígenes son subcategorías de los orígenes</li>
                <li>Cada suborigen debe pertenecer a un origen padre</li>
                <li>Puedes filtrar por origen para ver solo sus suborígenes</li>
                <li>Los suborígenes inactivos no aparecerán en formularios</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* DIALOG CREATE / EDIT */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEdit ? (
                <>
                  <Pencil className="h-5 w-5 text-blue-600" />
                  Editar Suborigen
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-blue-600" />
                  Nuevo Suborigen
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Origen */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">Origen</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Selecciona el origen padre para este suborigen
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <Select
                value={form.origen_id}
                onValueChange={(value) =>
                  setForm((prev) => ({ ...prev, origen_id: value }))
                }
              >
                <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Seleccionar origen" />
                </SelectTrigger>
                <SelectContent>
                  {origenes.map((origen) => (
                    <SelectItem key={origen.id} value={String(origen.id)}>
                      {origen.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Nombre */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">Nombre</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Nombre descriptivo del suborigen (ej: WhatsApp Empresa)
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                placeholder="Ej. WhatsApp Empresa"
                disabled={saving}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Activo */}
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">Activo</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Los suborígenes inactivos no aparecen en formularios
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                checked={!!form.is_active}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, is_active: !!checked }))
                }
                className="data-[state=checked]:bg-blue-600"
                disabled={saving}
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={saving}
              className="border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : isEdit ? (
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
                ¿Estás seguro de que deseas eliminar este suborigen?
              </p>
              <p className="text-xs text-red-700 mt-2">
                ⚠️ Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="space-y-2 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Nombre:</span>
                <span className="text-gray-900 font-medium">
                  {deleteTarget?.name ?? "-"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                <span className="font-semibold text-gray-700">Origen:</span>
                <span className="text-gray-900 font-medium">
                  {deleteTarget?.origen_name || `ID ${deleteTarget?.origen_id}`}
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
              onClick={handleDelete}
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