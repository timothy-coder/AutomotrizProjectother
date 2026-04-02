"use client";

import { useEffect, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Pencil, Trash2, Plus, RefreshCw, Wrench, Calendar } from "lucide-react";
import { toast } from "sonner";
import AlgoritmoVisitaDialog from "./AlgoritmoVisitaDialog";
import ConfirmDeleteDialog from "./ConfirmDeleteDialog";

export default function AlgoritmoVisitaSheet({
  open,
  onOpenChange,
  canEdit = true,
  canDelete = true,
  canCreate = true,
  onChanged,
}) {
  const [loading, setLoading] = useState(false);
  const [records, setRecords] = useState([]);
  const [marcas, setMarcas] = useState([]);

  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [formMode, setFormMode] = useState("create");
  const [selectedRecord, setSelectedRecord] = useState(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recordToDelete, setRecordToDelete] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [recordsRes, marcasRes] = await Promise.all([
        fetch("/api/algoritmo_visita", { cache: "no-store" }),
        fetch("/api/marcas", { cache: "no-store" }),
      ]);

      const recordsData = await recordsRes.json();
      const marcasData = await marcasRes.json();

      setRecords(Array.isArray(recordsData) ? recordsData : []);
      setMarcas(Array.isArray(marcasData) ? marcasData : []);
    } catch (e) {
      toast.error("Error cargando datos.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) loadData();
  }, [open]);

  const recordsSorted = useMemo(() => {
    return [...records].sort((a, b) =>
      String(a.modelo_name || "").localeCompare(String(b.modelo_name || ""))
    );
  }, [records]);

  const onNewRecord = () => {
    setSelectedRecord(null);
    setFormMode("create");
    setFormDialogOpen(true);
  };

  const onEditRecord = (record) => {
    setSelectedRecord(record);
    setFormMode("edit");
    setFormDialogOpen(true);
  };

  const askDeleteRecord = (record) => {
    setRecordToDelete(record);
    setDeleteDialogOpen(true);
  };

  const saveRecord = async (data) => {
    const isEdit = !!data.id;
    const url = isEdit
      ? `/api/algoritmo_visita/${data.id}`
      : `/api/algoritmo_visita`;
    const method = isEdit ? "PUT" : "POST";

    if (!Array.isArray(data.años)) {
      toast.error("El campo 'años' debe ser un array.");
      return;
    }

    for (const range of data.años) {
      if (!/^\d{4}-\d{4}$/.test(range)) {
        toast.error("Cada rango de 'años' debe tener el formato YYYY-YYYY.");
        return;
      }
    }

    try {
      const payload = {
        ...data,
        modelo_id: Number(data.modelo_id),
        marca_id: Number(data.marca_id),
        kilometraje: Number(data.kilometraje),
        meses: Number(data.meses),
      };

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Error al guardar el registro");
      }

      toast.success(isEdit ? "Registro actualizado" : "Registro creado");
      setFormDialogOpen(false);
      setSelectedRecord(null);
      await loadData();
      onChanged?.();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo guardar el registro");
    }
  };

  const confirmDelete = async () => {
    if (!recordToDelete) return;

    try {
      const res = await fetch(`/api/algoritmo_visita/${recordToDelete.id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const message = await res.text();
        throw new Error(message || "Error al eliminar el registro");
      }

      toast.success("Registro eliminado");
      setDeleteDialogOpen(false);
      setRecordToDelete(null);
      await loadData();
      onChanged?.();
    } catch (e) {
      console.error(e);
      toast.error("No se pudo eliminar el registro");
    }
  };

  return (
    <TooltipProvider>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="right" className="w-full sm:max-w-lg flex flex-col px-3">

          {/* Header */}
          <SheetHeader className="border-b pb-4">
            <div className="flex items-center gap-2">
              <Wrench size={24} className="text-[#5d16ec]" />
              <div>
                <SheetTitle className="text-xl">Tiempo de Mantenimiento</SheetTitle>
                <SheetDescription>
                  Configura los intervalos de mantenimiento por modelo
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
                    onClick={loadData} 
                    disabled={loading}
                    size="sm"
                    className="gap-2"
                  >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                    Recargar
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Actualizar lista de registros</TooltipContent>
              </Tooltip>

              {canCreate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      onClick={onNewRecord} 
                      disabled={loading}
                      className="bg-[#5d16ec] hover:bg-[#5d16ec]/70 text-white gap-2 ml-auto"
                      size="sm"
                    >
                      <Plus size={16} />
                      Nuevo registro
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Crear nuevo registro de mantenimiento</TooltipContent>
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
                        <div className="flex items-center gap-1">
                          <span>Modelo</span>
                        </div>
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-700">Marca</th>
                      <th className="p-3 text-left font-semibold text-slate-700">
                        <div className="flex items-center gap-1">
                          <span>Km</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Calendar size={12} className="text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Cada cuántos km hacer mantenimiento
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </th>
                      <th className="p-3 text-left font-semibold text-slate-700">
                        <div className="flex items-center gap-1">
                          <span>Meses</span>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Calendar size={12} className="text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Cada cuántos meses hacer mantenimiento
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </th>
                      <th className="p-3 text-right font-semibold text-slate-700">Acciones</th>
                    </tr>
                  </thead>

                  {/* Body */}
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <RefreshCw size={20} className="text-gray-400 animate-spin" />
                            <span className="text-sm text-gray-500">Cargando registros...</span>
                          </div>
                        </td>
                      </tr>
                    ) : recordsSorted.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="p-8 text-center">
                          <div className="flex flex-col items-center gap-2">
                            <Wrench size={24} className="text-gray-300" />
                            <span className="text-sm text-gray-500">
                              No hay registros de mantenimiento
                            </span>
                            <p className="text-xs text-gray-400 mt-1">
                              Crea uno nuevo para comenzar
                            </p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      recordsSorted.map((record, index) => (
                        <tr 
                          key={record.id}
                          className={`border-b transition-colors `}
                        >
                          <td className="p-3">
                            <span className="font-medium text-slate-900">
                              {record.modelo_name}
                            </span>
                          </td>
                          <td className="p-3 text-gray-700">
                            {record.marca_name}
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-blue-100 text-blue-700 text-xs font-semibold">
                              <Wrench size={12} />
                              {record.kilometraje} km
                            </span>
                          </td>
                          <td className="p-3">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 text-purple-700 text-xs font-semibold">
                              <Calendar size={12} />
                              {record.meses} m
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
                                      onClick={() => onEditRecord(record)}
                                      disabled={loading}
                                    >
                                      <Pencil size={16} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Editar registro</TooltipContent>
                                </Tooltip>
                              )}

                              {canDelete && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="destructive"
                                      onClick={() => askDeleteRecord(record)}
                                      disabled={loading}
                                    >
                                      <Trash2 size={16} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top">Eliminar registro</TooltipContent>
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
            {recordsSorted.length > 0 && (
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm border border-slate-200">
                <span className="text-gray-600">
                  Total: <span className="font-semibold text-slate-700">{recordsSorted.length}</span> registro(s)
                </span>
                <span className="text-xs text-gray-500">
                  Modelos configurados
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
              <TooltipContent side="top">Cerrar panel de configuración</TooltipContent>
            </Tooltip>
          </SheetFooter>

          {/* Dialogs */}
          <AlgoritmoVisitaDialog
            open={formDialogOpen}
            onOpenChange={setFormDialogOpen}
            mode={formMode}
            record={selectedRecord}
            marcas={marcas}
            onSave={saveRecord}
          />

          <ConfirmDeleteDialog
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            title="Eliminar registro de mantenimiento"
            description={`¿Seguro que deseas eliminar este registro de mantenimiento para el modelo "${recordToDelete?.modelo_name}" (${recordToDelete?.marca_name})?`}
            onConfirm={confirmDelete}
          />

        </SheetContent>
      </Sheet>
    </TooltipProvider>
  );
}