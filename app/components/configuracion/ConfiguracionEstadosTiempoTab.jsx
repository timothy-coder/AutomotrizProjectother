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
  Clock,
  Info,
  Palette,
} from "lucide-react";

export default function ConfiguracionEstadosTiempoTab() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialog, setDialog] = useState({
    open: false,
    mode: "create", // create | edit
    data: null,
  });

  const [form, setForm] = useState({
    nombre: "",
    estado: "",
    minutos_desde: "",
    minutos_hasta: "",
    color_hexadecimal: "#28a745",
    descripcion: "",
  });
  const [saving, setSaving] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    item: null,
  });
  const [deleting, setDeleting] = useState(false);

  async function load() {
    try {
      setLoading(true);
      const r = await fetch("/api/configuracion-estados-tiempo", {
        cache: "no-store",
      });
      const data = await r.json();

      if (!r.ok) {
        toast.error(data?.message || "Error cargando configuración");
        setRows([]);
        return;
      }

      setRows(Array.isArray(data) ? data : []);
    } catch (e) {
      console.log(e);
      toast.error("Error cargando configuración");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  function openCreate() {
    setForm({
      nombre: "",
      estado: "",
      minutos_desde: "",
      minutos_hasta: "",
      color_hexadecimal: "#28a745",
      descripcion: "",
    });
    setDialog({ open: true, mode: "create", data: null });
  }

  function openEdit(item) {
    setForm({
      nombre: String(item?.nombre ?? ""),
      estado: String(item?.estado ?? ""),
      minutos_desde: String(item?.minutos_desde ?? ""),
      minutos_hasta: String(item?.minutos_hasta ?? ""),
      color_hexadecimal: String(item?.color_hexadecimal ?? "#28a745"),
      descripcion: String(item?.descripcion ?? ""),
    });
    setDialog({ open: true, mode: "edit", data: item });
  }

  function closeDialog(v) {
    setDialog((prev) => ({ ...prev, open: v }));
    if (!v) {
      setSaving(false);
      setForm({
        nombre: "",
        estado: "",
        minutos_desde: "",
        minutos_hasta: "",
        color_hexadecimal: "#28a745",
        descripcion: "",
      });
    }
  }

  function closeDeleteDialog(v) {
    setDeleteDialog((prev) => ({ ...prev, open: v }));
    if (!v) {
      setDeleting(false);
    }
  }

  async function save() {
    const minutosDesdNum = Number(form.minutos_desde);
    const minutosHastaNum = Number(form.minutos_hasta);

    // Validaciones
    if (!form.nombre?.trim()) {
      toast.error("Nombre es obligatorio");
      return;
    }

    if (!form.estado?.trim()) {
      toast.error("Estado es obligatorio");
      return;
    }

    if (form.minutos_desde === "" || Number.isNaN(minutosDesdNum)) {
      toast.error("Minutos desde debe ser un número");
      return;
    }

    if (form.minutos_hasta === "" || Number.isNaN(minutosHastaNum)) {
      toast.error("Minutos hasta debe ser un número");
      return;
    }

    if (minutosDesdNum > minutosHastaNum) {
      toast.error("Minutos desde no puede ser mayor que minutos hasta");
      return;
    }

    if (!form.color_hexadecimal?.trim()) {
      toast.error("Color es obligatorio");
      return;
    }

    const isEdit = dialog.mode === "edit" && dialog.data?.id != null;
    const url = isEdit
      ? `/api/configuracion-estados-tiempo/${dialog.data.id}`
      : "/api/configuracion-estados-tiempo";
    const method = isEdit ? "PUT" : "POST";

    try {
      setSaving(true);

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: form.nombre.trim(),
          estado: form.estado.trim(),
          minutos_desde: minutosDesdNum,
          minutos_hasta: minutosHastaNum,
          color_hexadecimal: form.color_hexadecimal.trim(),
          descripcion: form.descripcion?.trim() || null,
        }),
      });

      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        toast.error(data?.message || "No se pudo guardar");
        return;
      }

      toast.success(
        isEdit
          ? "Estado de tiempo actualizado"
          : "Estado de tiempo creado"
      );
      setDialog({ open: false, mode: "create", data: null });
      setForm({
        nombre: "",
        estado: "",
        minutos_desde: "",
        minutos_hasta: "",
        color_hexadecimal: "#28a745",
        descripcion: "",
      });
      await load();
    } catch (e) {
      console.log(e);
      toast.error("Error guardando estado de tiempo");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    const id = deleteDialog.item?.id;
    if (!id) return;

    try {
      setDeleting(true);

      const r = await fetch(
        `/api/configuracion-estados-tiempo/${id}`,
        { method: "DELETE" }
      );
      const data = await r.json().catch(() => ({}));

      if (!r.ok) {
        toast.error(data?.message || "No se pudo eliminar");
        return;
      }

      toast.success("Estado de tiempo eliminado");
      setDeleteDialog({ open: false, item: null });
      await load();
    } catch (e) {
      console.log(e);
      toast.error("Error eliminando estado de tiempo");
    } finally {
      setDeleting(false);
    }
  }

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => Number(a.minutos_desde) - Number(b.minutos_desde));
  }, [rows]);

  return (
    <TooltipProvider>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <div className="border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Estados de Tiempo
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Configura los rangos de tiempo y códigos de color para citas
                </p>
              </div>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={openCreate}
                  className="gap-2 bg-violet-600 hover:bg-violet-700"
                >
                  <Plus className="h-4 w-4" />
                  Nuevo Estado
                </Button>
              </TooltipTrigger>
              <TooltipContent>Crear un nuevo estado de tiempo</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-violet-50 to-violet-100 border-violet-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-violet-600 font-medium">
                    Total de Estados
                  </p>
                  <p className="text-3xl font-bold text-violet-900 mt-2">
                    {rows.length}
                  </p>
                </div>
                <Clock className="h-12 w-12 text-violet-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    Rango Mínimo
                  </p>
                  <p className="text-3xl font-bold text-blue-900 mt-2">
                    {sorted.length > 0 ? sorted[0].minutos_desde : "-"}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">minutos</p>
                </div>
                <Palette className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-purple-600 font-medium">
                    Rango Máximo
                  </p>
                  <p className="text-3xl font-bold text-purple-900 mt-2">
                    {sorted.length > 0 ? sorted[sorted.length - 1].minutos_hasta : "-"}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">minutos</p>
                </div>
                <Clock className="h-12 w-12 text-purple-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* TABLA */}
        <Card className="border-slate-200 shadow-sm overflow-hidden">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-violet-600" />
                Listado de Estados
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {rows.length} registros
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-violet-600 mx-auto" />
                  <p className="text-sm text-slate-500">Cargando estados...</p>
                </div>
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="p-3 bg-slate-100 rounded-lg">
                  <Clock className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500 font-medium">
                  No hay estados de tiempo registrados
                </p>
                <p className="text-xs text-slate-400">
                  Crea el primer estado para comenzar
                </p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-slate-200 bg-slate-50">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th className="text-left p-3 font-semibold text-slate-700 cursor-help">
                            ID
                          </th>
                        </TooltipTrigger>
                        <TooltipContent>Identificador único</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th className="text-left p-3 font-semibold text-slate-700 cursor-help">
                            Nombre
                          </th>
                        </TooltipTrigger>
                        <TooltipContent>Nombre del estado</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th className="text-left p-3 font-semibold text-slate-700 cursor-help">
                            Estado
                          </th>
                        </TooltipTrigger>
                        <TooltipContent>Código o categoría</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th className="text-left p-3 font-semibold text-slate-700 cursor-help">
                            Desde (min)
                          </th>
                        </TooltipTrigger>
                        <TooltipContent>Minutos iniciales del rango</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th className="text-left p-3 font-semibold text-slate-700 cursor-help">
                            Hasta (min)
                          </th>
                        </TooltipTrigger>
                        <TooltipContent>Minutos finales del rango</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th className="text-left p-3 font-semibold text-slate-700 cursor-help">
                            Color
                          </th>
                        </TooltipTrigger>
                        <TooltipContent>Color de identificación visual</TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th className="text-left p-3 font-semibold text-slate-700 cursor-help">
                            Descripción
                          </th>
                        </TooltipTrigger>
                        <TooltipContent>Detalles adicionales</TooltipContent>
                      </Tooltip>

                      <th className="text-right p-3 font-semibold text-slate-700">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sorted.map((item) => (
                      <tr
                        key={item.id}
                        className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      >
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs font-mono">
                            {item.id}
                          </Badge>
                        </td>
                        <td className="p-3 font-medium text-slate-900">
                          {item.nombre}
                        </td>
                        <td className="p-3">
                          <Badge className="bg-slate-200 text-slate-700 hover:bg-slate-300">
                            {item.estado}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-blue-600">
                            {item.minutos_desde}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-blue-600">
                            {item.minutos_hasta}
                          </span>
                        </td>
                        <td className="p-3">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 cursor-help">
                                <div
                                  className="w-6 h-6 rounded border-2 border-slate-300 shadow-sm"
                                  style={{
                                    backgroundColor: item.color_hexadecimal,
                                  }}
                                />
                                <span className="text-xs font-mono text-slate-600">
                                  {item.color_hexadecimal}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent>
                              Color: {item.color_hexadecimal}
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="p-3 text-xs text-slate-600">
                          {item.descripcion ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help line-clamp-2">
                                  {item.descripcion}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{item.descripcion}</TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="p-3">
                          <div className="flex justify-end gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openEdit(item)}
                                  className="border-slate-300 hover:bg-amber-50 hover:border-amber-300"
                                >
                                  <Pencil className="h-4 w-4 text-amber-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Editar estado</TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setDeleteDialog({ open: true, item })
                                  }
                                  className="border-slate-300 hover:bg-red-50 hover:border-red-300"
                                >
                                  <Trash2 className="h-4 w-4 text-red-600" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>Eliminar estado</TooltipContent>
                            </Tooltip>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* INFO BOX */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Información importante:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Los estados se ordenan automáticamente por minutos desde</li>
                <li>Los rangos de tiempo no deben solaparse</li>
                <li>El color hexadecimal se utiliza para identificación visual</li>
                <li>Eliminar un estado puede afectar reportes existentes</li>
              </ul>
            </div>
          </div>
        </div>

        {/* DIALOG CREATE / EDIT */}
        <Dialog open={dialog.open} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-violet-600" />
                {dialog.mode === "edit"
                  ? "Editar Estado de Tiempo"
                  : "Nuevo Estado de Tiempo"}
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
                      Nombre descriptivo del estado (ej: Tiempo Suficiente)
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  value={form.nombre}
                  onChange={(e) =>
                    setForm({ ...form, nombre: e.target.value })
                  }
                  placeholder="Ej: Tiempo suficiente"
                  className="border-slate-300 focus:border-violet-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Estado/Categoría
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Código o categoría (ej: verde, amarillo, rojo)
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  value={form.estado}
                  onChange={(e) =>
                    setForm({ ...form, estado: e.target.value })
                  }
                  placeholder="Ej: verde"
                  className="border-slate-300 focus:border-violet-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Desde (min)
                    </label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Minuto inicial del rango
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    type="number"
                    value={form.minutos_desde}
                    onChange={(e) =>
                      setForm({ ...form, minutos_desde: e.target.value })
                    }
                    placeholder="Ej: 0"
                    className="border-slate-300 focus:border-violet-500"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-semibold text-slate-700">
                      Hasta (min)
                    </label>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Info className="h-4 w-4 text-slate-400 cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        Minuto final del rango
                      </TooltipContent>
                    </Tooltip>
                  </div>
                  <Input
                    type="number"
                    value={form.minutos_hasta}
                    onChange={(e) =>
                      setForm({ ...form, minutos_hasta: e.target.value })
                    }
                    placeholder="Ej: 15"
                    className="border-slate-300 focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Color Hexadecimal
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Color para identificar visualmente este estado
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={form.color_hexadecimal}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        color_hexadecimal: e.target.value,
                      })
                    }
                    className="h-10 w-16 cursor-pointer border-slate-300"
                  />
                  <Input
                    value={form.color_hexadecimal}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        color_hexadecimal: e.target.value,
                      })
                    }
                    placeholder="#28a745"
                    className="border-slate-300 focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Descripción
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Información adicional sobre este estado
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm({ ...form, descripcion: e.target.value })
                  }
                  placeholder="Ej: Más de 15 minutos antes de la hora agendada"
                  className="border-slate-300 focus:border-violet-500"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => closeDialog(false)}
                disabled={saving}
                className="border-slate-300"
              >
                Cancelar
              </Button>
              <Button
                onClick={save}
                disabled={saving}
                className="bg-violet-600 hover:bg-violet-700"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando
                  </>
                ) : (
                  "Guardar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DELETE DIALOG */}
        <Dialog open={deleteDialog.open} onOpenChange={closeDeleteDialog}>
          <DialogContent className="sm:max-w-md">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="bg-red-100 p-4 rounded-full">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>

              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  ¿Eliminar estado?
                </h3>

                <p className="text-sm text-slate-600 mt-2">
                  Se eliminará permanentemente este registro:
                </p>

                <div className="mt-3 space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-left text-xs">
                  <div>
                    <span className="font-semibold text-slate-700">ID:</span>{" "}
                    <span className="text-slate-600">
                      {deleteDialog.item?.id ?? "-"}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Nombre:</span>{" "}
                    <span className="text-slate-600">
                      {deleteDialog.item?.nombre ?? "-"}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Estado:</span>{" "}
                    <span className="text-slate-600">
                      {deleteDialog.item?.estado ?? "-"}
                    </span>
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">Rango:</span>{" "}
                    <span className="text-slate-600">
                      {deleteDialog.item?.minutos_desde ?? "-"} a{" "}
                      {deleteDialog.item?.minutos_hasta ?? "-"} minutos
                    </span>
                  </div>
                </div>

                <p className="text-xs text-red-600 mt-3 font-medium">
                  ⚠️ Esta acción no se puede deshacer
                </p>
              </div>

              <div className="flex gap-3 w-full pt-4">
                <Button
                  variant="outline"
                  className="flex-1 border-slate-300"
                  onClick={() => closeDeleteDialog(false)}
                  disabled={deleting}
                >
                  Cancelar
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={confirmDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Eliminando
                    </>
                  ) : (
                    "Eliminar"
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}