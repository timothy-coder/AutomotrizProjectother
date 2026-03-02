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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  GripVertical,
  Pencil,
  Trash2,
  Plus,
  Loader2,
  AlertTriangle,
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 border rounded-lg p-3 bg-background"
    >
      <button
        type="button"
        className="cursor-grab active:cursor-grabbing text-muted-foreground"
        {...attributes}
        {...listeners}
        aria-label="Arrastrar"
      >
        <GripVertical className="h-5 w-5" />
      </button>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="font-medium truncate">{item.nombre}</div>

          <span
            className="inline-flex items-center gap-2 text-xs px-2 py-1 rounded-full border"
            title={item.color || ""}
          >
            <span
              className="h-3 w-3 rounded-full border"
              style={{ background: item.color || "transparent" }}
            />
            {item.color || "sin color"}
          </span>

          <span
            className={`text-xs px-2 py-1 rounded-full border ${
              Number(item.is_active) ? "" : "text-muted-foreground"
            }`}
          >
            {Number(item.is_active) ? "Activo" : "Inactivo"}
          </span>

          <span className="text-xs text-muted-foreground">
            Orden: {item.sort_order ?? "—"}
          </span>
        </div>

        {item.descripcion ? (
          <div className="text-xs text-muted-foreground truncate">
            {item.descripcion}
          </div>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onToggleActive(item)}
        >
          {Number(item.is_active) ? "Desactivar" : "Activar"}
        </Button>

        <Button type="button" variant="outline" size="sm" onClick={() => onEdit(item)}>
          <Pencil className="h-4 w-4 mr-2" />
          Editar
        </Button>

        <Button
          type="button"
          variant="destructive"
          size="sm"
          onClick={() => onDelete(item)}
        >
          <Trash2 className="h-4 w-4 mr-2" />
          Eliminar
        </Button>
      </div>
    </div>
  );
}

export default function EtapasConversionTab() {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 3 } })
  );

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialog, setDialog] = useState({ open: false, mode: "create", data: null });
  const [form, setForm] = useState({
    nombre: "",
    descripcion: "",
    color: "#3B82F6",
    sort_order: "",
    is_active: true,
  });
  const [saving, setSaving] = useState(false);

  const [deleteDialog, setDeleteDialog] = useState({ open: false, item: null });
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
        sort_order: x.sort_order === null || x.sort_order === undefined ? null : Number(x.sort_order),
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
      sort_order: "",
      is_active: true,
    });
    setDialog({ open: true, mode: "create", data: null });
  }

  function openEdit(item) {
    setForm({
      nombre: item?.nombre ?? "",
      descripcion: item?.descripcion ?? "",
      color: item?.color ?? "#3B82F6",
      sort_order: item?.sort_order ?? "",
      is_active: Number(item?.is_active) ? true : false,
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
    const is_active = form.is_active ? 1 : 0;

    const sort_order =
      form.sort_order === "" || form.sort_order === null || form.sort_order === undefined
        ? null
        : Number(form.sort_order);

    if (!nombre) return toast.error("nombre es requerido");
    if (!isHexColor(color)) return toast.error("color debe ser HEX (#RRGGBB)");
    if (sort_order !== null && Number.isNaN(sort_order)) return toast.error("sort_order inválido");

    const isEdit = dialog.mode === "edit" && dialog.data?.id != null;
    const url = isEdit ? `/api/etapasconversion/${dialog.data.id}` : "/api/etapasconversion";
    const method = isEdit ? "PUT" : "POST";

    try {
      setSaving(true);
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre,
          descripcion: descripcion === "" ? null : descripcion,
          color: color === "" ? null : color,
          sort_order,
          is_active,
        }),
      });

      const data = await r.json().catch(() => ({}));
      if (!r.ok) return toast.error(data?.message || "No se pudo guardar");

      toast.success(isEdit ? "Etapa actualizada" : "Etapa creada");
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
        prev.map((x) => (x.id === id ? { ...x, is_active: Number(x.is_active) ? 0 : 1 } : x))
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
      const r = await fetch(`/api/etapasconversion/${id}`, { method: "DELETE" });
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
      const oldIndex = prev.findIndex((x) => Number(x.id) === Number(active.id));
      const newIndex = prev.findIndex((x) => Number(x.id) === Number(over.id));
      if (oldIndex === -1 || newIndex === -1) return prev;

      const moved = arrayMove(prev, oldIndex, newIndex);
      const payload = moved.map((it, idx) => ({ ...it, sort_order: idx + 1 }));

      persistSortOrder(payload);
      return payload;
    });
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Etapas de conversión</CardTitle>

        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar
        </Button>
      </CardHeader>

      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground py-8">
            <Loader2 className="h-4 w-4 animate-spin" />
            Cargando...
          </div>
        ) : items.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8">No hay etapas.</div>
        ) : (
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <div className="space-y-2">
                {items.map((item) => (
                  <SortableRow
                    key={item.id}
                    item={item}
                    onEdit={openEdit}
                    onDelete={(it) => setDeleteDialog({ open: true, item: it })}
                    onToggleActive={toggleActive}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}
      </CardContent>

      <Dialog open={dialog.open} onOpenChange={closeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog.mode === "edit" ? "Editar etapa" : "Nueva etapa"}</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-medium">Nombre</div>
              <Input
                value={form.nombre}
                onChange={(e) => setForm((p) => ({ ...p, nombre: e.target.value }))}
              />
            </div>

            <div className="space-y-1">
              <div className="text-sm font-medium">Descripción</div>
              <Input
                value={form.descripcion}
                onChange={(e) => setForm((p) => ({ ...p, descripcion: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-sm font-medium">Color</div>
                <div className="flex items-center gap-2">
                  <Input
                    type="color"
                    value={form.color || "#000000"}
                    onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                    className="w-16 p-1"
                  />
                  <Input
                    value={form.color}
                    onChange={(e) => setForm((p) => ({ ...p, color: e.target.value }))}
                    placeholder="#RRGGBB"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="text-sm font-medium">Orden (opcional)</div>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm((p) => ({ ...p, sort_order: e.target.value }))}
                  min={1}
                />
              </div>
            </div>

            <div className="flex items-center justify-between border rounded-lg p-3">
              <div className="text-sm">
                <div className="font-medium">Activo</div>
                <div className="text-xs text-muted-foreground">Activa o desactiva esta etapa</div>
              </div>
              <Button
                type="button"
                variant={form.is_active ? "default" : "outline"}
                onClick={() => setForm((p) => ({ ...p, is_active: !p.is_active }))}
              >
                {form.is_active ? "Activo" : "Inactivo"}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => closeDialog(false)} disabled={saving}>
              Cancelar
            </Button>
            <Button onClick={save} disabled={saving}>
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

      <Dialog open={deleteDialog.open} onOpenChange={closeDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Confirmar eliminación
            </DialogTitle>
          </DialogHeader>

          <div className="text-sm text-muted-foreground">
            ¿Seguro que deseas eliminar esta etapa?
            <div className="mt-2">
              <b>{deleteDialog.item?.nombre ?? "-"}</b>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => closeDeleteDialog(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}