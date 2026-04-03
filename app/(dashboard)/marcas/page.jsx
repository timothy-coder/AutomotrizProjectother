"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useRequirePerm } from "@/hooks/useRequirePerm";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";

import MarcasTable from "@/app/components/marcas/MarcasTable";
import MarcaDialog from "@/app/components/marcas/MarcaDialog";
import ModeloDialog from "@/app/components/marcas/ModeloDialog";
import ConfirmDeleteDialog from "@/app/components/marcas/ConfirmDeleteDialog";

import {
  Plus,
  RefreshCw,
  Layers,
  Wrench,
  Info,
  Car,
  CheckCircle,
  Loader2,
} from "lucide-react";
import ClasesSheet from "@/app/components/marcas/ClasesSheet";
import AlgoritmoVisitaSheet from "@/app/components/marcas/AlgoritmoVisitaSheet";

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
  const [algoritmoSheetOpen, setAlgoritmoSheetOpen] = useState(false);

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

  const stats = {
    totalMarcas: marcas.length,
    totalModelos: modelos.length,
    totalClases: clases.length,
  };

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

      toast.success(
        deleteKind === "marca" ? "Marca eliminada" : "Modelo eliminado"
      );
      setDeleteOpen(false);
      loadAll();
    } catch {
      toast.error("No se pudo eliminar");
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
              <Car className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Marcas & Modelos
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona marcas, modelos, clases y algoritmos de mantenimiento
              </p>
            </div>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">
                        Total de Marcas
                      </p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">
                        {stats.totalMarcas}
                      </p>
                    </div>
                    <Car className="h-12 w-12 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Cantidad total de marcas registradas
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">
                        Total de Modelos
                      </p>
                      <p className="text-3xl font-bold text-purple-900 mt-2">
                        {stats.totalModelos}
                      </p>
                    </div>
                    <Layers className="h-12 w-12 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Cantidad total de modelos registrados
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">
                        Total de Clases
                      </p>
                      <p className="text-3xl font-bold text-green-900 mt-2">
                        {stats.totalClases}
                      </p>
                    </div>
                    <CheckCircle className="h-12 w-12 text-green-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Cantidad total de clases registradas
            </TooltipContent>
          </Tooltip>
        </div>

        {/* BOTONES DE ACCIÓN */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <CardTitle className="text-lg font-bold text-gray-900">
              Herramientas
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={loadAll}
                    disabled={loading}
                    className="border-gray-300 gap-2"
                  >
                    <RefreshCw
                      size={16}
                      className={loading ? "animate-spin" : ""}
                    />
                    Recargar
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Recargar datos de marcas, modelos y clases
                </TooltipContent>
              </Tooltip>

              {permCreate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setClasesSheetOpen(true)}
                      disabled={loading}
                      className="border-green-300 text-green-700 hover:bg-green-50 hover:border-green-400 gap-2"
                    >
                      <Layers size={16} />
                      Clases
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Gestionar clases de vehículos
                  </TooltipContent>
                </Tooltip>
              )}

              {permCreate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      onClick={() => setAlgoritmoSheetOpen(true)}
                      disabled={loading}
                      className="border-orange-300 text-orange-700 hover:bg-orange-50 hover:border-orange-400 gap-2"
                    >
                      <Wrench size={16} />
                      F. de mantenimiento
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Configurar frecuencia de visitas de mantenimiento
                  </TooltipContent>
                </Tooltip>
              )}

              {permCreate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={onNewMarca}
                      disabled={loading}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
                    >
                      <Plus size={16} />
                      Nueva Marca
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Crear nueva marca de vehículos
                  </TooltipContent>
                </Tooltip>
              )}
            </div>
          </CardContent>
        </Card>

        {/* TABLA PRINCIPAL */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-lg">
                <Car className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-bold text-gray-900">
                  Listado de Marcas y Modelos
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Administra todas las marcas con sus modelos asociados
                </p>
              </div>
            </div>

            <Badge
              variant="secondary"
              className="w-fit bg-blue-100 text-blue-900 border-blue-300"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              {stats.totalMarcas} marca{stats.totalMarcas !== 1 ? "s" : ""}
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">
                  Cargando marcas y modelos...
                </p>
              </div>
            ) : (
              <MarcasTable
                loading={loading}
                marcas={marcas}
                modelosByMarca={modelosByMarca}
                canEditMarca={permEdit}
                canDeleteMarca={permDelete}
                canCreateModelo={permCreateModel}
                canEditModelo={permEditModel}
                canDeleteModelo={permDeleteModel}
                clases={clases}
                onViewMarca={onViewMarca}
                onEditMarca={onEditMarca}
                onDeleteMarca={askDeleteMarca}
                onNewModelo={onNewModelo}
                onEditModelo={onEditModelo}
                onDeleteModelo={askDeleteModelo}
              />
            )}
          </CardContent>
        </Card>

        {/* INFO BOX */}
        {!loading && (stats.totalMarcas > 0 || stats.totalModelos > 0) && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-1">
              <p className="font-semibold">Información importante:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Cada marca puede tener múltiples modelos asociados</li>
                <li>
                  Los modelos pueden estar clasificados por clase de vehículo
                </li>
                <li>
                  Configura algoritmos de mantenimiento para cada modelo
                </li>
                <li>
                  Usa la opción de ver marca para consultar detalles sin editar
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* DIALOGS Y SHEETS */}
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

      <AlgoritmoVisitaSheet
        open={algoritmoSheetOpen}
        onOpenChange={setAlgoritmoSheetOpen}
        canEdit={true}
        canDelete={true}
      />
    </TooltipProvider>
  );
}