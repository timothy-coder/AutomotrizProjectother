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

import { useAuth } from "@/context/AuthContext";

import { hasPermission } from "@/lib/permissions";
import OportunidadDialog from "@/app/components/oportunidades/OportunidadDialog";
import AssignmentDialog from "@/app/components/oportunidades/AssignmentDialog";
import OportunidadesTable from "@/app/components/oportunidades/OportunidadesTable";
import VistaPorUsuarios from "@/app/components/oportunidades/VistaporUsuarios";
import VistaPorEtapas from "@/app/components/oportunidades/VistaporEtapas";

const FILTER_ALL_CREATED = "__all_created__";
const FILTER_ALL = "__all__";
const FILTER_SIN_ASIGNAR = "__sin_asignar__";
const FILTER_TODAY = "hoy";
const FILTER_THIS_WEEK = "esta_semana";
const FILTER_THIS_MONTH = "este_mes";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

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
          className="w-full justify-between h-8 sm:h-9 text-xs sm:text-sm"
        >
          <span className="truncate">{selectedLabel}</span>
          <ChevronsUpDown className="ml-2 h-3 sm:h-4 w-3 sm:w-4 shrink-0 opacity-50 flex-shrink-0" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[200px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={placeholder}
            value={searchValue}
            onValueChange={setSearchValue}
            className="h-8 sm:h-9 text-xs sm:text-sm"
          />
          <CommandList>
            {filteredItems.length === 0 ? (
              <CommandEmpty className="text-xs">{emptyText}</CommandEmpty>
            ) : (
              <CommandGroup>
                <CommandItem
                  value="__all__"
                  onSelect={() => handleSelect(FILTER_ALL)}
                  className="cursor-pointer text-xs sm:text-sm"
                >
                  <Check
                    className={cn(
                      "mr-2 h-3 sm:h-4 w-3 sm:w-4",
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
                    className="cursor-pointer text-xs sm:text-sm"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3 sm:h-4 w-3 sm:w-4",
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
  const { user, permissions } = useAuth();

  // ==================== PERMISOS ====================
  // ✅ PERMITE ACCESO CON "view" O "viewall"
  const canView = hasPermission(permissions, "oportunidades", "view") || 
                  hasPermission(permissions, "oportunidades", "viewall");
  
  const canCreate = hasPermission(permissions, "oportunidades", "create");
  const canEdit = hasPermission(permissions, "oportunidades", "edit");
  
  // ✅ SOLO CON "viewall" PUEDE VER TODAS LAS OPORTUNIDADES
  // ✅ CON SOLO "view" SOLO VE LAS SUYAS
  const canViewAll = hasPermission(permissions, "oportunidades", "viewall");
  
  const canAssign = hasPermission(permissions, "oportunidades", "asignar");

  // ==================== ESTADOS ====================
  const [rows, setRows] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [origenes, setOrigenes] = useState([]);
  const [estadosTiempo, setEstadosTiempo] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filtros
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

  // ==================== LÓGICA DE PERMISOS ====================
  // ✅ CON "view": Solo ve sus oportunidades (asignadas a él)
  // ✅ CON "viewall": Ve TODAS las oportunidades
  const visibleRows = useMemo(() => {
    console.log("👁️ Calculando visibleRows:", {
      userId: user?.id,
      canViewAll,
      totalRows: rows.length,
    });

    if (!user?.id) return rows;
    if (canViewAll) return rows; // Ve TODO
    
    // Solo ve sus oportunidades
    const filtered = rows.filter(
      (row) => String(row?.asignado_a ?? "") === String(user.id)
    );
    
    console.log("🔽 Sin viewall - Solo oportunidades asignadas a ti:", filtered.length);
    return filtered;
  }, [rows, canViewAll, user]);

  // ==================== FILTROS ====================
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

      // ✅ FILTRO "ASIGNADO A" - SOLO VISIBLE SI TIENE "viewall"
      let matchesAsignado = true;
      if (canViewAll) {
        // Solo aplicar filtro si tiene viewall
        matchesAsignado = filterAsignado === FILTER_ALL;
        if (!matchesAsignado) {
          if (filterAsignado === FILTER_SIN_ASIGNAR) {
            matchesAsignado = !row.asignado_a;
          } else {
            matchesAsignado = String(row?.asignado_a ?? "") === filterAsignado;
          }
        }
      }

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
    canViewAll,
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
    if (canViewAll) {
      setFilterAsignado(FILTER_ALL);
    }
    setCreatedByFilter(FILTER_ALL_CREATED);
    setFilterFecha(FILTER_ALL);
  }

  const hasActiveFilters =
    filterCliente !== FILTER_ALL ||
    filterOrigen !== FILTER_ALL ||
    filterEtapa !== FILTER_ALL ||
    (canViewAll && filterAsignado !== FILTER_ALL) ||
    createdByFilter !== FILTER_ALL_CREATED ||
    filterFecha !== FILTER_ALL;

  // ==================== VALIDACIÓN ====================
  if (!canView) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm" style={{ color: BRAND_SECONDARY }}>
          No tienes permiso para acceder a esta página
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
        
        {/* ENCABEZADO */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold" style={{ color: BRAND_PRIMARY }}>
              Oportunidades
            </h1>
            <p className="text-xs sm:text-sm mt-1" style={{ color: BRAND_SECONDARY }}>
              Gestiona todas tus oportunidades de negocio (OPO)
              {!canViewAll && " • Solo tus asignaciones"}
              {canViewAll && " • Vista completa"}
            </p>
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={loadData}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs sm:text-sm h-8 sm:h-9 flex-1 sm:flex-none"
                >
                  <RefreshCw className="h-3 sm:h-4 w-3 sm:w-4" />
                  Actualizar
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Recargar datos
              </TooltipContent>
            </Tooltip>

            {canCreate && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => {
                      setSelectedOportunidad(null);
                      setDialogOpen(true);
                    }}
                    className="gap-2 text-white text-xs sm:text-sm h-8 sm:h-9 flex-1 sm:flex-none"
                    style={{ backgroundColor: BRAND_PRIMARY }}
                  >
                    <Plus className="h-3 sm:h-4 w-3 sm:w-4" />
                    <span>Agregar oportunidad</span>
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="text-xs">
                  Crear nueva oportunidad
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* FILTROS */}
        {activeTab === "general" && (
          <div className="bg-gradient-to-br border-2 rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}30` }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold" style={{ color: BRAND_PRIMARY }}>
                Filtros
              </h3>
              {hasActiveFilters && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={clearFilters}
                      variant="ghost"
                      size="sm"
                      className="gap-1 text-xs h-7 sm:h-8 px-2"
                    >
                      <X className="h-3 w-3" />
                      Limpiar
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="left" className="text-xs">
                    Eliminar todos los filtros
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-3">
              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: BRAND_SECONDARY }}>
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
                <label className="text-xs font-medium block mb-1" style={{ color: BRAND_SECONDARY }}>
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
                <label className="text-xs font-medium block mb-1" style={{ color: BRAND_SECONDARY }}>
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

              {/* ✅ SOLO MOSTRAR FILTRO "ASIGNADO A" SI TIENE viewall */}
              {canViewAll && (
                <div>
                  <label className="text-xs font-medium block mb-1" style={{ color: BRAND_SECONDARY }}>
                    Asignado a
                  </label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-between h-8 sm:h-9 text-xs sm:text-sm"
                      >
                        <span className="truncate">
                          {filterAsignado === FILTER_ALL
                            ? "Todos"
                            : filterAsignado === FILTER_SIN_ASIGNAR
                            ? "Sin asignar"
                            : usuarios.find(u => String(u.id) === filterAsignado)?.fullname || `Usuario ${filterAsignado}`}
                        </span>
                        <ChevronsUpDown className="ml-2 h-3 sm:h-4 w-3 sm:w-4 shrink-0 opacity-50 flex-shrink-0" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="start">
                      <Command>
                        <CommandList>
                          <CommandGroup>
                            <CommandItem
                              value={FILTER_ALL}
                              onSelect={() => setFilterAsignado(FILTER_ALL)}
                              className="cursor-pointer text-xs sm:text-sm"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-3 sm:h-4 w-3 sm:w-4",
                                  filterAsignado === FILTER_ALL
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              Todos
                            </CommandItem>

                            <CommandItem
                              value={FILTER_SIN_ASIGNAR}
                              onSelect={() => setFilterAsignado(FILTER_SIN_ASIGNAR)}
                              className="cursor-pointer text-xs sm:text-sm"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-3 sm:h-4 w-3 sm:w-4",
                                  filterAsignado === FILTER_SIN_ASIGNAR
                                    ? "opacity-100"
                                    : "opacity-0"
                                )}
                              />
                              Sin asignar
                            </CommandItem>

                            {usuarios.map((usuario) => (
                              <CommandItem
                                key={usuario.id}
                                value={String(usuario.id)}
                                onSelect={() => setFilterAsignado(String(usuario.id))}
                                className="cursor-pointer text-xs sm:text-sm"
                              >
                                <Check
                                  className={cn(
                                    "mr-2 h-3 sm:h-4 w-3 sm:w-4",
                                    filterAsignado === String(usuario.id)
                                      ? "opacity-100"
                                      : "opacity-0"
                                  )}
                                />
                                {usuario.fullname || usuario.username}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div>
                <label className="text-xs font-medium block mb-1" style={{ color: BRAND_SECONDARY }}>
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
                <label className="text-xs font-medium block mb-1" style={{ color: BRAND_SECONDARY }}>
                  Fecha Agenda
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full justify-between h-8 sm:h-9 text-xs sm:text-sm"
                    >
                      <span className="truncate">
                        {filterFecha === FILTER_ALL
                          ? "Todas"
                          : filterFecha === FILTER_TODAY
                            ? "Hoy"
                            : filterFecha === FILTER_THIS_WEEK
                              ? "Esta semana"
                              : "Este mes"}
                      </span>
                      <ChevronsUpDown className="ml-2 h-3 sm:h-4 w-3 sm:w-4 shrink-0 opacity-50 flex-shrink-0" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[200px] p-0" align="start">
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          <CommandItem
                            value={FILTER_ALL}
                            onSelect={() => setFilterFecha(FILTER_ALL)}
                            className="cursor-pointer text-xs sm:text-sm"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-3 sm:h-4 w-3 sm:w-4",
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
                            className="cursor-pointer text-xs sm:text-sm"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-3 sm:h-4 w-3 sm:w-4",
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
                            className="cursor-pointer text-xs sm:text-sm"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-3 sm:h-4 w-3 sm:w-4",
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
                            className="cursor-pointer text-xs sm:text-sm"
                          >
                            <Check
                              className={cn(
                                "mr-2 h-3 sm:h-4 w-3 sm:w-4",
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
              <div className="text-xs" style={{ color: BRAND_SECONDARY }}>
                Mostrando <span className="font-semibold">{baseFilteredRows.length}</span> de{" "}
                <span className="font-semibold">{visibleRows.length}</span> oportunidades
              </div>
            )}
          </div>
        )}

        {/* TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="flex flex-wrap gap-3 sm:gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveTab("general")}
                  className={`
                    rounded-lg px-1 sm:px-3 text-xs sm:text-sm font-medium 
                    transition-all duration-200 cursor-pointer
                    ${activeTab === "general"
                      ? "text-white shadow-lg scale-105"
                      : "text-white hover:opacity-90"
                    }
                  `}
                  style={{
                    backgroundColor: activeTab === "general" ? BRAND_PRIMARY : BRAND_SECONDARY,
                  }}
                >
                General
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Vista general de todas las oportunidades
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveTab("vista_usuarios")}
                  className={`
                    rounded-lg px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium 
                    transition-all duration-200 cursor-pointer
                    ${activeTab === "vista_usuarios"
                      ? "text-white shadow-lg scale-105"
                      : "text-white hover:opacity-90"
                    }
                  `}
                  style={{
                    backgroundColor: activeTab === "vista_usuarios" ? BRAND_PRIMARY : BRAND_SECONDARY,
                  }}
                >
                  Tablero
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Tablero por usuarios asignados
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveTab("vista_etapas")}
                  className={`
                    rounded-lg px-3 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-medium 
                    transition-all duration-200 cursor-pointer
                    ${activeTab === "vista_etapas"
                      ? "text-white shadow-lg scale-105"
                      : "text-white hover:opacity-90"
                    }
                  `}
                  style={{
                    backgroundColor: activeTab === "vista_etapas" ? BRAND_PRIMARY : BRAND_SECONDARY,
                  }}
                >
                  Kanban
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Vista Kanban por etapas
              </TooltipContent>
            </Tooltip>
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
            <Card className="overflow-hidden shadow-sm border-2" style={{ borderColor: `${BRAND_PRIMARY}30` }}>
              <CardHeader className="border-b" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}20` }}>
                <CardTitle className="text-lg sm:text-xl" style={{ color: BRAND_PRIMARY }}>
                  Tablero por Usuarios
                </CardTitle>
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
            <Card className="overflow-hidden shadow-sm border-2" style={{ borderColor: `${BRAND_PRIMARY}30` }}>
              <CardHeader className="border-b" style={{ backgroundColor: `${BRAND_PRIMARY}08`, borderColor: `${BRAND_PRIMARY}20` }}>
                <CardTitle className="text-lg sm:text-xl" style={{ color: BRAND_PRIMARY }}>
                  Kanban de Etapas
                </CardTitle>
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