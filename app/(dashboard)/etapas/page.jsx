"use client";

import { useEffect, useMemo, useState } from "react";
import { useRequirePerm } from "@/hooks/useRequirePerm";
import { hasPermission } from "@/lib/permissions";

import {
  Card,
  CardHeader,
  CardContent,
} from "@/components/ui/card";

import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import {
  Loader2,
  RefreshCcw,
  Plus,
  Paintbrush,
  Wrench,
} from "lucide-react";


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

  /* =========================
     LOAD DATA
  ==========================*/

  async function loadAll() {
    try {
      setLoading(true);
      const res = await fetch("/api/etapas");
      const data = await res.json();
      setItems(data || []);
    } catch (error) {
      toast.error("Error cargando etapas");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  /* =========================
     FILTROS POR TIPO
  ==========================*/

  const pintura = useMemo(
    () =>
      items
        .filter((x) => Number(x.tipo) === 1)
        .sort((a, b) => a.sort_order - b.sort_order),
    [items]
  );

  const taller = useMemo(
    () =>
      items
        .filter((x) => Number(x.tipo) === 2)
        .sort((a, b) => a.sort_order - b.sort_order),
    [items]
  );

  /* =========================
     CREATE / EDIT
  ==========================*/

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
        await fetch(`/api/etapas/${data.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
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

  /* =========================
     DELETE
  ==========================*/

  function onDelete(row) {
    setSelected(row);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    try {
      await fetch(`/api/etapas/${selected.id}`, {
        method: "DELETE",
      });
      toast.success("Eliminado");
      setDeleteOpen(false);
      loadAll();
    } catch {
      toast.error("Error eliminando");
    }
  }

  /* =========================
     REORDER
  ==========================*/

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

  /* =========================
     RENDER
  ==========================*/

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">

        <div>
          <h1 className="text-2xl font-semibold">
            Etapas
          </h1>
        </div>

        <div className="flex gap-2">

          <Button
            variant="outline"
            onClick={loadAll}
            disabled={loading || saving}
          >
            Recargar
            {loading ? (
              <Loader2 className="ml-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCcw className="ml-2 h-4 w-4" />
            )}
          </Button>

        </div>
      </div>

      {/* PYP */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Paintbrush className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">
              Planchado y Pintura
            </h2>
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

      {/* TALLER */}
      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold">
              Taller
            </h2>
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

      {/* DIALOG */}
      <EtapaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={mode}
        etapa={selected}
        onSave={handleSave}
      />

      {/* DELETE */}
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
