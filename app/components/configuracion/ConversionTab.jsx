"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";

import { CSS } from "@dnd-kit/utilities";

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
  GripVertical,
  GitBranch,
  Info,
  CheckCircle2,
  Circle,
} from "lucide-react";

function normalizeArray(x) {
  return Array.isArray(x) ? x : [];
}

function isHexColor(v) {
  if (!v) return true;
  return /^#[0-9A-Fa-f]{6}$/.test(String(v).trim());
}

function SortableRow({ item, onEdit, onDelete, onToggleActive }) {
  const id = Number(item.id);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.65 : 1,
  };

  const isActive = Number(item.is_active);

  return (
    <TooltipProvider>
      <div
        ref={setNodeRef}
        style={style}
        className={`flex items-center gap-3 border-2 rounded-lg p-4 transition-all ${
          isDragging
            ? "bg-slate-100 border-blue-400 shadow-lg"
            : isActive
            ? "bg-white border-slate-200 hover:border-blue-300 hover:shadow-md"
            : "bg-slate-50 border-slate-200 opacity-60"
        }`}
      >
        {/* Drag Handle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 transition-colors flex-shrink-0"
              {...attributes}
              {...listeners}
              aria-label="Arrastrar para reordenar"
            >
              <GripVertical className="h-5 w-5" />
            </button>
          </TooltipTrigger>
          <TooltipContent>Arrastra para reordenar las etapas</TooltipContent>
        </Tooltip>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="font-semibold text-slate-900 truncate">
              {item.nombre}
            </div>

            {/* Color Badge */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-2 text-xs px-2.5 py-1 rounded-full border border-slate-200 bg-slate-50 cursor-help hover:bg-slate-100 transition-colors">
                  <span
                    className="h-3 w-3 rounded-full border-2 border-slate-300 shadow-sm"
                    style={{ background: item.color || "#ccc" }}
                  />
                  <span className="text-slate-600 font-mono">
                    {item.color || "sin color"}
                  </span>
                </span>
              </TooltipTrigger>
              <TooltipContent>Color de identificación</TooltipContent>
            </Tooltip>

            {/* Status Badge */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  className={`text-xs font-semibold gap-1 ${
                    isActive
                      ? "bg-green-100 text-green-700 border border-green-300"
                      : "bg-slate-200 text-slate-600 border border-slate-300"
                  }`}
                >
                  {isActive ? (
                    <CheckCircle2 className="h-3 w-3" />
                  ) : (
                    <Circle className="h-3 w-3" />
                  )}
                  {isActive ? "Activo" : "Inactivo"}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                {isActive
                  ? "Esta etapa está disponible"
                  : "Esta etapa está desactivada"}
              </TooltipContent>
            </Tooltip>

            {/* Sort Order */}
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-slate-500 font-medium px-2 py-1 bg-slate-100 rounded cursor-help">
                  #{item.sort_order ?? "—"}
                </span>
              </TooltipTrigger>
              <TooltipContent>Orden en el flujo de conversión</TooltipContent>
            </Tooltip>
          </div>

          {item.descripcion && (
            <div className="text-xs text-slate-600 truncate mt-1">
              {item.descripcion}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onToggleActive(item)}
                className={`border-slate-300 ${
                  isActive
                    ? "hover:bg-red-50 hover:border-red-300"
                    : "hover:bg-green-50 hover:border-green-300"
                }`}
              >
                {isActive ? (
                  <Circle className="h-4 w-4 text-red-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isActive ? "Desactivar etapa" : "Activar etapa"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEdit(item)}
                className="border-slate-300 hover:bg-amber-50 hover:border-amber-300"
              >
                <Pencil className="h-4 w-4 text-amber-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Editar etapa</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDelete(item)}
                className="border-slate-300 hover:bg-red-50 hover:border-red-300"
              >
                <Trash2 className="h-4 w-4 text-red-600" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Eliminar etapa</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default function ConversionTab() {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } })
  );

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialog, setDialog] = useState({
    open: false,
    mode: "create",
    data: null,
  });

  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    color: "#3B82F6",
  });

  const [saving, setSaving] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    item: null,
  });

  const [deleting, setDeleting] = useState(false);

  const ids = useMemo(() => items.map((x) => Number(x.id)), [items]);

  async function load() {
    try {
      setLoading(true);

      const r = await fetch("/api/etapasconversion", { cache: "no-store" });
      const data = await r.json().catch(() => []);

      if (!r.ok) {
        toast.error(data?.message || "Error cargando etapas");
        setItems([]);
        return;
      }

      const arr = normalizeArray(data).map((x) => ({
        ...x,
        id: Number(x.id),
        sort_order:
          x.sort_order === null || x.sort_order === undefined
            ? null
            : Number(x.sort_order),
        is_active: Number(x.is_active) ? 1 : 0,
      }));

      setItems(arr);
    } catch (e) {
      console.log(e);
      toast.error("Error cargando etapas");
      setItems([]);
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
      descripcion: "",
      color: "#3B82F6",
    });
    setDialog({ open: true, mode: "create", data: null });
  }

  function openEdit(item) {
    setForm({
      nombre: item?.nombre ?? "",
      descripcion: item?.descripcion ?? "",
      color: item?.color ?? "#3B82F6",
    });
    setDialog({ open: true, mode: "edit", data: item });
  }

  function closeDialog(v) {
    setDialog((p) => ({ ...p, open: v }));
    if (!v) setSaving(false);
  }

  function closeDeleteDialog(v) {
    setDeleteDialog((p) => ({ ...p, open: v }));
    if (!v) setDeleting(false);
  }

  async function save() {
    const nombre = String(form.nombre ?? "").trim();
    const descripcion = String(form.descripcion ?? "").trim();
    const color = String(form.color ?? "").trim();

    if (!nombre) return toast.error("Nombre es requerido");
    if (!isHexColor(color)) return toast.error("Color debe ser HEX (#RRGGBB)");

    const isEdit = dialog.mode === "edit" && dialog.data?.id != null;
    const url = isEdit
      ? `/api/etapasconversion/${dialog.data.id}`
      : "/api/etapasconversion";
    const method = isEdit ? "PUT" : "POST";

    try {
      setSaving(true);

      if (!isEdit) {
        const r = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre,
            descripcion: descripcion === "" ? null : descripcion,
            color: color === "" ? null : color,
          }),
        });

        const data = await r.json().catch(() => ({}));
        if (!r.ok) return toast.error(data?.message || "No se pudo crear");

        toast.success("Etapa creada correctamente");
      } else {
        const original = items.find(
          (x) => Number(x.id) === Number(dialog.data.id)
        );

        const r = await fetch(url, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            nombre,
            descripcion: descripcion === "" ? null : descripcion,
            color: color === "" ? null : color,
            sort_order: original?.sort_order ?? dialog.data.sort_order ?? null,
            is_active: original?.is_active ?? dialog.data.is_active ?? 1,
          }),
        });

        const data = await r.json().catch(() => ({}));
        if (!r.ok) return toast.error(data?.message || "No se pudo actualizar");

        toast.success("Etapa actualizada correctamente");
      }

      setDialog({ open: false, mode: "create", data: null });
      await load();
    } catch (e) {
      console.log(e);
      toast.error("Error guardando etapa");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(item) {
    try {
      const id = Number(item?.id);
      if (Number.isNaN(id)) return;

      const r = await fetch(`/api/etapasconversion/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: item.nombre,
          descripcion: item.descripcion ?? null,
          color: item.color ?? null,
          sort_order: item.sort_order ?? null,
          is_active: Number(item.is_active) ? 0 : 1,
        }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) return toast.error(data?.message || "No se pudo actualizar");

      setItems((prev) =>
        prev.map((x) =>
          x.id === id ? { ...x, is_active: Number(x.is_active) ? 0 : 1 } : x
        )
      );

      toast.success(Number(item.is_active) ? "Etapa desactivada" : "Etapa activada");
    } catch (e) {
      console.log(e);
      toast.error("Error actualizando");
    }
  }

  async function confirmDelete() {
    const id = Number(deleteDialog.item?.id);
    if (Number.isNaN(id)) return;

    try {
      setDeleting(true);

      const r = await fetch(`/api/etapasconversion/${id}`, {
        method: "DELETE",
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) return toast.error(data?.message || "No se pudo eliminar");

      toast.success("Etapa eliminada correctamente");
      setDeleteDialog({ open: false, item: null });
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (e) {
      console.log(e);
      toast.error("Error eliminando etapa");
    } finally {
      setDeleting(false);
    }
  }

  async function persistSortOrder(payload) {
    try {
      await Promise.all(
        payload.map((it) =>
          fetch(`/api/etapasconversion/${it.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              nombre: it.nombre,
              descripcion: it.descripcion ?? null,
              color: it.color ?? null,
              sort_order: it.sort_order,
              is_active: Number(it.is_active) ? 1 : 0,
            }),
          }).then(async (r) => {
            if (!r.ok) {
              const d = await r.json().catch(() => ({}));
              throw new Error(d?.message || "Error guardando orden");
            }
          })
        )
      );

      toast.success("Orden guardado correctamente");
    } catch (e) {
      console.log(e);
      toast.error("No se pudo guardar el orden");
      await load();
    }
  }

  function onDragEnd(event) {
    const { active, over } = event;
    if (!over) return;
    if (active.id === over.id) return;

    setItems((prev) => {
      const oldIndex = prev.findIndex(
        (x) => Number(x.id) === Number(active.id)
      );
      const newIndex = prev.findIndex(
        (x) => Number(x.id) === Number(over.id)
      );

      if (oldIndex === -1 || newIndex === -1) return prev;

      const moved = arrayMove(prev, oldIndex, newIndex);
      const payload = moved.map((it, idx) => ({
        ...it,
        sort_order: idx + 1,
      }));

      persistSortOrder(payload);
      return payload;
    });
  }

  const activeCount = items.filter((x) => Number(x.is_active)).length;

  return (
    <TooltipProvider>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <div className="border-b border-slate-200 pb-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
                <GitBranch className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-slate-900">
                  Etapas de Conversión
                </h1>
                <p className="text-sm text-slate-500 mt-1">
                  Define y ordena las etapas del flujo de conversión de leads
                </p>
              </div>
            </div>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={openCreate}
                  className="gap-2 bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Nueva Etapa
                </Button>
              </TooltipTrigger>
              <TooltipContent>Crear una nueva etapa de conversión</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-blue-600 font-medium">
                    Total de Etapas
                  </p>
                  <p className="text-3xl font-bold text-blue-900 mt-2">
                    {items.length}
                  </p>
                </div>
                <GitBranch className="h-12 w-12 text-blue-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-green-600 font-medium">
                    Etapas Activas
                  </p>
                  <p className="text-3xl font-bold text-green-900 mt-2">
                    {activeCount}
                  </p>
                </div>
                <CheckCircle2 className="h-12 w-12 text-green-200" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600 font-medium">
                    Inactivas
                  </p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">
                    {items.length - activeCount}
                  </p>
                </div>
                <Circle className="h-12 w-12 text-slate-200" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* LISTA */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="pb-4 border-b border-slate-100">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-blue-600" />
                Flujo de Conversión
              </CardTitle>
              <Badge variant="secondary" className="text-xs">
                {items.length} etapas
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              Arrastra para reordenar las etapas en el flujo
            </p>
          </CardHeader>

          <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center space-y-3">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                  <p className="text-sm text-slate-500">Cargando etapas...</p>
                </div>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <div className="p-3 bg-slate-100 rounded-lg">
                  <GitBranch className="h-6 w-6 text-slate-400" />
                </div>
                <p className="text-sm text-slate-500 font-medium">
                  No hay etapas de conversión
                </p>
                <p className="text-xs text-slate-400">
                  Crea la primera etapa para comenzar
                </p>
              </div>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={onDragEnd}
              >
                <SortableContext
                  items={ids}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {items.map((item) => (
                      <SortableRow
                        key={item.id}
                        item={item}
                        onEdit={openEdit}
                        onDelete={(it) =>
                          setDeleteDialog({ open: true, item: it })
                        }
                        onToggleActive={toggleActive}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
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
                <li>
                  Arrastra las etapas para cambiar el orden en el flujo de conversión
                </li>
                <li>Las etapas inactivas no apareceran en los formularios</li>
                <li>El color identifica visualmente cada etapa</li>
                <li>Los cambios se guardan automáticamente</li>
              </ul>
            </div>
          </div>
        </div>

        {/* DIALOG CREATE / EDIT */}
        <Dialog open={dialog.open} onOpenChange={closeDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <GitBranch className="h-5 w-5 text-blue-600" />
                {dialog.mode === "edit"
                  ? "Editar Etapa"
                  : "Nueva Etapa de Conversión"}
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
                      Nombre descriptivo de la etapa (ej: Lead, Cotización, etc)
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  value={form.nombre}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, nombre: e.target.value }))
                  }
                  placeholder="Ej: Cotización"
                  className="border-slate-300 focus:border-blue-500"
                  autoFocus
                />
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
                      Descripción adicional de la etapa
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Input
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, descripcion: e.target.value }))
                  }
                  placeholder="Ej: Cliente ha solicitado cotización"
                  className="border-slate-300 focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-semibold text-slate-700">
                    Color
                  </label>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-slate-400 cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      Color para identificar esta etapa visualmente
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={form.color || "#000000"}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, color: e.target.value }))
                    }
                    className="h-10 w-16 p-1 cursor-pointer border-slate-300"
                  />
                  <Input
                    value={form.color}
                    onChange={(e) =>
                      setForm((p) => ({ ...p, color: e.target.value }))
                    }
                    placeholder="#3B82F6"
                    className="border-slate-300 focus:border-blue-500"
                  />
                </div>
                <p className="text-xs text-slate-500">
                  Formato: #RRGGBB (ej: #3B82F6)
                </p>
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
                className="bg-blue-600 hover:bg-blue-700"
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
                  ¿Eliminar etapa?
                </h3>

                <p className="text-sm text-slate-600 mt-2">
                  Se eliminará permanentemente esta etapa de conversión:
                </p>

                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-semibold text-red-900">
                    {deleteDialog.item?.nombre ?? "-"}
                  </p>
                  {deleteDialog.item?.descripcion && (
                    <p className="text-xs text-red-700 mt-1">
                      {deleteDialog.item.descripcion}
                    </p>
                  )}
                </div>

                <p className="text-xs text-slate-500 mt-3 font-medium">
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