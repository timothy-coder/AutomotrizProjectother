"use client";

import { useEffect, useMemo, useState } from "react";
import { useRequirePerm } from "@/hooks/useRequirePerm";
import { hasPermission } from "@/lib/permissions";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { Loader2, RefreshCcw, Plus, Paintbrush, Wrench } from "lucide-react";

import EtapaDialog from "@/app/components/etapas/EtapaDialog";
import ConfirmDeleteDialog from "@/app/components/etapas/ConfirmDeleteDialog";
import { useAuth } from "@/context/AuthContext";
import EtapasTableDnd from "@/app/components/etapas/EtapasTableDnd";

export default function EtapasPage() {
  useRequirePerm("etapas", "view");

  const { permissions } = useAuth();

  const permCreate = hasPermission(permissions, "etapas", "create");
  const permEdit = hasPermission(permissions, "etapas", "edit");
  const permDelete = hasPermission(permissions, "etapas", "delete");
  const permView = hasPermission(permissions, "etapas", "view");

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [mode, setMode] = useState("create");

  async function loadAll() {
    try {
      setLoading(true);
      const res = await fetch("/api/etapas", { cache: "no-store" });
      const data = await res.json();

      const arr = Array.isArray(data) ? data : [];

      // normaliza sort_order (si viene null)
      const normalized = arr.map((x) => ({
        ...x,
        id: Number(x.id),
        tipo: Number(x.tipo),
        sort_order:
          x.sort_order === null || x.sort_order === undefined
            ? 999999
            : Number(x.sort_order),
      }));

      // IMPORTANTE: aquí sí ordenamos UNA VEZ (al cargar)
      normalized.sort((a, b) => a.tipo - b.tipo || a.sort_order - b.sort_order);

      setItems(normalized);
    } catch (error) {
      toast.error("Error cargando etapas");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  // NO HACER .sort() AQUÍ porque te rompe el DnD visual
  const pintura = useMemo(
    () => items.filter((x) => Number(x.tipo) === 1),
    [items]
  );

  const taller = useMemo(
    () => items.filter((x) => Number(x.tipo) === 2),
    [items]
  );

  function onCreate(tipo) {
    setSelected({ tipo });
    setMode("create");
    setDialogOpen(true);
  }

  function onEdit(row) {
    setSelected(row);
    setMode("edit");
    setDialogOpen(true);
  }

  function onView(row) {
    setSelected(row);
    setMode("view");
    setDialogOpen(true);
  }

  async function handleSave(data) {
  try {
    setSaving(true);

    if (mode === "edit") {
      const original = items.find((x) => Number(x.id) === Number(data.id));

      const payload = {
        ...original,     // conserva tipo, sort_order, etc
        ...data,         // aplica cambios del form
        sort_order:
          data.sort_order === undefined || data.sort_order === null || data.sort_order === ""
            ? original?.sort_order
            : Number(data.sort_order),
      };

      await fetch(`/api/etapas/${data.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      toast.success("Actualizado");
    } else {
      await fetch("/api/etapas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      toast.success("Creado");
    }

    setDialogOpen(false);
    loadAll();
  } catch {
    toast.error("Error guardando");
  } finally {
    setSaving(false);
  }
}

  function onDelete(row) {
    setSelected(row);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    try {
      await fetch(`/api/etapas/${selected.id}`, { method: "DELETE" });
      toast.success("Eliminado");
      setDeleteOpen(false);
      loadAll();
    } catch {
      toast.error("Error eliminando");
    }
  }

  async function handleReorder(tipo, newList) {
    const itemsPayload = newList.map((item, index) => ({
      id: item.id,
      sort_order: index + 1,
    }));

    try {
      await fetch("/api/etapas/reorder", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo, items: itemsPayload }),
      });

      toast.success("Orden actualizado");
    } catch {
      toast.error("Error actualizando orden");
      loadAll();
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Etapas</h1>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={loadAll} disabled={loading || saving}>
            Recargar
            {loading ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="ml-2 h-4 w-4" />
            )}
          </Button>
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Planchado y Pintura</h2>
          </div>

          {permCreate && (
            <Button size="sm" onClick={() => onCreate(1)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva etapa
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <EtapasTableDnd
            tipo={1}
            data={pintura}
            loading={loading}
            onView={permView ? onView : undefined}
            onEdit={permEdit ? onEdit : undefined}
            onDelete={permDelete ? onDelete : undefined}
            onReordered={(newList) => {
              setItems((prev) => {
                const other = prev.filter((x) => Number(x.tipo) !== 1);
                return [...other, ...newList];
              });
              handleReorder(1, newList);
            }}
          />
        </CardContent>
      </Card>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">Taller</h2>
          </div>

          {permCreate && (
            <Button size="sm" onClick={() => onCreate(2)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva etapa
            </Button>
          )}
        </CardHeader>

        <CardContent className="p-0">
          <EtapasTableDnd
            tipo={2}
            data={taller}
            loading={loading}
            onView={permView ? onView : undefined}
            onEdit={permEdit ? onEdit : undefined}
            onDelete={permDelete ? onDelete : undefined}
            onReordered={(newList) => {
              setItems((prev) => {
                const other = prev.filter((x) => Number(x.tipo) !== 2);
                return [...other, ...newList];
              });
              handleReorder(2, newList);
            }}
          />
        </CardContent>
      </Card>

      <EtapaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={mode}
        etapa={selected}
        onSave={handleSave}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onConfirm={confirmDelete}
        loading={saving}
        title="Eliminar etapa"
        description={`¿Seguro que deseas eliminar "${selected?.nombre}"?`}
      />
    </div>
  );
}