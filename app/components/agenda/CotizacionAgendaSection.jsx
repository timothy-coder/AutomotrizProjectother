"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useUserScope } from "@/hooks/useUserScope";
import { Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CotizacionesTable from "./CotizacionesTable";
import CotizacionDialog from "./CotizacionDialog";
import DeleteCotizacionDialog from "./DeleteCotizacionDialog";
import HistorialDialog from "./HistorialDialog";

export default function CotizacionesAgendaSection({
  oportunidadId,
  oportunidadData,
  onCotizacionCreated,
}) {
  const { userId, loading: userLoading } = useUserScope();

  const [cotizaciones, setCotizaciones] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [versiones, setVersiones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [historialDialog, setHistorialDialog] = useState(false);
  const [selectedHistorial, setSelectedHistorial] = useState(null);
  const [historialLoading, setHistorialLoading] = useState(false);

  const [editingCotizacion, setEditingCotizacion] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [sortConfig, setSortConfig] = useState({
    key: "id",
    direction: "asc",
  });

  async function loadData() {
    setLoading(true);
    try {
      const [cot, m, mo, v] = await Promise.all([
        fetch(`/api/cotizacionesagenda?oportunidad_id=${oportunidadId}`, {
          cache: "no-store",
        }).then((r) => r.json()),
        fetch("/api/marcas", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/modelos", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/versiones?limit=1000", { cache: "no-store" }).then((r) =>
          r.json()
        ),
      ]);

      setCotizaciones(Array.isArray(cot) ? cot : []);
      setMarcas(Array.isArray(m) ? m : []);
      setModelos(Array.isArray(mo) ? mo : []);

      let versionesData = [];
      if (v.data && Array.isArray(v.data)) {
        versionesData = v.data;
      } else if (Array.isArray(v)) {
        versionesData = v;
      }
      setVersiones(versionesData);
    } catch (error) {
      console.error(error);
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  async function loadHistorial(cotizacionId) {
    try {
      setHistorialLoading(true);
      const res = await fetch(
        `/api/cotizacionesagenda/${cotizacionId}/vistas-historial`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setSelectedHistorial(data);
      setHistorialDialog(true);
    } catch (error) {
      console.error(error);
      toast.error("Error cargando historial");
    } finally {
      setHistorialLoading(false);
    }
  }

  function openCreate() {
    setEditingCotizacion(null);
    setDialogOpen(true);
  }

  function openEdit(cotizacion) {
    setEditingCotizacion(cotizacion);
    setDialogOpen(true);
  }

  function openDelete(cotizacion) {
    setDeleteTarget(cotizacion);
    setDeleteDialog(true);
  }

  async function changeStatus(cotizacion, nuevoEstado) {
    try {
      setSaving(true);
      const response = await fetch(`/api/cotizacionesagenda/${cotizacion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: cotizacion.sku,
          color_externo: cotizacion.color_externo,
          color_interno: cotizacion.color_interno,
          version_id: cotizacion.version_id,
          anio: cotizacion.anio,
          marca_id: cotizacion.marca_id,
          modelo_id: cotizacion.modelo_id,
          estado: nuevoEstado,
        }),
      });

      if (response.ok) {
        // Si el estado es "enviada", cambiar la etapa de la oportunidad a "Venta Facturada"
        if (nuevoEstado === "enviada") {
          try {
            await fetch(
              `/api/oportunidades-oportunidades/${oportunidadId}/cambiar-etapa`,
              {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  etapasconversion_id: 9, // Venta Facturada
                  created_by: userId,
                }),
              }
            );
          } catch (error) {
            console.error("Error cambiando etapa de oportunidad:", error);
          }
        }

        toast.success(`Estado cambiado a ${nuevoEstado}`);
        loadData();
      } else {
        toast.error("Error cambiando estado");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error cambiando estado");
    } finally {
      setSaving(false);
    }
  }

  async function duplicateCotizacion(cotizacion) {
    try {
      setSaving(true);
      const response = await fetch("/api/cotizacionesagenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oportunidad_id: cotizacion.oportunidad_id,
          marca_id: cotizacion.marca_id,
          modelo_id: cotizacion.modelo_id,
          version_id: cotizacion.version_id,
          anio: cotizacion.anio,
          sku: cotizacion.sku,
          color_externo: cotizacion.color_externo,
          color_interno: cotizacion.color_interno,
          estado: "borrador",
          created_by: userId,
        }),
      });

      if (response.ok) {
        toast.success("Cotización duplicada");
        loadData();
      } else {
        toast.error("Error duplicando cotización");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error duplicando cotización");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    try {
      setSaving(true);
      const response = await fetch(`/api/cotizacionesagenda/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Eliminada");
        setDeleteDialog(false);
        loadData();
      } else {
        toast.error("Error eliminando");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error eliminando");
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [oportunidadId]);

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  };

  if (loading || userLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
                <Plus className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Cotizaciones
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Gestiona todas las cotizaciones de esta oportunidad
                </p>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={openCreate}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Nueva Cotización
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Crear nueva cotización
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* TABLA DE COTIZACIONES */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <CardTitle className="text-lg font-bold text-gray-900">
              Lista de Cotizaciones
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-6">
            <CotizacionesTable
              cotizaciones={cotizaciones}
              sortConfig={sortConfig}
              onSort={handleSort}
              onEdit={openEdit}
              onDelete={openDelete}
              onChangeStatus={changeStatus}
              onDuplicate={duplicateCotizacion}
              onLoadHistorial={loadHistorial}
              saving={saving}
              userId={userId}
            />
          </CardContent>
        </Card>

        {/* DIALOGS */}
        <CotizacionDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          editingCotizacion={editingCotizacion}
          oportunidadId={oportunidadId}
          marcas={marcas}
          modelos={modelos}
          versiones={versiones}
          userId={userId}
          onSave={loadData}
          onCotizacionCreated={onCotizacionCreated}
        />

        <DeleteCotizacionDialog
          open={deleteDialog}
          onOpenChange={setDeleteDialog}
          deleteTarget={deleteTarget}
          saving={saving}
          onConfirm={confirmDelete}
        />

        <HistorialDialog
          open={historialDialog}
          onOpenChange={setHistorialDialog}
          selectedHistorial={selectedHistorial}
          loading={historialLoading}
        />
      </div>
    </TooltipProvider>
  );
}