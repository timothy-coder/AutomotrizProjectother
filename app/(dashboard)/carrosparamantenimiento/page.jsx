"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { useRequirePerm } from "@/hooks/useRequirePerm";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";

import ClaseDialog from "@/app/components/clases/ClaseDialog";
import CarrosDialog from "@/app/components/clases/CarrosDialog";
import ConfirmDeleteDialog from "@/app/components/clases/ConfirmDeleteDialog";

import ClasesTable from "@/app/components/clases/ClasesTable";
import { Plus } from "lucide-react";

export default function ClasesPage() {
  // puedes cambiar esto a ("clases","view") si así lo manejas en tu sistema
  useRequirePerm("carrosparamantenimiento", "view");

  const { permissions } = useAuth();

  // permisos CLASES (si tu sistema usa "clases", cámbialo aquí)
  const permCreateClase = hasPermission(permissions, "carrosparamantenimiento", "create");
  const permEditClase = hasPermission(permissions, "carrosparamantenimiento", "edit");
  const permDeleteClase = hasPermission(permissions, "carrosparamantenimiento", "delete");

  // permisos CARROS
  const permCreateCarro = hasPermission(permissions, "carrosparamantenimiento", "create");
  const permEditCarro = hasPermission(permissions, "carrosparamantenimiento", "edit");
  const permDeleteCarro = hasPermission(permissions, "carrosparamantenimiento", "delete");

  const [clases, setClases] = useState([]);
  const [carros, setCarros] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);

  const [loading, setLoading] = useState(false);

  // dialogs clase
  const [claseOpen, setClaseOpen] = useState(false);
  const [claseMode, setClaseMode] = useState("create"); // create | edit | view
  const [claseSelected, setClaseSelected] = useState(null);

  // dialogs carro
  const [carroOpen, setCarroOpen] = useState(false);
  const [carroMode, setCarroMode] = useState("create"); // create | edit | view
  const [carroSelected, setCarroSelected] = useState(null);
  const [carroDefaultClaseId, setCarroDefaultClaseId] = useState(null);

  // delete confirm (clase o carro)
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteKind, setDeleteKind] = useState("clase"); // "clase" | "carro"
  const [deleteItem, setDeleteItem] = useState(null);

  async function loadAll() {
    try {
      setLoading(true);

      const [rClases, rCarros, rMarcas, rModelos] = await Promise.all([
        fetch("/api/clases", { cache: "no-store" }),
        fetch("/api/carrosparamantenimiento", { cache: "no-store" }),
        fetch("/api/marcas", { cache: "no-store" }),
        fetch("/api/modelos", { cache: "no-store" }),
      ]);

      const [dClases, dCarros, dMarcas, dModelos] = await Promise.all([
        rClases.json(),
        rCarros.json(),
        rMarcas.json(),
        rModelos.json(),
      ]);

      setClases(Array.isArray(dClases) ? dClases : []);
      setCarros(Array.isArray(dCarros) ? dCarros : []);
      setMarcas(Array.isArray(dMarcas) ? dMarcas : []);
      setModelos(Array.isArray(dModelos) ? dModelos : []);
    } catch (e) {
      toast.error("Error cargando clases/carros");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  const carrosByClase = useMemo(() => {
    const map = new Map();
    for (const c of carros) {
      const cid = Number(c.clase_id);
      if (!map.has(cid)) map.set(cid, []);
      map.get(cid).push(c);
    }
    // orden opcional
    for (const [k, list] of map.entries()) {
      list.sort((a, b) => {
        const ma = (a.marca_nombre || "").localeCompare(b.marca_nombre || "");
        if (ma !== 0) return ma;
        const mo = (a.modelo_nombre || "").localeCompare(b.modelo_nombre || "");
        if (mo !== 0) return mo;
        return Number(a.year || 0) - Number(b.year || 0);
      });
    }
    return map;
  }, [carros]);

  // ----------------- CLASES -----------------
  function onNewClase() {
    setClaseSelected(null);
    setClaseMode("create");
    setClaseOpen(true);
  }

  function onViewClase(row) {
    setClaseSelected(row);
    setClaseMode("view");
    setClaseOpen(true);
  }

  function onEditClase(row) {
    setClaseSelected(row);
    setClaseMode("edit");
    setClaseOpen(true);
  }

  async function saveClase(payload) {
    try {
      const isEdit = !!payload.id;
      const url = isEdit ? `/api/clases/${payload.id}` : `/api/clases`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: payload.nombre }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error");

      toast.success(isEdit ? "Clase actualizada" : "Clase creada");
      setClaseOpen(false);
      loadAll();
    } catch {
      toast.error("No se pudo guardar la clase");
    }
  }

  function askDeleteClase(row) {
    setDeleteKind("clase");
    setDeleteItem(row);
    setDeleteOpen(true);
  }

  // ----------------- CARROS -----------------
  function onNewCarroFromClase(clase) {
    setCarroSelected(null);
    setCarroMode("create");
    setCarroDefaultClaseId(Number(clase.id));
    setCarroOpen(true);
  }

  function onViewCarro(row) {
    setCarroSelected(row);
    setCarroMode("view");
    setCarroDefaultClaseId(Number(row.clase_id));
    setCarroOpen(true);
  }

  function onEditCarro(row) {
    setCarroSelected(row);
    setCarroMode("edit");
    setCarroDefaultClaseId(Number(row.clase_id));
    setCarroOpen(true);
  }

  async function saveCarro(payload) {
    try {
      const isEdit = !!payload.id;
      const url = isEdit
        ? `/api/carrosparamantenimiento/${payload.id}`
        : `/api/carrosparamantenimiento`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marca_id: payload.marca_id,
          modelo_id: payload.modelo_id,
          year: payload.year,
          version: payload.version,
          clase_id: payload.clase_id,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error");

      toast.success(isEdit ? "Carro actualizado" : "Carro creado");
      setCarroOpen(false);
      loadAll();
    } catch {
      toast.error("No se pudo guardar el carro");
    }
  }

  function askDeleteCarro(row) {
    setDeleteKind("carro");
    setDeleteItem(row);
    setDeleteOpen(true);
  }

  // ----------------- DELETE CONFIRM (CLASE/CARRO) -----------------
  async function confirmDelete() {
    if (!deleteItem) return;

    try {
      const url =
        deleteKind === "clase"
          ? `/api/clases/${deleteItem.id}`
          : `/api/carrosparamantenimiento/${deleteItem.id}`;

      const res = await fetch(url, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || "Error");

      toast.success(deleteKind === "clase" ? "Clase eliminada" : "Carro eliminado");
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
          <h1 className="text-2xl font-semibold">Clases</h1>
          <p className="text-sm text-muted-foreground">
            CRUD de clases con subtabla de carros por clase.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={loadAll} disabled={loading}>
            Recargar
          </Button>

          {permCreateClase && (
            <Button onClick={onNewClase} disabled={loading}>
              <Plus size={16} /> Nueva clase
            </Button>
          )}
        </div>
      </div>

      <Card className="border-border shadow-sm">
        <CardHeader className="pb-2">
          <div className="font-semibold">Listado de Clases</div>
        </CardHeader>

        <CardContent className="p-0">
          <ClasesTable
            loading={loading}
            clases={clases}
            carrosByClase={carrosByClase}
            canEditClase={permEditClase}
            canDeleteClase={permDeleteClase}
            canCreateCarro={permCreateCarro}
            canEditCarro={permEditCarro}
            canDeleteCarro={permDeleteCarro}
            onViewClase={onViewClase}
            onEditClase={onEditClase}
            onDeleteClase={askDeleteClase}
            onNewCarro={onNewCarroFromClase}
            onViewCarro={onViewCarro}
            onEditCarro={onEditCarro}
            onDeleteCarro={askDeleteCarro}
          />
        </CardContent>
      </Card>

      {/* Dialog Clase */}
      <ClaseDialog
        open={claseOpen}
        onOpenChange={setClaseOpen}
        mode={claseMode}
        clase={claseSelected}
        onSave={saveClase}
      />

      {/* Dialog Carro */}
      <CarrosDialog
        open={carroOpen}
        onOpenChange={setCarroOpen}
        mode={carroMode}
        carro={carroSelected}
        marcas={marcas}
        modelos={modelos}
        defaultClaseId={carroDefaultClaseId}
        onSave={saveCarro}
      />

      {/* Confirm delete */}
      <ConfirmDeleteDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={deleteKind === "clase" ? "Eliminar clase" : "Eliminar carro"}
        description={
          deleteKind === "clase"
            ? `¿Seguro que deseas eliminar la clase "${deleteItem?.nombre}"?`
            : `¿Seguro que deseas eliminar el carro "${deleteItem?.marca_nombre || ""} ${deleteItem?.modelo_nombre || ""} ${deleteItem?.year || ""}"?`
        }
        onConfirm={confirmDelete}
      />
    </div>
  );
}