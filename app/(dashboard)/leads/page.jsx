<<<<<<< Updated upstream
"use client";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useRequirePerm } from "@/hooks/useRequirePerm";


export default function LeadsPage() {
    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-semibold">Leads</h1>
            <Card>
                <CardContent className="pt-6">
                    <p>En construcción...</p>
                </CardContent>
            </Card>
        </div>
    );
}
=======
"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { useRequirePerm } from "@/hooks/useRequirePerm";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";

import OportunidadDialog from "@/app/components/oportunidades/OportunidadDialog";
import AssignmentDialogLead from "@/app/components/leads/AssignmentDialogLead";
import LeadsTable from "@/app/components/leads/LeadsTable";
import VistaPorUsuariosLeads from "@/app/components/leads/VistaPorUsuariosLeads";
import VistaPorEtapasLeads from "@/app/components/leads/VistaPorEtapasLeads";

const FILTER_ALL_CREATED = "__all_created__";
const FILTER_ALL_ASSIGNED = "__all_assigned__";
const FILTER_ALL_STATUS = "__all_status__";
const FILTER_ASSIGN_MODE_ALL = "__assign_mode_all__";
const FILTER_ASSIGN_MODE_ONLY_UNASSIGNED = "__assign_mode_only_unassigned__";
const FILTER_ASSIGN_MODE_ONLY_ASSIGNED = "__assign_mode_only_assigned__";

function buildUniqueOptions(rows, idKey, nameKey) {
  const map = new Map();

  rows.forEach((row) => {
    const id = row?.[idKey];
    const name = row?.[nameKey];
    if (id == null || !name) return;

    const key = String(id);
    if (!map.has(key)) {
      map.set(key, { id: key, name: String(name) });
    }
  });

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );
}

function buildUniqueStatusOptions(rows) {
  const map = new Map();

  rows.forEach((row) => {
    const name = row?.etapa_name;
    if (!name) return;

    const key = String(name).trim();
    if (!key) return;

    if (!map.has(key)) {
      map.set(key, { id: key, name: key });
    }
  });

  return Array.from(map.values()).sort((a, b) =>
    a.name.localeCompare(b.name, "es", { sensitivity: "base" })
  );
}

export default function LeadsPage() {
  const canView = useRequirePerm("leads", "view");

  const { user, permissions } = useAuth();

  const canCreate = hasPermission(permissions, "leads", "create");
  const canEdit = hasPermission(permissions, "leads", "edit");
  const canViewAll = hasPermission(permissions, "agenda", "viewall");
  const canAssign = hasPermission(permissions, "leads", "asignar");

  const [rows, setRows] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);

  const [createdByFilter, setCreatedByFilter] = useState(FILTER_ALL_CREATED);
  const [generalAssignedUserFilter, setGeneralAssignedUserFilter] = useState(FILTER_ALL_ASSIGNED);
  const [generalStatusFilter, setGeneralStatusFilter] = useState(FILTER_ALL_STATUS);
  const [generalAssignModeFilter, setGeneralAssignModeFilter] = useState(FILTER_ASSIGN_MODE_ALL);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState(null);

  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);

  async function loadData() {
    try {
      setLoading(true);

      const [leadsRes, usersRes] = await Promise.all([
        fetch("/api/leads", { cache: "no-store" }),
        fetch("/api/usuarios", { cache: "no-store" }),
      ]);

      const [leadsData, usersData] = await Promise.all([
        leadsRes.json(),
        usersRes.json(),
      ]);

      if (!leadsRes.ok) {
        throw new Error(leadsData?.message || "No se pudo cargar leads");
      }

      if (!usersRes.ok) {
        throw new Error(usersData?.message || "No se pudo cargar usuarios");
      }

      setRows(Array.isArray(leadsData) ? leadsData : []);
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

  const createdByOptions = useMemo(() => {
    return buildUniqueOptions(visibleRows, "created_by", "created_by_name");
  }, [visibleRows]);

  const assignedToOptions = useMemo(() => {
    return buildUniqueOptions(visibleRows, "asignado_a", "asignado_a_name");
  }, [visibleRows]);

  const statusOptions = useMemo(() => {
    return buildUniqueStatusOptions(visibleRows);
  }, [visibleRows]);

  const baseFilteredRows = useMemo(() => {
    return visibleRows.filter((row) => {
      const matchesCreatedBy =
        createdByFilter === FILTER_ALL_CREATED ||
        String(row?.created_by ?? "") === createdByFilter;

      return matchesCreatedBy;
    });
  }, [visibleRows, createdByFilter]);

  const generalRows = useMemo(() => {
    return baseFilteredRows.filter((row) => {
      const matchesAssignedUser =
        !canViewAll ||
        generalAssignedUserFilter === FILTER_ALL_ASSIGNED ||
        String(row?.asignado_a ?? "") === generalAssignedUserFilter;

      const matchesStatus =
        generalStatusFilter === FILTER_ALL_STATUS ||
        String(row?.etapa_name || "") === generalStatusFilter;

      const isAssigned =
        row?.asignado_a != null && String(row.asignado_a).trim() !== "";

      const matchesAssignMode =
        !canViewAll ||
        generalAssignModeFilter === FILTER_ASSIGN_MODE_ALL ||
        (generalAssignModeFilter === FILTER_ASSIGN_MODE_ONLY_UNASSIGNED && !isAssigned) ||
        (generalAssignModeFilter === FILTER_ASSIGN_MODE_ONLY_ASSIGNED && isAssigned);

      return matchesAssignedUser && matchesStatus && matchesAssignMode;
    });
  }, [
    baseFilteredRows,
    canViewAll,
    generalAssignedUserFilter,
    generalStatusFilter,
    generalAssignModeFilter,
  ]);

  function handleOpenEdit(row) {
    setSelectedLead(row);
    setDialogOpen(true);
  }

  function handleOpenAssign(row) {
    setAssignTarget(row);
    setAssignDialogOpen(true);
  }

  function handleOpenFromViews(row) {
    setSelectedLead(row);
    setDialogOpen(true);
  }

  if (!canView) return null;

  return (
    <div className="p-10 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Leads</h1>

        {canCreate && (
          <Button
            onClick={() => {
              setSelectedLead(null);
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar lead
          </Button>
        )}
      </div>

      <Tabs defaultValue="general" className="space-y-4">
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="vista_usuarios">Vista por usuarios</TabsTrigger>
          <TabsTrigger value="vista_etapas">Vista por etapas</TabsTrigger>
        </TabsList>

        <TabsContent value="general">
          <Card>
            <CardHeader className="flex flex-col gap-3">
              <CardTitle>Vista general de leads</CardTitle>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                {canViewAll && (
                  <Select
                    value={generalAssignedUserFilter}
                    onValueChange={setGeneralAssignedUserFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Usuario asignado" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FILTER_ALL_ASSIGNED}>
                        Todos los usuarios
                      </SelectItem>
                      {assignedToOptions.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Select value={generalStatusFilter} onValueChange={setGeneralStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FILTER_ALL_STATUS}>
                      Todos los estados
                    </SelectItem>
                    {statusOptions.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {canViewAll && (
                  <Select
                    value={generalAssignModeFilter}
                    onValueChange={setGeneralAssignModeFilter}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Modo de asignación" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FILTER_ASSIGN_MODE_ALL}>Todos</SelectItem>
                      <SelectItem value={FILTER_ASSIGN_MODE_ONLY_ASSIGNED}>
                        Solo asignados
                      </SelectItem>
                      <SelectItem value={FILTER_ASSIGN_MODE_ONLY_UNASSIGNED}>
                        Solo sin asignar
                      </SelectItem>
                    </SelectContent>
                  </Select>
                )}

                <Button variant="outline" onClick={loadData} disabled={loading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Recargar
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <LeadsTable
                rows={generalRows}
                loading={loading}
                onEdit={handleOpenEdit}
                onAssign={handleOpenAssign}
                canEdit={canEdit}
                canAssign={canAssign && canViewAll}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="vista_usuarios">
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Vista por usuarios</CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <VistaPorUsuariosLeads
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
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Vista por etapas</CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden">
              <VistaPorEtapasLeads
                rows={baseFilteredRows}
                onOpenOportunidad={handleOpenFromViews}
                canViewAll={canViewAll}
                currentUserId={user?.id || null}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <OportunidadDialog
        open={dialogOpen}
        onOpenChange={(value) => {
          setDialogOpen(value);
          if (!value) setSelectedLead(null);
        }}
        oportunidad={selectedLead}
        recordType="ld"
        onSuccess={() => {
          setDialogOpen(false);
          setSelectedLead(null);
          loadData();
        }}
      />

      <AssignmentDialogLead
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
    </div>
  );
}
>>>>>>> Stashed changes
