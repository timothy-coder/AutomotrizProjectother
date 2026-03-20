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
  Clock,
  Palette,
  calendarRange,
  FileText,
  CheckCircle,
  TrendingUp,
  Copy,
} from "lucide-react";

export default function ConfiguracionEstadosTiempoTabpv() {
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
      const r = await fetch("/api/configuracion-estados-tiempopv", {
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
      ? `/api/configuracion-estados-tiempopv/${dialog.data.id}`
      : "/api/configuracion-estados-tiempopv";
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
        `/api/configuracion-estados-tiempopv/${id}`,
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
    return [...rows].sort(
      (a, b) => Number(a.minutos_desde) - Number(b.minutos_desde)
    );
  }, [rows]);

  const stats = useMemo(() => {
    return {
      total: rows.length,
      minRange: sorted.length > 0 ? sorted[0].minutos_desde : 0,
      maxRange: sorted.length > 0 ? sorted[sorted.length - 1].minutos_hasta : 0,
    };
  }, [sorted, rows]);

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 pb-8">
        {/* HEADER ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">
                        Total Estados
                      </p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">
                        {stats.total}
                      </p>
                    </div>
                    <Clock className="h-12 w-12 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Cantidad total de estados configurados
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">
                        Rango Mínimo
                      </p>
                      <p className="text-3xl font-bold text-green-900 mt-2">
                        {stats.minRange}
                      </p>
                      <p className="text-xs text-green-600 mt-1">minutos</p>
                    </div>
                    <TrendingUp className="h-12 w-12 text-green-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Inicio del rango de tiempo más bajo
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">
                        Rango Máximo
                      </p>
                      <p className="text-3xl font-bold text-purple-900 mt-2">
                        {stats.maxRange}
                      </p>
                      <p className="text-xs text-purple-600 mt-1">minutos</p>
                    </div>
                    <calendarRange className="h-12 w-12 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Fin del rango de tiempo más alto
            </TooltipContent>
          </Tooltip>
        </div>

        {/* MAIN CARD */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-bold text-gray-900">
                  Estados de Tiempo
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Gestiona los estados y rangos de tiempo para el seguimiento
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
                    Nuevo Estado
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Crear nuevo estado de tiempo
                </TooltipContent>
              </Tooltip>

              <Badge variant="secondary" className="bg-blue-100 text-blue-900 border-blue-300">
                <CheckCircle className="h-3 w-3 mr-1" />
                {stats.total} registros
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">Cargando configuración...</p>
              </div>
            ) : sorted.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-gray-100 rounded-full mb-3">
                  <Clock className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  No hay registros configurados
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Crea el primero haciendo clic en "Nuevo Estado"
                </p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th className="text-left p-3 font-semibold text-gray-700 cursor-help">
                            ID
                          </th>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Identificador único del registro
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th className="text-left p-3 font-semibold text-gray-700 cursor-help">
                            Nombre
                          </th>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Nombre descriptivo del estado
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th className="text-left p-3 font-semibold text-gray-700 cursor-help">
                            Estado
                          </th>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Identificador del estado (verde, amarillo, rojo)
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th className="text-left p-3 font-semibold text-gray-700 cursor-help">
                            Desde (min)
                          </th>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Rango mínimo en minutos
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th className="text-left p-3 font-semibold text-gray-700 cursor-help">
                            Hasta (min)
                          </th>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Rango máximo en minutos
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th className="text-left p-3 font-semibold text-gray-700 cursor-help">
                            Color
                          </th>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Color hexadecimal de representación
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <th className="text-left p-3 font-semibold text-gray-700 cursor-help">
                            Descripción
                          </th>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Detalles adicionales sobre el estado
                        </TooltipContent>
                      </Tooltip>

                      <th className="text-right p-3 font-semibold text-gray-700">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {sorted.map((item, idx) => (
                      <tr
                        key={item.id}
                        className={`border-b hover:bg-blue-50 transition-colors ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs font-mono">
                            {item.id}
                          </Badge>
                        </td>
                        <td className="p-3 font-medium text-gray-900">
                          {item.nombre}
                        </td>
                        <td className="p-3">
                          <Badge className="bg-blue-100 text-blue-900 hover:bg-blue-200 border border-blue-300">
                            {item.estado}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <span className="text-gray-900 font-semibold">
                            {item.minutos_desde}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="text-gray-900 font-semibold">
                            {item.minutos_hasta}
                          </span>
                        </td>
                        <td className="p-3">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-2 cursor-help">
                                <div
                                  className="w-7 h-7 rounded-lg border-2 border-gray-300 shadow-sm hover:shadow-md transition-shadow"
                                  style={{
                                    backgroundColor: item.color_hexadecimal,
                                  }}
                                />
                                <span className="text-xs font-mono text-gray-600">
                                  {item.color_hexadecimal}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {item.color_hexadecimal}
                            </TooltipContent>
                          </Tooltip>
                        </td>
                        <td className="p-3 text-xs text-gray-600">
                          {item.descripcion ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help truncate block max-w-xs line-clamp-2">
                                  {item.descripcion}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                {item.descripcion}
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="p-3">
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
                                  <span className="hidden sm:inline">Editar</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Editar este estado
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
                                  <span className="hidden sm:inline">Eliminar</span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Eliminar este estado
                              </TooltipContent>
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
        {!loading && sorted.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-1">
              <p className="font-semibold">Información importante:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Los estados se ordenan automáticamente por minutos desde</li>
                <li>Los rangos no deben solaparse para evitar conflictos</li>
                <li>El color se usa para identificación visual en reportes</li>
                <li>Eliminar un estado puede afectar datos históricos</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* DIALOG CREATE/EDIT */}
      <Dialog open={dialog.open} onOpenChange={closeDialog}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              {dialog.mode === "edit" ? (
                <>
                  <Pencil className="h-5 w-5 text-blue-600" />
                  Editar Estado
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-blue-600" />
                  Nuevo Estado
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Nombre */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700">
                  Nombre
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Nombre descriptivo (ej: Tiempo Suficiente)
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <Input
                value={form.nombre}
                onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                placeholder="Ej: Tiempo suficiente"
                disabled={saving}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Estado */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700">
                  Estado
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Código (ej: verde, amarillo, rojo)
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <Input
                value={form.estado}
                onChange={(e) => setForm({ ...form, estado: e.target.value })}
                placeholder="Ej: verde"
                disabled={saving}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Rango de Minutos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Desde
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Minuto inicial del rango
                    </TooltipContent>
                  </Tooltip>
                  <span className="text-red-500">*</span>
                </div>
                <Input
                  type="number"
                  value={form.minutos_desde}
                  onChange={(e) =>
                    setForm({ ...form, minutos_desde: e.target.value })
                  }
                  placeholder="0"
                  disabled={saving}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-gray-700">
                    Hasta
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-gray-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Minuto final del rango
                    </TooltipContent>
                  </Tooltip>
                  <span className="text-red-500">*</span>
                </div>
                <Input
                  type="number"
                  value={form.minutos_hasta}
                  onChange={(e) =>
                    setForm({ ...form, minutos_hasta: e.target.value })
                  }
                  placeholder="999999"
                  disabled={saving}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Color */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700">
                  Color
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Selecciona o ingresa código hexadecimal
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <div className="flex gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      type="color"
                      value={form.color_hexadecimal}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          color_hexadecimal: e.target.value,
                        })
                      }
                      disabled={saving}
                      className="h-10 w-16 cursor-pointer border-gray-300 rounded"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top">Selector de color</TooltipContent>
                </Tooltip>

                <Input
                  value={form.color_hexadecimal}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      color_hexadecimal: e.target.value,
                    })
                  }
                  placeholder="#28a745"
                  disabled={saving}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-sm font-semibold text-gray-700">
                  Descripción
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Opcional: detalles adicionales
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                value={form.descripcion}
                onChange={(e) =>
                  setForm({ ...form, descripcion: e.target.value })
                }
                placeholder="Ej: Más de 15 minutos antes..."
                disabled={saving}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
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
                ¿Estás seguro de que deseas eliminar este registro?
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
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">Nombre:</span>
                <span className="text-gray-900">{deleteDialog.item?.nombre ?? "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">Estado:</span>
                <Badge className="bg-blue-100 text-blue-900">
                  {deleteDialog.item?.estado ?? "-"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-semibold text-gray-700">Rango:</span>
                <span className="text-gray-900 font-mono">
                  {deleteDialog.item?.minutos_desde ?? "-"}-
                  {deleteDialog.item?.minutos_hasta ?? "-"} min
                </span>
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