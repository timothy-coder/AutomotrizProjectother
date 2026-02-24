"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useRequirePerm } from "@/hooks/useRequirePerm";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";

import MarcasTable from "@/app/components/marcas/MarcasTable";
import MarcaDialog from "@/app/components/marcas/MarcaDialog";
import ModeloDialog from "@/app/components/marcas/ModeloDialog";
import ConfirmDeleteDialog from "@/app/components/marcas/ConfirmDeleteDialog";



import { Plus } from "lucide-react";
import ClasesSheet from "@/app/components/marcas/ClasesSheet";

export default function MarcasPage() {
  useRequirePerm("marcas", "view");

  const { permissions } = useAuth();

  const permCreate = hasPermission(permissions, "marcas", "create");
  const permEdit = hasPermission(permissions, "marcas", "edit");
  const permDelete = hasPermission(permissions, "marcas", "delete");

  const permCreateModel = hasPermission(permissions, "modelos", "create");
  const permEditModel = hasPermission(permissions, "modelos", "edit");
  const permDeleteModel = hasPermission(permissions, "modelos", "delete");

  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [clases, setClases] = useState([]);
  const [loading, setLoading] = useState(false);

  // dialogs marca
  const [marcaOpen, setMarcaOpen] = useState(false);
  const [marcaMode, setMarcaMode] = useState("create"); // create | edit | view
  const [marcaSelected, setMarcaSelected] = useState(null);

  // dialogs modelo
  const [modeloOpen, setModeloOpen] = useState(false);
  const [modeloMode, setModeloMode] = useState("create"); // create | edit
  const [modeloSelected, setModeloSelected] = useState(null);
  const [modeloDefaultMarcaId, setModeloDefaultMarcaId] = useState(null);

  // sheet clases
  const [clasesSheetOpen, setClasesSheetOpen] = useState(false);

  // delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteKind, setDeleteKind] = useState("marca"); // marca | modelo
  const [deleteItem, setDeleteItem] = useState(null);

  async function loadAll() {
    try {
      setLoading(true);

      const [rMarcas, rModelos, rClases] = await Promise.all([
        fetch("/api/marcas", { cache: "no-store" }),
        fetch("/api/modelos", { cache: "no-store" }),
        fetch("/api/clases", { cache: "no-store" }),
      ]);

      const [dMarcas, dModelos, dClases] = await Promise.all([
        rMarcas.json(),
        rModelos.json(),
        rClases.json(),
      ]);

      setMarcas(Array.isArray(dMarcas) ? dMarcas : []);
      setModelos(Array.isArray(dModelos) ? dModelos : []);
      setClases(Array.isArray(dClases) ? dClases : []);
    } catch (e) {
      toast.error("Error cargando marcas/modelos/clases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const modelosByMarca = useMemo(() => {
    const map = new Map();
    for (const m of modelos) {
      const mid = Number(m.marca_id);
      if (!map.has(mid)) map.set(mid, []);
      map.get(mid).push(m);
    }
    for (const [, list] of map.entries()) {
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    }
    return map;
  }, [modelos]);

  // ----------------- MARCAS -----------------
  function onNewMarca() {
    setMarcaSelected(null);
    setMarcaMode("create");
    setMarcaOpen(true);
  }

  function onViewMarca(row) {
    setMarcaSelected(row);
    setMarcaMode("view");
    setMarcaOpen(true);
  }

  function onEditMarca(row) {
    setMarcaSelected(row);
    setMarcaMode("edit");
    setMarcaOpen(true);
  }

  async function saveMarca(payload) {
    try {
      const isEdit = !!payload.id;
      const url = isEdit ? `/api/marcas/${payload.id}` : `/api/marcas`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          image_url: payload.image_url || null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error");

      toast.success(isEdit ? "Marca actualizada" : "Marca creada");
      setMarcaOpen(false);
      loadAll();
    } catch {
      toast.error("No se pudo guardar la marca");
    }
  }

  function askDeleteMarca(row) {
    setDeleteKind("marca");
    setDeleteItem(row);
    setDeleteOpen(true);
  }

  // ----------------- MODELOS -----------------
  function onNewModelo(marca_id) {
    setModeloSelected(null);
    setModeloMode("create");
    setModeloDefaultMarcaId(Number(marca_id));
    setModeloOpen(true);
  }

  function onEditModelo(row) {
    setModeloSelected(row);
    setModeloMode("edit");
    setModeloDefaultMarcaId(Number(row.marca_id));
    setModeloOpen(true);
  }

  async function saveModelo(payload) {
    try {
      const isEdit = !!payload.id;
      const url = isEdit ? `/api/modelos/${payload.id}` : `/api/modelos`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: payload.name,
          marca_id: payload.marca_id,
          clase_id: payload.clase_id ?? null,
          anios: payload.anios ?? null,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error");

      toast.success(isEdit ? "Modelo actualizado" : "Modelo creado");
      setModeloOpen(false);
      loadAll();
    } catch {
      toast.error("No se pudo guardar el modelo");
    }
  }

  function askDeleteModelo(row) {
    setDeleteKind("modelo");
    setDeleteItem(row);
    setDeleteOpen(true);
  }

  // ----------------- DELETE CONFIRM -----------------
  async function confirmDelete() {
    if (!deleteItem) return;

    try {
      const url =
        deleteKind === "marca"
          ? `/api/marcas/${deleteItem.id}`
          : `/api/modelos/${deleteItem.id}`;

      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error");

      toast.success(deleteKind === "marca" ? "Marca eliminada" : "Modelo eliminado");
      setDeleteOpen(false);
      loadAll();
    } catch {
      toast.error("No se pudo eliminar");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Marcas & Modelos</h1>
          <p className="text-sm text-muted-foreground">
            CRUD con subtabla de modelos por marca.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={loadAll} disabled={loading}>
            Recargar
          </Button>

          <Button
            variant="secondary"
            onClick={() => setClasesSheetOpen(true)}
            disabled={loading}
          >
            Clases
          </Button>

          {permCreate && (
            <Button onClick={onNewMarca} disabled={loading}>
              <Plus size={16} /> Nueva marca
            </Button>
          )}
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <div className="font-semibold">Listado</div>
        </CardHeader>

        <CardContent className="p-0">
          <MarcasTable
            loading={loading}
            marcas={marcas}
            modelosByMarca={modelosByMarca}
            canEditMarca={permEdit}
            canDeleteMarca={permDelete}
            canCreateModelo={permCreateModel}
            canEditModelo={permEditModel}
            canDeleteModelo={permDeleteModel}
            onViewMarca={onViewMarca}
            onEditMarca={onEditMarca}
            onDeleteMarca={askDeleteMarca}
            onNewModelo={onNewModelo}
            onEditModelo={onEditModelo}
            onDeleteModelo={askDeleteModelo}
          />
        </CardContent>
      </Card>

      <MarcaDialog
        open={marcaOpen}
        onOpenChange={setMarcaOpen}
        mode={marcaMode}
        marca={marcaSelected}
        onSave={saveMarca}
      />

      <ModeloDialog
        open={modeloOpen}
        onOpenChange={setModeloOpen}
        mode={modeloMode}
        modelo={modeloSelected}
        marcas={marcas}
        clases={clases}
        defaultMarcaId={modeloDefaultMarcaId}
        onSave={saveModelo}
      />

      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={deleteKind === "marca" ? "Eliminar marca" : "Eliminar modelo"}
        description={
          deleteKind === "marca"
            ? `¿Seguro que deseas eliminar la marca "${deleteItem?.name}"?`
            : `¿Seguro que deseas eliminar el modelo "${deleteItem?.name}"?`
        }
        onConfirm={confirmDelete}
      />

      <ClasesSheet
        open={clasesSheetOpen}
        onOpenChange={setClasesSheetOpen}
        canEdit={true}
        canDelete={true}
      />
    </div>
  );
}