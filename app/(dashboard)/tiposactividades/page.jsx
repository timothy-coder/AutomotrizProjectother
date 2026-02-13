"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { Plus, RefreshCcw } from "lucide-react";

import TiposActividadesTable from "@/app/components/tiposactividades/TiposActividadesTable";
import TipoActividadDialog from "@/app/components/tiposactividades/TipoActividadDialog";
import ConfirmDeleteDialog from "@/app/components/tiposactividades/ConfirmDeleteDialog";

import { useRequirePerm } from "@/hooks/useRequirePerm";
import { useAuth } from "@/context/AuthContext";

export default function TiposActividadesPage() {

  useRequirePerm("tiposactividades", "view");

  const { permissions } = useAuth();
  const permCreate = permissions?.tiposactividades?.create;
  const permEdit = permissions?.tiposactividades?.edit;
  const permDelete = permissions?.tiposactividades?.delete;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [selected, setSelected] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);

  async function loadAll() {
    setLoading(true);
    const res = await fetch("/api/tiposactividades");
    const data = await res.json();
    setItems(data || []);
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
  }, []);

  const pyp = items.filter(x => Number(x.tipo) === 1);
  const taller = items.filter(x => Number(x.tipo) === 2);

  function onCreate(tipo) {
    setSelected({ tipo });
    setDialogMode("create");
    setDialogOpen(true);
  }

  function onEdit(item) {
    setSelected(item);
    setDialogMode("edit");
    setDialogOpen(true);
  }

  function onView(item) {
    setSelected(item);
    setDialogMode("view");
    setDialogOpen(true);
  }

  function onDelete(item) {
    setSelected(item);
    setDeleteOpen(true);
  }

  async function handleSave(form) {

    const method = form.id ? "PUT" : "POST";
    const url = form.id
      ? `/api/tiposactividades/${form.id}`
      : "/api/tiposactividades";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    toast.success("Guardado correctamente");
    setDialogOpen(false);
    loadAll();
  }

  async function handleDelete() {
    await fetch(`/api/tiposactividades/${selected.id}`, {
      method: "DELETE",
    });

    toast.success("Eliminado");
    setDeleteOpen(false);
    loadAll();
  }

  async function toggleActive(item) {
    await fetch(`/api/tiposactividades/${item.id}/activate`, {
      method: "PATCH",
    });

    loadAll();
  }

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-semibold">
          Tipos de Actividades
        </h1>

        <Button
          variant="outline"
          onClick={loadAll}
          disabled={loading}
        >
          Recargar
          <RefreshCcw className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* PYP */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="font-semibold">Planchado y Pintura</h2>

          {permCreate && (
            <Button size="sm" onClick={() => onCreate(1)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo
            </Button>
          )}
        </CardHeader>

        <CardContent>
          <TiposActividadesTable
            data={pyp}
            loading={loading}
            onView={onView}
            onEdit={permEdit ? onEdit : undefined}
            onDelete={permDelete ? onDelete : undefined}
            onToggleActive={toggleActive}
          />
        </CardContent>
      </Card>

      {/* TALLER */}
      <Card>
        <CardHeader className="flex justify-between items-center">
          <h2 className="font-semibold">Taller</h2>

          {permCreate && (
            <Button size="sm" onClick={() => onCreate(2)}>
              <Plus className="h-4 w-4 mr-2" />
              Nuevo
            </Button>
          )}
        </CardHeader>

        <CardContent>
          <TiposActividadesTable
            data={taller}
            loading={loading}
            onView={onView}
            onEdit={permEdit ? onEdit : undefined}
            onDelete={permDelete ? onDelete : undefined}
            onToggleActive={toggleActive}
          />
        </CardContent>
      </Card>

      <TipoActividadDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        item={selected}
        onSave={handleSave}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        item={selected}
        onConfirm={handleDelete}
      />

    </div>
  );
}
