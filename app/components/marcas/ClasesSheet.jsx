"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Pencil, Trash2, Plus, RefreshCw, Package } from "lucide-react";

import ClaseDialog from "@/app/components/clases/ClaseDialog";
import ConfirmDeleteDialog from "@/app/components/clases/ConfirmDeleteDialog";

export default function ClasesSheet({
  open,
  onOpenChange,
  canEdit = true,
  canDelete = true,
  canCreate = true,
  onChanged,
}) {
  const [loading, setLoading] = useState(false);
  const [clases, setClases] = useState([]);

  // dialogs clase
  const [claseOpen, setClaseOpen] = useState(false);
  const [claseMode, setClaseMode] = useState("create");
  const [claseSelected, setClaseSelected] = useState(null);

  // delete confirm
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteItem, setDeleteItem] = useState(null);

  async function loadClases() {
    try {
      setLoading(true);
      const res = await fetch("/api/clases", { cache: "no-store" });

      let data;
      try {
        data = await res.json();
      } catch {
        data = [];
      }

      setClases(Array.isArray(data) ? data : []);
    } catch (e) {
      toast.error("Error cargando clases");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (open) loadClases();
  }, [open]);

  const clasesSorted = useMemo(() => {
    return [...(clases || [])].sort((a, b) =>
      (a.name || "").localeCompare(b.name || "")
    );
  }, [clases]);

  // ---------- acciones ----------
  function onNewClase() {
    setClaseSelected(null);
    setClaseMode("create");
    setClaseOpen(true);
  }

  function onEditClase(row) {
    setClaseSelected(row);
    setClaseMode("edit");
    setClaseOpen(true);
  }

  function askDeleteClase(row) {
    setDeleteItem(row);
    setDeleteOpen(true);
  }

  async function saveClase(payload) {
    try {
      const isEdit = !!payload.id;
      const url = isEdit ? `/api/clases/${payload.id}` : `/api/clases`;
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: payload.name }),
      });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Error");
      }

      toast.success(isEdit ? "Clase actualizada" : "Clase creada");
      setClaseOpen(false);

      await loadClases();
      onChanged?.();
    } catch {
      toast.error("No se pudo guardar la clase");
    }
  }

  async function confirmDelete() {
    if (!deleteItem) return;

    try {
      const res = await fetch(`/api/clases/${deleteItem.id}`, { method: "DELETE" });

      if (!res.ok) {
        const t = await res.text().catch(() => "");
        throw new Error(t || "Error");
      }

      toast.success("Clase eliminada");
      setDeleteOpen(false);

      await loadClases();
      onChanged?.();
    } catch {
      toast.error("No se pudo eliminar");
    }
  }

  return (
    <TooltipProvider>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col px-3">

          {/* Header */}
          <SheetHeader className="border-b pb-4">
            <div className="flex items-center gap-2">
              <Package size={24} className="text-blue-600" />
              <div>
                <SheetTitle className="text-xl">Clases de Vehículos</SheetTitle>
                <SheetDescription>
                  Gestiona las categorías de vehículos
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Content */}
          <div className="flex-1 mt-6 space-y-4 overflow-y-auto">

            {/* Toolbar */}
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    onClick={loadClases} 
                    disabled={loading}
                    size="sm"
                    className="gap-2"
                  >
                    <RefreshCw size={16} />
                    Recargar
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Actualizar lista de clases</TooltipContent>
              </Tooltip>

              {canCreate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={onNewClase} 
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700 text-white gap-2 ml-auto"
                      size="sm"
                    >
                      <Plus size={16} />
                      Nueva clase
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Crear nueva clase</TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Tabla */}
            <div className="border rounded-lg overflow-hidden bg-white">
              <div className="max-h-[50vh] overflow-y-auto">
                <table className="w-full text-sm">

                  {/* Header */}
                  <thead className="bg-slate-50 border-b sticky top-0">
                    <tr>
                      <th className="p-3 text-left font-semibold text-slate-700">
                        Nombre de Clase
                      </th>
                      <th className="p-3 text-right font-semibold text-slate-700">
                        Acciones
                      </th>
                    </tr>
                  </thead>

                  {/* Body */}
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={2} className="p-8 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <RefreshCw size={20} className="text-gray-400 animate-spin" />
                            <span className="text-sm text-gray-500">Cargando clases...</span>
                          </div>
                        </td>
                      </tr>
                    ) : clasesSorted.length === 0 ? (
                      <tr>
                        <td colSpan={2} className="p-8 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Package size={24} className="text-gray-300" />
                            <span className="text-sm text-gray-500">No hay clases registradas</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      clasesSorted.map((c, index) => (
                        <tr 
                          key={c.id} 
                          className={`border-b hover:bg-slate-50 transition-colors ${
                            index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                          }`}
                        >
                          <td className="p-3">
                            <span className="font-medium text-slate-900">
                              {c.name}
                            </span>
                          </td>

                          <td className="p-3 text-right">
                            <div className="flex gap-1 justify-end">
                              {canEdit && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="hover:bg-amber-100 hover:text-amber-700"
                                      onClick={() => onEditClase(c)}
                                      disabled={loading}
                                    >
                                      <Pencil size={16} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Editar clase</TooltipContent>
                                </Tooltip>
                              )}

                              {canDelete && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="hover:bg-red-100 hover:text-red-700"
                                      onClick={() => askDeleteClase(c)}
                                      disabled={loading}
                                    >
                                      <Trash2 size={16} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Eliminar clase</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Footer con información */}
            {clasesSorted.length > 0 && (
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm">
                <span className="text-gray-600">
                  Total: <span className="font-semibold text-slate-700">{clasesSorted.length}</span> clase(s)
                </span>
              </div>
            )}

          </div>

          {/* Footer */}
          <SheetFooter className="border-t pt-4 mt-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)}
                  className="w-full"
                >
                  Cerrar
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Cerrar panel</TooltipContent>
            </Tooltip>
          </SheetFooter>

          {/* Dialogs */}
          <ClaseDialog
            open={claseOpen}
            onOpenChange={setClaseOpen}
            mode={claseMode}
            clase={claseSelected}
            onSave={saveClase}
          />

          <ConfirmDeleteDialog
            open={deleteOpen}
            onOpenChange={setDeleteOpen}
            title="Eliminar clase"
            description={`¿Seguro que deseas eliminar la clase "${deleteItem?.name}"?`}
            onConfirm={confirmDelete}
          />

        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}