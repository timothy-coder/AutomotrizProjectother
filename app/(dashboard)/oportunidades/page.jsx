"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { useRequirePerm } from "@/hooks/useRequirePerm";
import { useAuth } from "@/context/AuthContext";

import OportunidadDialog from "@/app/components/oportunidades/OportunidadDialog";
import AssignmentDialog from "@/app/components/oportunidades/AssignmentDialog";
import OportunidadesTable from "@/app/components/oportunidades/OportunidadesTable";
import VistaPorUsuarios from "@/app/components/oportunidades/VistaporUsuarios";
import VistaPorEtapas from "@/app/components/oportunidades/VistaporEtapas";
import { hasPermission } from "@/lib/permissions";

const FILTER_ALL_CREATED = "__all_created__";

export default function OportunidadesPage() {
  const canView = useRequirePerm("oportunidades", "view");

  const { user, permissions } = useAuth();

  const canCreate = hasPermission(permissions, "oportunidades", "create");
  const canEdit = hasPermission(permissions, "oportunidades", "edit");
  const canViewAll = hasPermission(permissions, "agenda", "viewall");
  const canAssign = hasPermission(permissions, "oportunidades", "asignar");

  const [rows, setRows] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);

  const [createdByFilter, setCreatedByFilter] = useState(FILTER_ALL_CREATED);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOportunidad, setSelectedOportunidad] = useState(null);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);

  async function loadData() {
    try {
      setLoading(true);

      const [opRes, usersRes] = await Promise.all([
        fetch("/api/oportunidades", { cache: "no-store" }),
        fetch("/api/usuarios", { cache: "no-store" }),
      ]);

      const [opData, usersData] = await Promise.all([
        opRes.json(),
        usersRes.json(),
      ]);

      if (!opRes.ok) {
        throw new Error(opData?.message || "No se pudo cargar oportunidades");
      }

      if (!usersRes.ok) {
        throw new Error(usersData?.message || "No se pudo cargar usuarios");
      }

      setRows(Array.isArray(opData) ? opData : []);
      setUsuarios(Array.isArray(usersData) ? usersData : []);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "No se pudo cargar información");
      setRows([]);
      setUsuarios([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canView) loadData();
  }, [canView]);

  const visibleRows = useMemo(() => {
    if (!user?.id) return [];
    if (canViewAll) return rows;

    return rows.filter(
      (row) => String(row?.asignado_a ?? "") === String(user.id)
    );
  }, [rows, canViewAll, user]);

  const baseFilteredRows = useMemo(() => {
    return visibleRows.filter((row) => {
      const matchesCreatedBy =
        createdByFilter === FILTER_ALL_CREATED ||
        String(row?.created_by ?? "") === createdByFilter;

      return matchesCreatedBy;
    });
  }, [visibleRows, createdByFilter]);

  function handleOpenEdit(row) {
    setSelectedOportunidad(row);
    setDialogOpen(true);
  }

  function handleOpenAssign(row) {
    setAssignTarget(row);
    setAssignDialogOpen(true);
  }

  function handleOpenFromViews(row) {
    setSelectedOportunidad(row);
    setDialogOpen(true);
  }

  if (!canView) return null;

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* ENCABEZADO */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Oportunidades</h1>
            <p className="text-sm text-slate-600 mt-1">Gestiona todas tus oportunidades de negocio</p>
          </div>

          {canCreate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => {
                    setSelectedOportunidad(null);
                    setDialogOpen(true);
                  }}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                >
                  <Plus className="h-4 w-4" />
                  Agregar oportunidad
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Crear nueva oportunidad</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* TABS */}
        <Tabs defaultValue="general" className="space-y-4">
          <div className="border-b border-slate-200">
            <TabsList className="bg-transparent border-b-0 gap-8 p-0">
              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger 
                    value="general"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none px-0 pb-3"
                  >
                    <span className="text-sm font-medium">General</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">Vista general de todas las oportunidades</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger 
                    value="vista_usuarios"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none px-0 pb-3"
                  >
                    <span className="text-sm font-medium">Tablero</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">Tablero por usuarios asignados</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <TabsTrigger 
                    value="vista_etapas"
                    className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:bg-transparent rounded-none px-0 pb-3"
                  >
                    <span className="text-sm font-medium">Kanban</span>
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="top">Vista Kanban por etapas</TooltipContent>
              </Tooltip>
            </TabsList>
          </div>

          <TabsContent value="general" className="space-y-0">
            <OportunidadesTable
              rows={baseFilteredRows}
              loading={loading}
              onEdit={handleOpenEdit}
              onAssign={handleOpenAssign}
              canEdit={canEdit}
              canAssign={canAssign && canViewAll}
              onRefresh={loadData}
              usuarios={usuarios}
            />
          </TabsContent>

          <TabsContent value="vista_usuarios">
            <Card className="overflow-hidden shadow-sm border-slate-200">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <CardTitle className="text-xl">Tablero por Usuarios</CardTitle>
              </CardHeader>
              <CardContent className="overflow-hidden p-0">
                <VistaPorUsuarios
                  rows={baseFilteredRows}
                  usuarios={usuarios}
                  onOpenOportunidad={handleOpenFromViews}
                  canViewAll={canViewAll}
                  currentUserId={user?.id || null}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="vista_etapas">
            <Card className="overflow-hidden shadow-sm border-slate-200">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <CardTitle className="text-xl">Kanban de Etapas</CardTitle>
              </CardHeader>
              <CardContent className="overflow-hidden p-0">
                <VistaPorEtapas
                  rows={baseFilteredRows}
                  onOpenOportunidad={handleOpenFromViews}
                  canViewAll={canViewAll}
                  currentUserId={user?.id || null}
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      <OportunidadDialog
        open={dialogOpen}
        onOpenChange={(value) => {
          setDialogOpen(value);
          if (!value) setSelectedOportunidad(null);
        }}
        oportunidad={selectedOportunidad}
        onSuccess={() => {
          setDialogOpen(false);
          setSelectedOportunidad(null);
          loadData();
        }}
      />

      <AssignmentDialog
        open={assignDialogOpen}
        onOpenChange={(value) => {
          setAssignDialogOpen(value);
          if (!value) setAssignTarget(null);
        }}
        oportunidad={assignTarget}
        usuarios={usuarios}
        onAssigned={() => {
          setAssignDialogOpen(false);
          setAssignTarget(null);
          loadData();
        }}
      />
    </TooltipProvider>
  );
}