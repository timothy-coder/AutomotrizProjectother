"use client";

import { useEffect, useMemo, useState } from "react";
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
  Info,
  Calendar,
  CheckCircle,
  Clock,
  TrendingUp,
} from "lucide-react";

export default function FrecuenciaTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialog, setDialog] = useState({
    open: false,
    mode: "create", // create | edit
    data: null,
  });

  const [form, setForm] = useState({ dias: "" });
  const [saving, setSaving] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    item: null,
  });
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const r = await fetch("/api/frecuencia", { cache: "no-store" });
      const data = await r.json();

      if (!r.ok) {
        toast.error(data?.message || "Error cargando frecuencia");
        setRows([]);
        return;
      }

      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log(e);
      toast.error("Error cargando frecuencia");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm({ dias: "" });
    setDialog({ open: true, mode: "create", data: null });
  }

  function openEdit(item) {
    setForm({ dias: String(item?.dias ?? "") });
    setDialog({ open: true, mode: "edit", data: item });
  }

  function closeDialog(v) {
    setDialog((prev) => ({ ...prev, open: v }));
    if (!v) {
      setSaving(false);
      setForm({ dias: "" });
    }
  }

  function closeDeleteDialog(v) {
    setDeleteDialog((prev) => ({ ...prev, open: v }));
    if (!v) {
      setDeleting(false);
    }
  }

  async function save() {
    const diasNum = Number(form.dias);

    if (form.dias === "" || Number.isNaN(diasNum)) {
      toast.error("Días debe ser un número");
      return;
    }
    if (diasNum < 0) {
      toast.error("Días no puede ser negativo");
      return;
    }

    const isEdit = dialog.mode === "edit" && dialog.data?.id != null;
    const url = isEdit ? `/api/frecuencia/${dialog.data.id}` : "/api/frecuencia";
    const method = isEdit ? "PUT" : "POST";

    try {
      setSaving(true);

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dias: diasNum }),
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        toast.error(data?.message || "No se pudo guardar");
        return;
      }

      toast.success(isEdit ? "Frecuencia actualizada" : "Frecuencia creada");
      setDialog({ open: false, mode: "create", data: null });
      setForm({ dias: "" });
      await load();
    } catch (e) {
      console.log(e);
      toast.error("Error guardando frecuencia");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const id = deleteDialog.item?.id;
    if (!id) return;

    try {
      setDeleting(true);

      const r = await fetch(`/api/frecuencia/${id}`, { method: "DELETE" });
      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        toast.error(data?.message || "No se pudo eliminar");
        return;
      }

      toast.success("Frecuencia eliminada");
      setDeleteDialog({ open: false, item: null });
      await load();
    } catch (e) {
      console.log(e);
      toast.error("Error eliminando frecuencia");
    } finally {
      setDeleting(false);
    }
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => Number(a.dias) - Number(b.dias));
  }, [rows]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      minDias: sorted.length > 0 ? sorted[0].dias : 0,
      maxDias: sorted.length > 0 ? sorted[sorted.length - 1].dias : 0,
      promedio:
        sorted.length > 0
          ? Math.round(
              sorted.reduce((acc, item) => acc + Number(item.dias), 0) /
                sorted.length
            )
          : 0,
    };
  }, [sorted, rows]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 pb-8">
        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">
                        Total de Frecuencias
                      </p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">
                        {stats.total}
                      </p>
                    </div>
                    <CheckCircle className="h-12 w-12 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Cantidad total de frecuencias registradas
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">
                        Mínimo
                      </p>
                      <p className="text-3xl font-bold text-green-900 mt-2">
                        {stats.minDias}
                      </p>
                      <p className="text-xs text-green-600 mt-1">días</p>
                    </div>
                    <TrendingUp className="h-12 w-12 text-green-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Período más corto entre mantenimientos
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">
                        Promedio
                      </p>
                      <p className="text-3xl font-bold text-purple-900 mt-2">
                        {stats.promedio}
                      </p>
                      <p className="text-xs text-purple-600 mt-1">días</p>
                    </div>
                    <Clock className="h-12 w-12 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Promedio de días entre frecuencias
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">
                        Máximo
                      </p>
                      <p className="text-3xl font-bold text-orange-900 mt-2">
                        {stats.maxDias}
                      </p>
                      <p className="text-xs text-orange-600 mt-1">días</p>
                    </div>
                    <Calendar className="h-12 w-12 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Período más largo entre mantenimientos
            </TooltipContent>
          </Tooltip>
        </div>

        {/* MAIN CARD */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-bold text-gray-900">
                  Frecuencia de Mantenimiento
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Define los intervalos de tiempo para mantenimientos preventivos
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={openCreate}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Nueva Frecuencia
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Crear nuevo intervalo de frecuencia
                </TooltipContent>
              </Tooltip>

              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-900 border-blue-300"
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                {stats.total} registros
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">Cargando frecuencias...</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-gray-100 rounded-full mb-3">
                  <Calendar className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  No hay frecuencias registradas
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Crea la primera frecuencia haciendo clic en "Nueva Frecuencia"
                </p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th className="text-left p-4 font-semibold text-gray-700 cursor-help">
                            ID
                          </th>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Identificador único
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th className="text-left p-4 font-semibold text-gray-700 cursor-help">
                            Días
                          </th>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Número de días entre mantenimientos
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th className="text-left p-4 font-semibold text-gray-700 cursor-help">
                            Estado
                          </th>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Frecuencia comparada con el promedio
                        </TooltipContent>
                      </Tooltip>

                      <th className="text-right p-4 font-semibold text-gray-700">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sorted.map((item, idx) => {
                      const dias = Number(item.dias);
                      let badge = "default";
                      let badgeText = "Normal";
                      let badgeColor = "bg-blue-100 text-blue-900 border-blue-300";

                      if (dias < stats.minDias + (stats.maxDias - stats.minDias) / 3) {
                        badge = "corta";
                        badgeText = "Corta";
                        badgeColor =
                          "bg-green-100 text-green-900 border-green-300";
                      } else if (
                        dias >
                        stats.minDias + ((stats.maxDias - stats.minDias) * 2) / 3
                      ) {
                        badge = "larga";
                        badgeText = "Larga";
                        badgeColor =
                          "bg-orange-100 text-orange-900 border-orange-300";
                      }

                      return (
                        <tr
                          key={item.id}
                          className={`border-b hover:bg-blue-50 transition-colors ${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="p-4">
                            <Badge
                              variant="outline"
                              className="text-xs font-mono"
                            >
                              {item.id}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-gray-900">
                                {dias}
                              </span>
                              <span className="text-xs text-gray-600">días</span>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge
                              variant="outline"
                              className={`border ${badgeColor}`}
                            >
                              {badgeText}
                            </Badge>
                          </td>
                          <td className="p-4">
                            <div className="flex justify-end gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => openEdit(item)}
                                    className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400 gap-1"
                                  >
                                    <Pencil className="h-4 w-4" />
                                    <span className="hidden sm:inline">
                                      Editar
                                    </span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  Editar esta frecuencia
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    onClick={() =>
                                      setDeleteDialog({ open: true, item })
                                    }
                                    className="gap-1"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="hidden sm:inline">
                                      Eliminar
                                    </span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  Eliminar esta frecuencia
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* INFO BOX */}
        {!loading && sorted.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-1">
              <p className="font-semibold">Información importante:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>
                  Las frecuencias se ordenan automáticamente de menor a mayor
                </li>
                <li>
                  Cada frecuencia representa el intervalo en días para un
                  mantenimiento
                </li>
                <li>El estado indica si la frecuencia es corta, normal o larga</li>
                <li>
                  Los cambios afectarán los planes de mantenimiento existentes
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* DIALOG CREATE/EDIT */}
      <Dialog open={dialog.open} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {dialog.mode === "edit" ? (
                <>
                  <Pencil className="h-5 w-5 text-blue-600" />
                  Editar Frecuencia
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-blue-600" />
                  Nueva Frecuencia
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700">
                  Días
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Número de días entre cada mantenimiento (ej: 30, 60, 90)
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>

              <Input
                type="number"
                value={form.dias}
                onChange={(e) => setForm({ dias: e.target.value })}
                placeholder="Ej: 30"
                min={0}
                disabled={saving}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-600">
                Ingresa un número positivo (0 o superior)
              </p>
            </div>

            {/* Ejemplos */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-900 mb-2">
                Ejemplos comunes:
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-900 border-green-300 cursor-pointer hover:bg-green-200"
                  onClick={() => setForm({ dias: "30" })}
                >
                  30 días
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-900 border-blue-300 cursor-pointer hover:bg-blue-200"
                  onClick={() => setForm({ dias: "60" })}
                >
                  60 días
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-purple-100 text-purple-900 border-purple-300 cursor-pointer hover:bg-purple-200"
                  onClick={() => setForm({ dias: "90" })}
                >
                  90 días
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-orange-100 text-orange-900 border-orange-300 cursor-pointer hover:bg-orange-200"
                  onClick={() => setForm({ dias: "180" })}
                >
                  180 días
                </Badge>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => closeDialog(false)}
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
                  Guardando
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Guardar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={deleteDialog.open} onOpenChange={closeDeleteDialog}>
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
                ¿Estás seguro de que deseas eliminar esta frecuencia?
              </p>
              <p className="text-xs text-red-700 mt-2">
                ⚠️ Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="space-y-3 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">ID:</span>
                <Badge variant="outline">{deleteDialog.item?.id ?? "-"}</Badge>
              </div>
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Días:</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold text-gray-900">
                    {deleteDialog.item?.dias ?? "-"}
                  </span>
                  <span className="text-xs text-gray-600">días</span>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => closeDeleteDialog(false)}
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
                  Eliminando
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}