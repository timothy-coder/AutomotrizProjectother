"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, RefreshCw, X, Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

import { useRequirePerm } from "@/hooks/useRequirePerm";
import { useAuth } from "@/context/AuthContext";

import OportunidadDialog from "@/app/components/oportunidades/OportunidadDialog";
import AssignmentDialog from "@/app/components/oportunidades/AssignmentDialog";
import OportunidadesTable from "@/app/components/oportunidades/OportunidadesTable";
import VistaPorUsuarios from "@/app/components/oportunidades/VistaporUsuarios";
import VistaPorEtapas from "@/app/components/oportunidades/VistaporEtapas";
import { hasPermission } from "@/lib/permissions";

const FILTER_ALL_CREATED = "__all_created__";
const FILTER_ALL = "__all__";
const FILTER_TODAY = "hoy";
const FILTER_THIS_WEEK = "esta_semana";
const FILTER_THIS_MONTH = "este_mes";

// Componente FilterCombobox mejorado
function FilterCombobox({
  value,
  onChange,
  items = [],
  placeholder = "Buscar...",
  emptyText = "No hay resultados",
  getLabel = (item) => item.nombre || item.name || item.fullname || item.username || `Item ${item.id}`,
}) {
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  // Filtrar items según búsqueda
  const filteredItems = useMemo(() => {
    if (!searchValue.trim()) return items;
    
    const search = searchValue.toLowerCase();
    return items.filter((item) =>
      getLabel(item).toLowerCase().includes(search)
    );
  }, [items, searchValue, getLabel]);

  const selectedLabel = useMemo(() => {
    if (value === FILTER_ALL || value === FILTER_ALL_CREATED) {
      return "Todos";
    }
    const selectedItem = items.find((item) => String(item.id) === value);
    return selectedItem ? getLabel(selectedItem) : placeholder;
  }, [value, items, getLabel, placeholder]);

  const handleSelect = (itemId) => {
    onChange(itemId);
    setOpen(false);
    setSearchValue("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between h-9 text-sm"
        >
          {selectedLabel}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={searchValue}
            onValueChange={setSearchValue}
            className="h-9"
          />
          <CommandList>
            {filteredItems.length === 0 ? (
              <CommandEmpty>{emptyText}</CommandEmpty>
            ) : (
              <CommandGroup>
                <CommandItem
                  value="__all__"
                  onSelect={() => handleSelect(FILTER_ALL)}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === FILTER_ALL || value === FILTER_ALL_CREATED
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  Todos
                </CommandItem>
                {filteredItems.map((item) => (
                  <CommandItem
                    key={item.id}
                    value={String(item.id)}
                    onSelect={() => handleSelect(String(item.id))}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value === String(item.id) ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {getLabel(item)}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function OportunidadesPage() {
  const canView = useRequirePerm("oportunidades", "view");
  const { user, permissions } = useAuth();

  const canCreate = hasPermission(permissions, "oportunidades", "create");
  const canEdit = hasPermission(permissions, "oportunidades", "edit");
  const canViewAll = hasPermission(permissions, "oportunidades", "viewall");
  const canAssign = hasPermission(permissions, "oportunidades", "asignar");

  const [rows, setRows] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [origenes, setOrigenes] = useState([]);
  const [estadosTiempo, setEstadosTiempo] = useState([]);
  const [loading, setLoading] = useState(false);

  // Estados de filtros
  const [filterCliente, setFilterCliente] = useState(FILTER_ALL);
  const [filterOrigen, setFilterOrigen] = useState(FILTER_ALL);
  const [filterEtapa, setFilterEtapa] = useState(FILTER_ALL);
  const [filterAsignado, setFilterAsignado] = useState(FILTER_ALL);
  const [createdByFilter, setCreatedByFilter] = useState(FILTER_ALL_CREATED);
  const [filterFecha, setFilterFecha] = useState(FILTER_ALL);

  const [activeTab, setActiveTab] = useState("general");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedOportunidad, setSelectedOportunidad] = useState(null);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState(null);

  function getFechaFiltros() {
    const hoy = new Date();
    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);

    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);

    return {
      hoy: hoy.toISOString().split("T")[0],
      inicioSemana: inicioSemana.toISOString().split("T")[0],
      finSemana: finSemana.toISOString().split("T")[0],
      inicioMes: inicioMes.toISOString().split("T")[0],
      finMes: finMes.toISOString().split("T")[0],
    };
  }

  // ✅ FILTRAR SOLO OPORTUNIDADES CON PREFIJO "OPO-"
  function filtrarOportunidadesOPO(oportunidades) {
    return oportunidades.filter((opp) => {
      const prefijo = opp.oportunidad_id?.substring(0, 3);
      return prefijo === "OPO";
    });
  }

  async function enriquecerOportunidadesConDetalles(oportunidades) {
    try {
      const oportunidadesEnriquecidas = await Promise.all(
        oportunidades.map(async (opp) => {
          try {
            const res = await fetch(
              `/api/oportunidades-oportunidades/${opp.id}/detalles?limit=1`,
              { cache: "no-store" }
            );
            const data = await res.json();
            const ultimoDetalle = Array.isArray(data)
              ? data[0]
              : Array.isArray(data?.data)
                ? data.data[0]
                : null;

            return {
              ...opp,
              ultimoDetalle,
              fecha_ultima_agenda: ultimoDetalle?.fecha_agenda,
              hora_ultima_agenda: ultimoDetalle?.hora_agenda,
            };
          } catch (error) {
            console.error(`Error enriqueciendo oportunidad ${opp.id}:`, error);
            return opp;
          }
        })
      );
      return oportunidadesEnriquecidas;
    } catch (error) {
      console.error("Error enriqueciendo oportunidades:", error);
      return oportunidades;
    }
  }

  async function loadData() {
    try {
      setLoading(true);

      const requests = [
        fetch("/api/oportunidades-oportunidades?limit=1000", {
          cache: "no-store",
        }),
        fetch("/api/usuarios", { cache: "no-store" }),
        fetch("/api/etapasconversion", { cache: "no-store" }),
        fetch("/api/clientes", { cache: "no-store" }),
        fetch("/api/origenes_citas", { cache: "no-store" }),
        fetch("/api/configuracion-estados-tiempo", { cache: "no-store" }),
      ];

      const responses = await Promise.all(requests);
      const [opRes] = responses;
      const [opData, usersData, etapasData, clientesData, origenesData, estadosData] =
        await Promise.all(responses.map((r) => r.json()));

      if (!opRes.ok) {
        throw new Error(opData?.message || "No se pudo cargar oportunidades");
      }

      let oportunidades = Array.isArray(opData)
        ? opData
        : Array.isArray(opData?.data)
          ? opData.data
          : [];

      // ✅ FILTRAR SOLO OPORTUNIDADES CON PREFIJO "OPO-"
      oportunidades = filtrarOportunidadesOPO(oportunidades);

      const oportunidadesEnriquecidas =
        await enriquecerOportunidadesConDetalles(oportunidades);

      setRows(oportunidadesEnriquecidas);
      setUsuarios(Array.isArray(usersData) ? usersData : []);
      setEtapas(Array.isArray(etapasData) ? etapasData : []);
      setClientes(Array.isArray(clientesData) ? clientesData : []);
      setOrigenes(Array.isArray(origenesData) ? origenesData : []);

      const estadosFiltrados = Array.isArray(estadosData)
        ? estadosData.filter((e) => e.activo === 1 || e.activo === true)
        : [];
      setEstadosTiempo(estadosFiltrados);

      console.log("✅ Oportunidades OPO cargadas:", oportunidadesEnriquecidas.length);
    } catch (error) {
      console.error("❌ Error cargando datos:", error);
      toast.error(error.message || "No se pudo cargar información");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canView) loadData();
  }, [canView]);

  const visibleRows = useMemo(() => {
    if (!user?.id) return rows;
    if (canViewAll) return rows;
    return rows.filter(
      (row) => String(row?.asignado_a ?? "") === String(user.id)
    );
  }, [rows, canViewAll, user]);

  const baseFilteredRows = useMemo(() => {
    const fechas = getFechaFiltros();

    return visibleRows.filter((row) => {
      const matchesCreatedBy =
        createdByFilter === FILTER_ALL_CREATED ||
        String(row?.created_by ?? "") === createdByFilter;

      const matchesCliente =
        filterCliente === FILTER_ALL ||
        String(row?.cliente_id ?? "") === filterCliente;

      const matchesOrigen =
        filterOrigen === FILTER_ALL ||
        String(row?.origen_id ?? "") === filterOrigen;

      const matchesEtapa =
        filterEtapa === FILTER_ALL ||
        String(row?.etapasconversion_id ?? "") === filterEtapa;

      const matchesAsignado =
        filterAsignado === FILTER_ALL ||
        String(row?.asignado_a ?? "") === filterAsignado;

      let matchesFecha = filterFecha === FILTER_ALL;
      if (!matchesFecha && row.fecha_ultima_agenda) {
        const fechaAgenda = row.fecha_ultima_agenda;

        switch (filterFecha) {
          case FILTER_TODAY:
            matchesFecha = fechaAgenda === fechas.hoy;
            break;
          case FILTER_THIS_WEEK:
            matchesFecha =
              fechaAgenda >= fechas.inicioSemana &&
              fechaAgenda <= fechas.finSemana;
            break;
          case FILTER_THIS_MONTH:
            matchesFecha =
              fechaAgenda >= fechas.inicioMes && fechaAgenda <= fechas.finMes;
            break;
          default:
            matchesFecha = true;
        }
      }

      return (
        matchesCreatedBy &&
        matchesCliente &&
        matchesOrigen &&
        matchesEtapa &&
        matchesAsignado &&
        matchesFecha
      );
    });
  }, [
    visibleRows,
    createdByFilter,
    filterCliente,
    filterOrigen,
    filterEtapa,
    filterAsignado,
    filterFecha,
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

  function clearFilters() {
    setFilterCliente(FILTER_ALL);
    setFilterOrigen(FILTER_ALL);
    setFilterEtapa(FILTER_ALL);
    setFilterAsignado(FILTER_ALL);
    setCreatedByFilter(FILTER_ALL_CREATED);
    setFilterFecha(FILTER_ALL);
  }

  const hasActiveFilters =
    filterCliente !== FILTER_ALL ||
    filterOrigen !== FILTER_ALL ||
    filterEtapa !== FILTER_ALL ||
    filterAsignado !== FILTER_ALL ||
    createdByFilter !== FILTER_ALL_CREATED ||
    filterFecha !== FILTER_ALL;

  if (!canView) return null;

  return (
    <TooltipProvider>
      <div className="p-6 space-y-6">
        {/* ENCABEZADO */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Oportunidades
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              Gestiona todas tus oportunidades de negocio (OPO)
            </p>
          </div>

          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={loadData}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Actualizar
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Recargar datos</TooltipContent>
            </Tooltip>

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
                <TooltipContent side="top">
                  Crear nueva oportunidad
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* FILTROS */}
        {activeTab === "general" && (
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">Filtros</h3>
              {hasActiveFilters && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={clearFilters}
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs"
                    >
                      <X className="h-3 w-3" />
                      Limpiar filtros
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    Eliminar todos los filtros
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3">
              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">
                  Cliente
                </label>
                <FilterCombobox
                  value={filterCliente}
                  onChange={setFilterCliente}
                  items={clientes}
                  placeholder="Buscar cliente..."
                  emptyText="No hay clientes"
                  getLabel={(item) => item.nombre || `Cliente ${item.id}`}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">
                  Origen
                </label>
                <FilterCombobox
                  value={filterOrigen}
                  onChange={setFilterOrigen}
                  items={origenes}
                  placeholder="Buscar origen..."
                  emptyText="No hay orígenes"
                  getLabel={(item) => item.name || `Origen ${item.id}`}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">
                  Etapa
                </label>
                <FilterCombobox
                  value={filterEtapa}
                  onChange={setFilterEtapa}
                  items={etapas}
                  placeholder="Buscar etapa..."
                  emptyText="No hay etapas"
                  getLabel={(item) => item.nombre || `Etapa ${item.id}`}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">
                  Asignado a
                </label>
                <FilterCombobox
                  value={filterAsignado}
                  onChange={setFilterAsignado}
                  items={usuarios}
                  placeholder="Buscar usuario..."
                  emptyText="No hay usuarios"
                  getLabel={(item) =>
                    item.fullname || item.username || `Usuario ${item.id}`
                  }
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">
                  Creado por
                </label>
                <FilterCombobox
                  value={createdByFilter}
                  onChange={setCreatedByFilter}
                  items={usuarios}
                  placeholder="Buscar usuario..."
                  emptyText="No hay usuarios"
                  getLabel={(item) =>
                    item.fullname || item.username || `Usuario ${item.id}`
                  }
                />
              </div>

              <div>
                <label className="text-xs font-medium text-slate-600 block mb-2">
                  Fecha Agenda
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between h-9 text-sm"
                    >
                      {filterFecha === FILTER_ALL
                        ? "Todas"
                        : filterFecha === FILTER_TODAY
                          ? "Hoy"
                          : filterFecha === FILTER_THIS_WEEK
                            ? "Esta semana"
                            : "Este mes"}
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="start">
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          <CommandItem
                            value={FILTER_ALL}
                            onSelect={() => setFilterFecha(FILTER_ALL)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                filterFecha === FILTER_ALL
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            Todas
                          </CommandItem>
                          <CommandItem
                            value={FILTER_TODAY}
                            onSelect={() => setFilterFecha(FILTER_TODAY)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                filterFecha === FILTER_TODAY
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            Hoy
                          </CommandItem>
                          <CommandItem
                            value={FILTER_THIS_WEEK}
                            onSelect={() => setFilterFecha(FILTER_THIS_WEEK)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                filterFecha === FILTER_THIS_WEEK
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            Esta semana
                          </CommandItem>
                          <CommandItem
                            value={FILTER_THIS_MONTH}
                            onSelect={() => setFilterFecha(FILTER_THIS_MONTH)}
                            className="cursor-pointer"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                filterFecha === FILTER_THIS_MONTH
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                            Este mes
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {hasActiveFilters && (
              <div className="text-xs text-slate-600">
                Mostrando {baseFilteredRows.length} de {visibleRows.length}{" "}
                oportunidades
              </div>
            )}
          </div>
        )}

        {/* TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
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
                <TooltipContent side="top">
                  Vista general de todas las oportunidades
                </TooltipContent>
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
                <TooltipContent side="top">
                  Tablero por usuarios asignados
                </TooltipContent>
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
                <TooltipContent side="top">
                  Vista Kanban por etapas
                </TooltipContent>
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
              etapas={etapas}
              clientes={clientes}
              origenes={origenes}
              estadosTiempo={estadosTiempo}
            />
          </TabsContent>

          <TabsContent value="vista_usuarios">
            <Card className="overflow-hidden shadow-sm border-slate-200">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                <CardTitle className="text-xl">Tablero por Usuarios</CardTitle>
              </CardHeader>
              <CardContent className="overflow-hidden p-0">
                <VistaPorUsuarios
                  rows={visibleRows}
                  usuarios={usuarios}
                  onOpenOportunidad={handleOpenFromViews}
                  canViewAll={canViewAll}
                  currentUserId={user?.id || null}
                  estadosTiempo={estadosTiempo}
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
                  rows={visibleRows}
                  onOpenOportunidad={handleOpenFromViews}
                  canViewAll={canViewAll}
                  currentUserId={user?.id || null}
                  estadosTiempo={estadosTiempo}
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