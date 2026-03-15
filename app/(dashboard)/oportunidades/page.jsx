<<<<<<< Updated upstream
"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

import { useRequirePerm } from "@/hooks/useRequirePerm";
import { useAuth } from "@/context/AuthContext";

import OportunidadDialog from "@/app/components/oportunidades/OportunidadDialog";
import AssignmentDialog from "@/app/components/oportunidades/AssignmentDialog";
import OportunidadesTable from "@/app/components/oportunidades/OportunidadesTable";
import VistaPorUsuarios from "@/app/components/oportunidades/VistaporUsuarios";
import VistaPorEtapas from "@/app/components/oportunidades/VistaporEtapas";

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

export default function OportunidadesPage() {
  const canView = useRequirePerm("oportunidades", "view");
  const canCreate = useRequirePerm("oportunidades", "create");
  const canEdit = useRequirePerm("oportunidades", "edit");
  const canAssign = useRequirePerm("oportunidades", "edit");

  const { user } = useAuth();

  const [rows, setRows] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(false);

  const [globalFilter, setGlobalFilter] = useState("");
  const [createdByFilter, setCreatedByFilter] = useState(FILTER_ALL_CREATED);

  const [generalAssignedUserFilter, setGeneralAssignedUserFilter] = useState(FILTER_ALL_ASSIGNED);
  const [generalStatusFilter, setGeneralStatusFilter] = useState(FILTER_ALL_STATUS);
  const [generalAssignModeFilter, setGeneralAssignModeFilter] = useState(FILTER_ASSIGN_MODE_ALL);

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

  const createdByOptions = useMemo(() => {
    return buildUniqueOptions(rows, "created_by", "created_by_name");
  }, [rows]);

  const assignedToOptions = useMemo(() => {
    return buildUniqueOptions(rows, "asignado_a", "asignado_a_name");
  }, [rows]);

  const statusOptions = useMemo(() => {
    return buildUniqueStatusOptions(rows);
  }, [rows]);

  const baseFilteredRows = useMemo(() => {
    const q = globalFilter.trim().toLowerCase();

    return rows.filter((row) => {
      const cliente = String(row?.cliente_name || "").toLowerCase();
      const createdBy = String(row?.created_by_name || "").toLowerCase();
      const assignedTo = String(row?.asignado_a_name || "").toLowerCase();
      const origen = String(row?.origen_name || "").toLowerCase();
      const suborigen = String(row?.suborigen_name || "").toLowerCase();
      const etapa = String(row?.etapa_name || "").toLowerCase();
      const vehiculo = `${row?.modelo_name || ""} ${row?.marca_name || ""}`.toLowerCase();
      const temperatura = String(row?.temperatura ?? "").toLowerCase();

      const matchesGlobal =
        !q ||
        cliente.includes(q) ||
        createdBy.includes(q) ||
        assignedTo.includes(q) ||
        origen.includes(q) ||
        suborigen.includes(q) ||
        etapa.includes(q) ||
        vehiculo.includes(q) ||
        temperatura.includes(q) ||
        String(row?.oportunidad_id || "").toLowerCase().includes(q);

      const matchesCreatedBy =
        createdByFilter === FILTER_ALL_CREATED ||
        String(row?.created_by ?? "") === createdByFilter;

      return matchesGlobal && matchesCreatedBy;
    });
  }, [rows, globalFilter, createdByFilter]);

  const misOportunidadesRows = useMemo(() => {
    if (!user?.id) return [];
    return baseFilteredRows.filter(
      (row) => String(row?.asignado_a ?? "") === String(user.id)
    );
  }, [baseFilteredRows, user]);

  const generalRows = useMemo(() => {
    return baseFilteredRows.filter((row) => {
      const matchesAssignedUser =
        generalAssignedUserFilter === FILTER_ALL_ASSIGNED ||
        String(row?.asignado_a ?? "") === generalAssignedUserFilter;

      const matchesStatus =
        generalStatusFilter === FILTER_ALL_STATUS ||
        String(row?.etapa_name || "") === generalStatusFilter;

      const isAssigned =
        row?.asignado_a != null && String(row.asignado_a).trim() !== "";

      const matchesAssignMode =
        generalAssignModeFilter === FILTER_ASSIGN_MODE_ALL ||
        (generalAssignModeFilter === FILTER_ASSIGN_MODE_ONLY_UNASSIGNED && !isAssigned) ||
        (generalAssignModeFilter === FILTER_ASSIGN_MODE_ONLY_ASSIGNED && isAssigned);

      return matchesAssignedUser && matchesStatus && matchesAssignMode;
    });
  }, [
    baseFilteredRows,
    generalAssignedUserFilter,
    generalStatusFilter,
    generalAssignModeFilter,
  ]);

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
    <div className="p-10 space-y-4">
      <h1 className="text-2xl font-semibold">Oportunidades</h1>

      <Tabs defaultValue="mis_oportunidades" className="space-y-4">
        <TabsList>
          <TabsTrigger value="mis_oportunidades">Mis oportunidades</TabsTrigger>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="vista_usuarios">Vista por usuarios</TabsTrigger>
          <TabsTrigger value="vista_etapas">Vista por etapas</TabsTrigger>
        </TabsList>

        <TabsContent value="mis_oportunidades">
          <Card>
            <CardHeader className="flex flex-col gap-3">
              <CardTitle>Oportunidades asignadas al usuario logueado</CardTitle>

              <div className="flex flex-col xl:flex-row gap-2 xl:items-center xl:justify-between">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 w-full">
                  <Input
                    placeholder="Buscar general..."
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                  />

                  <Select value={createdByFilter} onValueChange={setCreatedByFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="Filtrar creado por" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={FILTER_ALL_CREATED}>
                        Todos los creadores
                      </SelectItem>
                      {createdByOptions.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex flex-col md:flex-row gap-2">
                  <Button variant="outline" onClick={loadData} disabled={loading}>
                    <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                    Recargar
                  </Button>

                  {canCreate && (
                    <Button
                      onClick={() => {
                        setSelectedOportunidad(null);
                        setDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Nueva oportunidad
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <OportunidadesTable
                rows={misOportunidadesRows}
                loading={loading}
                onEdit={handleOpenEdit}
                onAssign={handleOpenAssign}
                canEdit={canEdit}
                canAssign={canAssign}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="general">
          <Card>
            <CardHeader className="flex flex-col gap-3">
              <CardTitle>Vista general de oportunidades</CardTitle>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
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

                <Button variant="outline" onClick={loadData} disabled={loading}>
                  <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                  Recargar
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              <OportunidadesTable
                rows={generalRows}
                loading={loading}
                onEdit={handleOpenEdit}
                onAssign={handleOpenAssign}
                canEdit={canEdit}
                canAssign={canAssign}
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
      <VistaPorUsuarios
        rows={baseFilteredRows}
        usuarios={usuarios}
        onOpenOportunidad={handleOpenFromViews}
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
      <VistaPorEtapas
        rows={baseFilteredRows}
        onOpenOportunidad={handleOpenFromViews}
      />
    </CardContent>
  </Card>
</TabsContent>
      </Tabs>

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

import OportunidadDialog from "@/app/components/oportunidades/OportunidadDialog";
import AssignmentDialog from "@/app/components/oportunidades/AssignmentDialog";
import OportunidadesTable from "@/app/components/oportunidades/OportunidadesTable";
import VistaPorUsuarios from "@/app/components/oportunidades/VistaporUsuarios";
import VistaPorEtapas from "@/app/components/oportunidades/VistaporEtapas";
import { hasPermission } from "@/lib/permissions";

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
  const [generalAssignedUserFilter, setGeneralAssignedUserFilter] = useState(FILTER_ALL_ASSIGNED);
  const [generalStatusFilter, setGeneralStatusFilter] = useState(FILTER_ALL_STATUS);
  const [generalAssignModeFilter, setGeneralAssignModeFilter] = useState(FILTER_ASSIGN_MODE_ALL);

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
    <div className="p-10 space-y-4">
      <div className="flex items-center justify-between gap-3">
  <h1 className="text-2xl font-semibold">Oportunidades</h1>

  {canCreate && (
    <Button
      onClick={() => {
        setSelectedOportunidad(null);
        setDialogOpen(true);
      }}
    >
      <Plus className="mr-2 h-4 w-4" />
      Agregar oportunidad
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
              <CardTitle>Vista general de oportunidades</CardTitle>

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
              <OportunidadesTable
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
          <Card className="overflow-hidden">
            <CardHeader>
              <CardTitle>Vista por etapas</CardTitle>
            </CardHeader>
            <CardContent className="overflow-hidden">
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
    </div>
  );
}
>>>>>>> Stashed changes
