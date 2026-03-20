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
  Info,
  GitBranch,
  ArrowUp,
  ArrowDown,
  Eye,
  EyeOff,
  Palette,
} from "lucide-react";

function normalizeArray(x) {
  return Array.isArray(x) ? x : [];
}

function isHexColor(v) {
  if (!v) return true;
  return /^#[0-9A-Fa-f]{6}$/.test(String(v).trim());
}

function SortableRow({ item, onEdit, onDelete, onToggleActive, index, total }) {
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
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-3 border-2 rounded-lg p-4 transition-all ${
        isDragging
          ? "border-blue-400 bg-blue-50 shadow-lg"
          : isActive
            ? "border-blue-200 bg-white hover:border-blue-300 hover:shadow-md"
            : "border-gray-200 bg-gray-50 hover:border-gray-300"
      }`}
    >
      {/* GRIP HANDLE */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            className="cursor-grab active:cursor-grabbing text-blue-500 hover:text-blue-700 transition-colors flex-shrink-0"
            {...attributes}
            {...listeners}
            aria-label="Arrastrar para reordenar"
          >
            <GripVertical className="h-5 w-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">
          Arrastra para cambiar el orden ({index + 1} de {total})
        </TooltipContent>
      </Tooltip>

      {/* CONTENIDO */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-2">
          {/* Nombre */}
          <div className="font-semibold text-gray-900 truncate">
            {item.nombre}
          </div>

          {/* Color Badge */}
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full border border-gray-300 hover:border-gray-400 cursor-help">
                <span
                  className="h-3 w-3 rounded-full border border-gray-400 shadow-sm"
                  style={{ background: item.color || "transparent" }}
                />
                <span className="font-mono text-gray-700">
                  {item.color || "sin color"}
                </span>
              </span>
            </TooltipTrigger>
            <TooltipContent side="top">
              Color: {item.color || "no especificado"}
            </TooltipContent>
          </Tooltip>

          {/* Estado Badge */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge
                variant="outline"
                className={
                  isActive
                    ? "bg-green-100 text-green-900 border-green-300"
                    : "bg-gray-100 text-gray-700 border-gray-300"
                }
              >
                {isActive ? (
                  <>
                    <Eye className="h-3 w-3 mr-1" />
                    Activo
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3 w-3 mr-1" />
                    Inactivo
                  </>
                )}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top">
              {isActive
                ? "Esta etapa está visible"
                : "Esta etapa está oculta"}
            </TooltipContent>
          </Tooltip>

          {/* Orden */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="secondary" className="bg-blue-100 text-blue-900 border-blue-300">
                <ArrowDown className="h-3 w-3 mr-1" />
                Orden: {item.sort_order ?? index + 1}
              </Badge>
            </TooltipTrigger>
            <TooltipContent side="top">
              Posición en el proceso de conversión
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Descripción */}
        {item.descripcion ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-sm text-gray-600 truncate hover:text-gray-900 cursor-help">
                {item.descripcion}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {item.descripcion}
            </TooltipContent>
          </Tooltip>
        ) : null}
      </div>

      {/* ACCIONES */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onToggleActive(item)}
              className={
                isActive
                  ? "border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400"
                  : "border-gray-300 text-gray-700 hover:bg-gray-100 hover:border-gray-400"
              }
            >
              {isActive ? (
                <>
                  <Eye className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Desactivar</span>
                </>
              ) : (
                <>
                  <EyeOff className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Activar</span>
                </>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">
            {isActive ? "Ocultar esta etapa" : "Mostrar esta etapa"}
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onEdit(item)}
              className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
            >
              <Pencil className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Editar</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Editar esta etapa</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={() => onDelete(item)}
            >
              <Trash2 className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Eliminar</span>
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Eliminar esta etapa</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}

export default function ConversionTabPv() {
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

      const r = await fetch("/api/etapasconversionpv", { cache: "no-store" });
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
      ? `/api/etapasconversionpv/${dialog.data.id}`
      : "/api/etapasconversionpv";
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

        toast.success("Etapa creada");
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

        toast.success("Etapa actualizada");
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

      const r = await fetch(`/api/etapasconversionpv/${id}`, {
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

      const r = await fetch(`/api/etapasconversionpv/${id}`, {
        method: "DELETE",
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) return toast.error(data?.message || "No se pudo eliminar");

      toast.success("Etapa eliminada");
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
          fetch(`/api/etapasconversionpv/${it.id}`, {
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

      toast.success("Orden guardado");
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

  const stats = useMemo(() => {
    return {
      total: items.length,
      active: items.filter((x) => Number(x.is_active)).length,
      inactive: items.filter((x) => !Number(x.is_active)).length,
    };
  }, [items]);

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
                        Total Etapas
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
              Cantidad total de etapas configuradas
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">
                        Activas
                      </p>
                      <p className="text-3xl font-bold text-green-900 mt-2">
                        {stats.active}
                      </p>
                    </div>
                    <Eye className="h-12 w-12 text-green-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Etapas visibles en el proceso
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        Inactivas
                      </p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {stats.inactive}
                      </p>
                    </div>
                    <EyeOff className="h-12 w-12 text-gray-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Etapas ocultas del proceso
            </TooltipContent>
          </Tooltip>
        </div>

        {/* MAIN CARD */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
                <GitBranch className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-bold text-gray-900">
                  Etapas de Conversión
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Arrastra para reordenar y gestiona las etapas del proceso
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
                    Nueva Etapa
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Crear nueva etapa de conversión
                </TooltipContent>
              </Tooltip>

              <Badge
                variant="secondary"
                className="bg-blue-100 text-blue-900 border-blue-300"
              >
                <GitBranch className="h-3 w-3 mr-1" />
                {stats.total} etapas
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">Cargando etapas...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-gray-100 rounded-full mb-3">
                  <GitBranch className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  No hay etapas configuradas
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Crea la primera etapa haciendo clic en "Nueva Etapa"
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg flex gap-2 text-sm text-blue-700">
                  <Info className="h-5 w-5 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Sugerencia:</p>
                    <p className="text-xs mt-1">
                      Arrastra las etapas para cambiar su orden en el proceso de
                      conversión
                    </p>
                  </div>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={onDragEnd}
                >
                  <SortableContext
                    items={ids}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-3">
                      {items.map((item, index) => (
                        <SortableRow
                          key={item.id}
                          item={item}
                          onEdit={openEdit}
                          onDelete={(it) =>
                            setDeleteDialog({ open: true, item: it })
                          }
                          onToggleActive={toggleActive}
                          index={index}
                          total={items.length}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
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
                <li>El orden determina la secuencia del proceso de conversión</li>
                <li>Las etapas inactivas no aparecerán en el embudo de ventas</li>
                <li>Los cambios se guardan automáticamente al reordenar</li>
                <li>Cada etapa debe tener un color único para identificación</li>
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
                  Editar Etapa
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-blue-600" />
                  Nueva Etapa
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
                    Nombre de la etapa (ej: Lead, Propuesta, Cerrado)
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <Input
                value={form.nombre}
                onChange={(e) =>
                  setForm((p) => ({ ...p, nombre: e.target.value }))
                }
                placeholder="Ej: Lead"
                disabled={saving}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
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
                    Descripción adicional de la etapa (opcional)
                  </TooltipContent>
                </Tooltip>
              </div>
              <Input
                value={form.descripcion}
                onChange={(e) =>
                  setForm((p) => ({ ...p, descripcion: e.target.value }))
                }
                placeholder="Ej: Clientes nuevos sin contacto"
                disabled={saving}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
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
                    Color hexadecimal para identificar la etapa visualmente
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Input
                      type="color"
                      value={form.color || "#000000"}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, color: e.target.value }))
                      }
                      disabled={saving}
                      className="h-10 w-16 cursor-pointer border-gray-300 rounded"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="top">Selector de color</TooltipContent>
                </Tooltip>

                <Input
                  value={form.color}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, color: e.target.value }))
                  }
                  placeholder="#RRGGBB"
                  disabled={saving}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 font-mono text-sm"
                />
              </div>
              <p className="text-xs text-gray-600">
                Formato: #RRGGBB (ej: #3B82F6)
              </p>
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
                  <GitBranch className="h-4 w-4 mr-2" />
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
                ¿Estás seguro de que deseas eliminar esta etapa?
              </p>
              <p className="text-xs text-red-700 mt-2">
                ⚠️ Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="space-y-3 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Nombre:</span>
                <span className="text-gray-900 font-medium">
                  {deleteDialog.item?.nombre ?? "-"}
                </span>
              </div>

              {deleteDialog.item?.descripcion && (
                <div className="flex justify-between items-start">
                  <span className="font-semibold text-gray-700">Descripción:</span>
                  <span className="text-gray-900 text-right text-xs max-w-xs">
                    {deleteDialog.item.descripcion}
                  </span>
                </div>
              )}

              <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                <span className="font-semibold text-gray-700">Color:</span>
                <div className="flex items-center gap-2">
                  <div
                    className="h-6 w-6 rounded border-2 border-gray-400"
                    style={{
                      backgroundColor: deleteDialog.item?.color || "transparent",
                    }}
                  />
                  <span className="font-mono text-xs">
                    {deleteDialog.item?.color || "-"}
                  </span>
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