"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Calendar,
  TrendingUp,
  Zap,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit2,
  Clock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";

const FILTER_ALL = "all";
const FILTER_TODAY = "hoy";
const FILTER_THIS_WEEK = "esta_semana";
const FILTER_THIS_MONTH = "este_mes";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

const ITEMS_PER_PAGE = 15;

export default function DashboardPage() {
  const router = useRouter();
  const { user, permissions } = useAuth();

  const canViewOportunidades =
    hasPermission(permissions, "oportunidades", "view") ||
    hasPermission(permissions, "oportunidades", "viewall");
  const canViewLeads =
    hasPermission(permissions, "leads", "view") ||
    hasPermission(permissions, "leads", "viewall");

  const canViewAllOportunidades = hasPermission(
    permissions,
    "oportunidades",
    "viewall"
  );
  const canViewAllLeads = hasPermission(permissions, "leads", "viewall");
  const canEdit = hasPermission(permissions, "oportunidades", "edit");

  const [stats, setStats] = useState({
    totalOportunidades: 0,
    totalLeads: 0,
    oposPorEtapa: {},
    leadsPorEtapa: {},
  });

  const [loading, setLoading] = useState(false);
  const [filterAgendaPeriodo, setFilterAgendaPeriodo] = useState(FILTER_TODAY);
  const [filterOposPeriodo, setFilterOposPeriodo] = useState(FILTER_ALL);
  const [filterLeadsPeriodo, setFilterLeadsPeriodo] = useState(FILTER_ALL);

  const [rawData, setRawData] = useState({
    oportunidades: [],
    leads: [],
    usuarios: [],
    etapas: [],
    detallesOpo: {},
    detallesLeads: {},
  });

  const [expandedTables, setExpandedTables] = useState({
    oportunidades: true,
    leads: true,
  });

  // Paginación
  const [pagOportunidades, setPagOportunidades] = useState(0);
  const [pagLeads, setPagLeads] = useState(0);
  const [pagAgenda, setPagAgenda] = useState(0);

  function getFechaFiltros() {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const inicioSemana = new Date(hoy);
    inicioSemana.setDate(hoy.getDate() - hoy.getDay());
    const finSemana = new Date(inicioSemana);
    finSemana.setDate(inicioSemana.getDate() + 6);
    finSemana.setHours(23, 59, 59, 999);

    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    const finMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    finMes.setHours(23, 59, 59, 999);

    return {
      hoy,
      finHoy: new Date(hoy.getTime() + 24 * 60 * 60 * 1000),
      inicioSemana,
      finSemana,
      inicioMes,
      finMes,
    };
  }

  function filterByAgendaPeriodo(items, detalles) {
    const fechas = getFechaFiltros();

    return items.filter((item) => {
      const detalle = detalles[item.id];
      if (!detalle || !detalle.fecha_agenda) return false;

      const agendaDate = new Date(detalle.fecha_agenda);

      switch (filterAgendaPeriodo) {
        case FILTER_TODAY:
          return agendaDate >= fechas.hoy && agendaDate < fechas.finHoy;
        case FILTER_THIS_WEEK:
          return (
            agendaDate >= fechas.inicioSemana && agendaDate <= fechas.finSemana
          );
        case FILTER_THIS_MONTH:
          return (
            agendaDate >= fechas.inicioMes && agendaDate <= fechas.finMes
          );
        default:
          return true;
      }
    });
  }

  function filterByCreatedPeriodo(items, periodo) {
    const fechas = getFechaFiltros();

    return items.filter((item) => {
      if (!item.created_at) return false;

      const itemDate = new Date(item.created_at);

      switch (periodo) {
        case FILTER_TODAY:
          return itemDate >= fechas.hoy && itemDate < fechas.finHoy;
        case FILTER_THIS_WEEK:
          return (
            itemDate >= fechas.inicioSemana && itemDate <= fechas.finSemana
          );
        case FILTER_THIS_MONTH:
          return (
            itemDate >= fechas.inicioMes && itemDate <= fechas.finMes
          );
        default:
          return true;
      }
    });
  }

  async function enriquecerConDetalles(items, apiEndpoint, type) {
    const detalles = {};

    await Promise.allSettled(
      items.map(async (item) => {
        try {
          const res = await fetch(`${apiEndpoint}/${item.id}/detalles?limit=1`, {
            cache: "no-store",
          });

          if (!res.ok) {
            console.warn(`No detalles para ${type} ${item.id}`);
            return;
          }

          const data = await res.json();
          const ultimoDetalle = Array.isArray(data)
            ? data[0]
            : Array.isArray(data?.data)
            ? data.data[0]
            : null;

          if (ultimoDetalle) {
            detalles[item.id] = ultimoDetalle;
          }
        } catch (error) {
          console.warn(`Error enriqueciendo ${type} ${item.id}:`, error);
        }
      })
    );

    return detalles;
  }

  async function loadData() {
    try {
      setLoading(true);

      const [opRes, leadsRes, usersRes, etapasRes] = await Promise.all([
        fetch("/api/oportunidades-oportunidades?limit=1000", {
          cache: "no-store",
        }),
        fetch("/api/leads?limit=1000", { cache: "no-store" }),
        fetch("/api/usuarios", { cache: "no-store" }),
        fetch("/api/etapasconversion", { cache: "no-store" }),
      ]);

      const opData = await opRes.json();
      const leadsData = await leadsRes.json();
      const usersData = await usersRes.json();
      const etapasData = await etapasRes.json();

      let oportunidades = Array.isArray(opData)
        ? opData
        : opData?.data || [];
      let leads = leadsData?.data || [];
      const usuarios = Array.isArray(usersData) ? usersData : [];
      const etapas = Array.isArray(etapasData) ? etapasData : [];

      oportunidades = oportunidades.filter(
        (opp) => opp.oportunidad_id?.substring(0, 3) === "OPO"
      );

      console.log("📊 Cargando detalles para", oportunidades.length, "oportunidades");
      console.log("📊 Cargando detalles para", leads.length, "leads");

      const detallesOpo = await enriquecerConDetalles(
        oportunidades,
        "/api/oportunidades-oportunidades",
        "oportunidad"
      );
      const detallesLeads = await enriquecerConDetalles(
        leads,
        "/api/leads",
        "lead"
      );

      console.log("✅ Detalles OPO cargados:", Object.keys(detallesOpo).length);
      console.log("✅ Detalles Leads cargados:", Object.keys(detallesLeads).length);

      setRawData({
        oportunidades,
        leads,
        usuarios,
        etapas,
        detallesOpo,
        detallesLeads,
      });

      // Calcular OPO visibles
      const opoVisibles = canViewAllOportunidades
        ? oportunidades
        : oportunidades.filter(
            (opp) =>
              String(opp.asignado_a) === String(user?.id) ||
              String(opp.created_by) === String(user?.id)
          );

      // Calcular Leads visibles
      const leadsVisibles = canViewAllLeads
        ? leads
        : leads.filter(
            (lead) =>
              String(lead.asignado_a) === String(user?.id) ||
              String(lead.created_by) === String(user?.id)
          );

      // Calcular por etapas (suma OPO + Leads)
      const oposPorEtapa = {};
      const leadsPorEtapa = {};

      etapas.forEach((etapa) => {
        const opoCount = opoVisibles.filter(
          (opp) => opp.etapasconversion_id === etapa.id
        ).length;
        const leadCount = leadsVisibles.filter(
          (lead) => lead.etapasconversion_id === etapa.id
        ).length;
        
        oposPorEtapa[etapa.id] = opoCount;
        leadsPorEtapa[etapa.id] = leadCount;
      });

      setStats({
        totalOportunidades: opoVisibles.length,
        totalLeads: leadsVisibles.length,
        oposPorEtapa,
        leadsPorEtapa,
      });

      toast.success("Dashboard actualizado");
    } catch (error) {
      console.error("❌ Error cargando dashboard:", error);
      toast.error("Error cargando datos del dashboard");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (canViewOportunidades || canViewLeads) {
      loadData();
    }
  }, [canViewOportunidades, canViewLeads]);

  // ==================== TABLA AGENDA HOY ====================
  const agendaHoy = useMemo(() => {
    let opoConAgenda = rawData.oportunidades.filter(
      (opp) =>
        rawData.detallesOpo[opp.id] && rawData.detallesOpo[opp.id].fecha_agenda
    );
    let leadsConAgenda = rawData.leads.filter(
      (lead) =>
        rawData.detallesLeads[lead.id] &&
        rawData.detallesLeads[lead.id].fecha_agenda
    );

    opoConAgenda = filterByAgendaPeriodo(opoConAgenda, rawData.detallesOpo);
    leadsConAgenda = filterByAgendaPeriodo(leadsConAgenda, rawData.detallesLeads);

    const opoVisibles = canViewAllOportunidades
      ? opoConAgenda
      : opoConAgenda.filter(
          (opp) =>
            String(opp.asignado_a) === String(user?.id) ||
            String(opp.created_by) === String(user?.id)
        );

    const leadsVisibles = canViewAllLeads
      ? leadsConAgenda
      : leadsConAgenda.filter(
          (lead) =>
            String(lead.asignado_a) === String(user?.id) ||
            String(lead.created_by) === String(user?.id)
        );

    const combinados = [
      ...opoVisibles.map((opp) => ({
        ...opp,
        tipo: "OPO",
        detalle: rawData.detallesOpo[opp.id],
      })),
      ...leadsVisibles.map((lead) => ({
        ...lead,
        tipo: "LD",
        detalle: rawData.detallesLeads[lead.id],
      })),
    ].sort((a, b) => {
      const fechaA = new Date(a.detalle.fecha_agenda);
      const fechaB = new Date(b.detalle.fecha_agenda);
      return fechaA - fechaB;
    });

    return combinados;
  }, [
    rawData,
    filterAgendaPeriodo,
    canViewAllOportunidades,
    canViewAllLeads,
    user,
  ]);

  // ==================== TABLA OPORTUNIDADES ====================
  const oportunidadesOrdenadas = useMemo(() => {
    let opoVisibles = canViewAllOportunidades
      ? rawData.oportunidades
      : rawData.oportunidades.filter(
          (opp) =>
            String(opp.asignado_a) === String(user?.id) ||
            String(opp.created_by) === String(user?.id)
        );

    // Aplicar filtro de período
    opoVisibles = filterByCreatedPeriodo(opoVisibles, filterOposPeriodo);

    return opoVisibles.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }, [rawData.oportunidades, canViewAllOportunidades, user, filterOposPeriodo]);

  // ==================== TABLA LEADS ====================
  const leadsOrdenados = useMemo(() => {
    let leadsVisibles = canViewAllLeads
      ? rawData.leads
      : rawData.leads.filter(
          (lead) =>
            String(lead.asignado_a) === String(user?.id) ||
            String(lead.created_by) === String(user?.id)
        );

    // Aplicar filtro de período
    leadsVisibles = filterByCreatedPeriodo(leadsVisibles, filterLeadsPeriodo);

    return leadsVisibles.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  }, [rawData.leads, canViewAllLeads, user, filterLeadsPeriodo]);

  // Paginación de Agenda
  const agendaPaginada = useMemo(() => {
    const inicio = pagAgenda * ITEMS_PER_PAGE;
    return agendaHoy.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [agendaHoy, pagAgenda]);

  const totalPagAgenda = Math.ceil(agendaHoy.length / ITEMS_PER_PAGE);

  // Paginación de Oportunidades
  const opoPaginada = useMemo(() => {
    const inicio = pagOportunidades * ITEMS_PER_PAGE;
    return oportunidadesOrdenadas.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [oportunidadesOrdenadas, pagOportunidades]);

  const totalPagOpo = Math.ceil(
    oportunidadesOrdenadas.length / ITEMS_PER_PAGE
  );

  // Paginación de Leads
  const leadsPaginada = useMemo(() => {
    const inicio = pagLeads * ITEMS_PER_PAGE;
    return leadsOrdenados.slice(inicio, inicio + ITEMS_PER_PAGE);
  }, [leadsOrdenados, pagLeads]);

  const totalPagLeads = Math.ceil(leadsOrdenados.length / ITEMS_PER_PAGE);

  if (!canViewOportunidades && !canViewLeads) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm" style={{ color: BRAND_SECONDARY }}>
          No tienes permiso para acceder al dashboard
        </p>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-3 sm:p-6 space-y-4 max-w-7xl mx-auto">
        {/* ENCABEZADO */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h1
              className="text-2xl sm:text-3xl font-bold"
              style={{ color: BRAND_PRIMARY }}
            >
              Panel de Ventas
            </h1>
            <p
              className="text-xs sm:text-sm mt-1"
              style={{ color: BRAND_SECONDARY }}
            >
              {!canViewAllOportunidades &&
                !canViewAllLeads &&
                "Solo tus asignaciones"}
              {(canViewAllOportunidades || canViewAllLeads) && "Vista completa"}
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
                  className="gap-2 text-xs sm:text-sm h-8 sm:h-9"
                >
                  <RefreshCw
                    className={`h-3 sm:h-4 w-3 sm:w-4 ${
                      loading ? "animate-spin" : ""
                    }`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Recargar
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* TARJETAS DE ESTADÍSTICAS - TOTALES */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
          {/* TOTAL OPORTUNIDADES */}
          {canViewOportunidades && (
            <Card
              className="overflow-hidden hover:shadow-lg transition-shadow"
              style={{
                borderLeftWidth: "3px",
                borderLeftColor: "#5d16ec",
              }}
            >
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-600 truncate">
                      OPO Totales
                    </p>
                    <p
                      className="text-xl sm:text-2xl font-bold"
                      style={{ color: "#5d16ec" }}
                    >
                      {stats.totalOportunidades}
                    </p>
                  </div>
                  <TrendingUp
                    size={20}
                    className="flex-shrink-0 opacity-20"
                    style={{ color: "#5d16ec" }}
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* TOTAL LEADS */}
          {canViewLeads && (
            <Card
              className="overflow-hidden hover:shadow-lg transition-shadow"
              style={{
                borderLeftWidth: "3px",
                borderLeftColor: "#ff6b6b",
              }}
            >
              <CardContent className="p-2 sm:p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-600 truncate">
                      Leads Totales
                    </p>
                    <p
                      className="text-xl sm:text-2xl font-bold"
                      style={{ color: "#ff6b6b" }}
                    >
                      {stats.totalLeads}
                    </p>
                  </div>
                  <Zap
                    size={20}
                    className="flex-shrink-0 opacity-20"
                    style={{ color: "#ff6b6b" }}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* TARJETAS DE ESTADÍSTICAS - POR ETAPA (SUMA OPO + LEADS) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {rawData.etapas.map((etapa) => {
            const totalEtapa =
              (stats.oposPorEtapa[etapa.id] || 0) +
              (stats.leadsPorEtapa[etapa.id] || 0);

            return (
              <Card
                key={etapa.id}
                className="overflow-hidden hover:shadow-lg transition-shadow"
                style={{
                  borderLeftWidth: "3px",
                  borderLeftColor: "#4ecdc4",
                }}
              >
                <CardContent className="p-2 sm:p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-600 truncate">
                        {etapa.nombre}
                      </p>
                      <p
                        className="text-xl sm:text-2xl font-bold"
                        style={{ color: "#4ecdc4" }}
                      >
                        {totalEtapa}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        OPO: {stats.oposPorEtapa[etapa.id] || 0} | LD:{" "}
                        {stats.leadsPorEtapa[etapa.id] || 0}
                      </p>
                    </div>
                    <TrendingUp
                      size={16}
                      className="flex-shrink-0 opacity-20"
                      style={{ color: "#4ecdc4" }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* TABLA AGENDA - NO DESPLEGABLE */}
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock size={16} style={{ color: BRAND_PRIMARY }} />
                <CardTitle className="text-sm" style={{ color: BRAND_PRIMARY }}>
                  Tareas del dia - {agendaHoy.length} registros
                </CardTitle>
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1 text-xs h-7"
                  >
                    <Calendar className="h-3 w-3" />
                    {filterAgendaPeriodo === FILTER_TODAY
                      ? "Hoy"
                      : filterAgendaPeriodo === FILTER_THIS_WEEK
                      ? "Semana"
                      : "Mes"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="end">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        {[
                          { value: FILTER_TODAY, label: "Hoy" },
                          {
                            value: FILTER_THIS_WEEK,
                            label: "Esta semana",
                          },
                          { value: FILTER_THIS_MONTH, label: "Este mes" },
                        ].map((item) => (
                          <CommandItem
                            key={item.value}
                            value={item.value}
                            onSelect={() => {
                              setFilterAgendaPeriodo(item.value);
                              setPagAgenda(0);
                            }}
                            className="cursor-pointer text-xs sm:text-sm"
                          >
                            {filterAgendaPeriodo === item.value && "✓ "}
                            {item.label}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {agendaHoy.length === 0 ? (
              <div className="p-4 text-center text-xs text-gray-500">
                No hay items en agenda para este período
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs px-3 py-2">Tipo</TableHead>
                      <TableHead className="text-xs px-3 py-2">Código</TableHead>
                      <TableHead className="text-xs px-3 py-2">Cliente</TableHead>
                      <TableHead className="text-xs px-3 py-2">Asignado</TableHead>
                      <TableHead className="text-xs px-3 py-2">Fecha</TableHead>
                      <TableHead className="text-xs px-3 py-2">Hora</TableHead>
                      <TableHead className="text-xs text-right px-3 py-2">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {agendaPaginada.map((item) => {
                      const usuario = rawData.usuarios.find(
                        (u) => u.id === item.asignado_a
                      );
                      const cliente = rawData.usuarios.find(
                        (c) => c.id === item.cliente_id
                      );
                      const fecha = new Date(
                        item.detalle.fecha_agenda
                      ).toLocaleDateString();
                      const hora = item.detalle.hora_agenda?.substring(0, 5);

                      return (
                        <TableRow
                          key={`${item.tipo}-${item.id}`}
                          className="hover:bg-gray-50"
                        >
                          <TableCell className="text-xs px-3 py-2 font-bold">
                            <span
                              style={{
                                backgroundColor:
                                  item.tipo === "OPO" ? "#5d16ec" : "#ff6b6b",
                                color: "white",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                fontSize: "10px",
                              }}
                            >
                              {item.tipo}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs px-3 py-2 font-medium">
                            {item.oportunidad_id ||
                              `${item.tipo}-${item.id}`}
                          </TableCell>
                          <TableCell className="text-xs px-3 py-2 max-w-xs truncate">
                            {cliente?.fullname || "-"}
                          </TableCell>
                          <TableCell className="text-xs px-3 py-2">
                            {usuario?.fullname || "Sin asignar"}
                          </TableCell>
                          <TableCell className="text-xs px-3 py-2">
                            {fecha}
                          </TableCell>
                          <TableCell className="text-xs px-3 py-2 font-semibold">
                            {hora}
                          </TableCell>
                          <TableCell className="px-3 py-2 text-right">
                            <div className="flex justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={() =>
                                      router.push(
                                        `/oportunidades/${item.id}`
                                      )
                                    }
                                  >
                                    <Eye size={12} />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="text-xs">
                                  Ver
                                </TooltipContent>
                              </Tooltip>
                              {canEdit && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={() =>
                                        router.push(
                                          `/oportunidades/${item.id}`
                                        )
                                      }
                                    >
                                      <Edit2 size={12} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="text-xs">
                                    Editar
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                {totalPagAgenda > 1 && (
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t text-xs">
                    <span className="text-gray-600">
                      Página {pagAgenda + 1} de {totalPagAgenda}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2"
                        disabled={pagAgenda === 0}
                        onClick={() => setPagAgenda(pagAgenda - 1)}
                      >
                        <ChevronLeft size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2"
                        disabled={pagAgenda === totalPagAgenda - 1}
                        onClick={() => setPagAgenda(pagAgenda + 1)}
                      >
                        <ChevronRight size={14} />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* TABLA OPORTUNIDADES */}
        {oportunidadesOrdenadas.length > 0 && (
          <Card>
            <CardHeader
              className="pb-2 cursor-pointer hover:bg-gray-50"
              onClick={() =>
                setExpandedTables({
                  ...expandedTables,
                  oportunidades: !expandedTables.oportunidades,
                })
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm" style={{ color: BRAND_PRIMARY }}>
                    Oportunidades - {oportunidadesOrdenadas.length} registros
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs h-7"
                      >
                        <Calendar className="h-3 w-3" />
                        {filterOposPeriodo === FILTER_ALL
                          ? "Todos"
                          : filterOposPeriodo === FILTER_TODAY
                          ? "Hoy"
                          : filterOposPeriodo === FILTER_THIS_WEEK
                          ? "Semana"
                          : "Mes"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="end">
                      <Command>
                        <CommandList>
                          <CommandGroup>
                            {[
                              { value: FILTER_ALL, label: "Todos" },
                              { value: FILTER_TODAY, label: "Hoy" },
                              {
                                value: FILTER_THIS_WEEK,
                                label: "Esta semana",
                              },
                              { value: FILTER_THIS_MONTH, label: "Este mes" },
                            ].map((item) => (
                              <CommandItem
                                key={item.value}
                                value={item.value}
                                onSelect={() => {
                                  setFilterOposPeriodo(item.value);
                                  setPagOportunidades(0);
                                }}
                                className="cursor-pointer text-xs sm:text-sm"
                              >
                                {filterOposPeriodo === item.value && "✓ "}
                                {item.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {expandedTables.oportunidades ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </div>
              </div>
            </CardHeader>
            {expandedTables.oportunidades && (
              <>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs px-3 py-2">
                          Código
                        </TableHead>
                        <TableHead className="text-xs px-3 py-2">
                          Cliente
                        </TableHead>
                        <TableHead className="text-xs px-3 py-2">
                          Asignado
                        </TableHead>
                        <TableHead className="text-xs px-3 py-2">
                          Etapa
                        </TableHead>
                        <TableHead className="text-xs px-3 py-2">
                          Creado
                        </TableHead>
                        <TableHead className="text-xs text-right px-3 py-2">
                          Acciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {opoPaginada.map((item) => {
                        const usuario = rawData.usuarios.find(
                          (u) => u.id === item.asignado_a
                        );
                        const cliente = rawData.usuarios.find(
                          (c) => c.id === item.cliente_id
                        );
                        const etapa = rawData.etapas.find(
                          (e) => e.id === item.etapasconversion_id
                        );
                        const fecha = new Date(
                          item.created_at
                        ).toLocaleDateString();

                        return (
                          <TableRow key={item.id} className="hover:bg-gray-50">
                            <TableCell className="text-xs px-3 py-2 font-medium">
                              {item.oportunidad_id || `OPO-${item.id}`}
                            </TableCell>
                            <TableCell className="text-xs px-3 py-2 max-w-xs truncate">
                              {cliente?.fullname || "-"}
                            </TableCell>
                            <TableCell className="text-xs px-3 py-2">
                              {usuario?.fullname || "Sin asignar"}
                            </TableCell>
                            <TableCell className="text-xs px-3 py-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {etapa?.nombre || "Sin etapa"}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs px-3 py-2">
                              {fecha}
                            </TableCell>
                            <TableCell className="px-3 py-2 text-right">
                              <div className="flex justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={() =>
                                        router.push(
                                          `/oportunidades/${item.id}`
                                        )
                                      }
                                    >
                                      <Eye size={12} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="text-xs">
                                    Ver
                                  </TooltipContent>
                                </Tooltip>
                                {canEdit && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0"
                                        onClick={() =>
                                          router.push(
                                            `/oportunidades/${item.id}`
                                          )
                                        }
                                      >
                                        <Edit2 size={12} />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="text-xs">
                                      Editar
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
                {totalPagOpo > 1 && (
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t text-xs">
                    <span className="text-gray-600">
                      Página {pagOportunidades + 1} de {totalPagOpo}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2"
                        disabled={pagOportunidades === 0}
                        onClick={() =>
                          setPagOportunidades(pagOportunidades - 1)
                        }
                      >
                        <ChevronLeft size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2"
                        disabled={pagOportunidades === totalPagOpo - 1}
                        onClick={() =>
                          setPagOportunidades(pagOportunidades + 1)
                        }
                      >
                        <ChevronRight size={14} />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        {/* TABLA LEADS */}
        {leadsOrdenados.length > 0 && (
          <Card>
            <CardHeader
              className="pb-2 cursor-pointer hover:bg-gray-50"
              onClick={() =>
                setExpandedTables({
                  ...expandedTables,
                  leads: !expandedTables.leads,
                })
              }
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm" style={{ color: BRAND_PRIMARY }}>
                    Leads - {leadsOrdenados.length} registros
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Popover>
                    <PopoverTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs h-7"
                      >
                        <Calendar className="h-3 w-3" />
                        {filterLeadsPeriodo === FILTER_ALL
                          ? "Todos"
                          : filterLeadsPeriodo === FILTER_TODAY
                          ? "Hoy"
                          : filterLeadsPeriodo === FILTER_THIS_WEEK
                          ? "Semana"
                          : "Mes"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[200px] p-0" align="end">
                      <Command>
                        <CommandList>
                          <CommandGroup>
                            {[
                              { value: FILTER_ALL, label: "Todos" },
                              { value: FILTER_TODAY, label: "Hoy" },
                              {
                                value: FILTER_THIS_WEEK,
                                label: "Esta semana",
                              },
                              { value: FILTER_THIS_MONTH, label: "Este mes" },
                            ].map((item) => (
                              <CommandItem
                                key={item.value}
                                value={item.value}
                                onSelect={() => {
                                  setFilterLeadsPeriodo(item.value);
                                  setPagLeads(0);
                                }}
                                className="cursor-pointer text-xs sm:text-sm"
                              >
                                {filterLeadsPeriodo === item.value && "✓ "}
                                {item.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>

                  {expandedTables.leads ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </div>
              </div>
            </CardHeader>
            {expandedTables.leads && (
              <>
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs px-3 py-2">
                          Código
                        </TableHead>
                        <TableHead className="text-xs px-3 py-2">
                          Cliente
                        </TableHead>
                        <TableHead className="text-xs px-3 py-2">
                          Asignado
                        </TableHead>
                        <TableHead className="text-xs px-3 py-2">
                          Etapa
                        </TableHead>
                        <TableHead className="text-xs px-3 py-2">
                          Creado
                        </TableHead>
                        <TableHead className="text-xs text-right px-3 py-2">
                          Acciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leadsPaginada.map((item) => {
                        const usuario = rawData.usuarios.find(
                          (u) => u.id === item.asignado_a
                        );
                        const cliente = rawData.usuarios.find(
                          (c) => c.id === item.cliente_id
                        );
                        const etapa = rawData.etapas.find(
                          (e) => e.id === item.etapasconversion_id
                        );
                        const fecha = new Date(
                          item.created_at
                        ).toLocaleDateString();

                        return (
                          <TableRow key={item.id} className="hover:bg-gray-50">
                            <TableCell className="text-xs px-3 py-2 font-medium">
                              {item.oportunidad_id || `LD-${item.id}`}
                            </TableCell>
                            <TableCell className="text-xs px-3 py-2 max-w-xs truncate">
                              {cliente?.fullname || "-"}
                            </TableCell>
                            <TableCell className="text-xs px-3 py-2">
                              {usuario?.fullname || "Sin asignar"}
                            </TableCell>
                            <TableCell className="text-xs px-3 py-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                                {etapa?.nombre || "Sin etapa"}
                              </span>
                            </TableCell>
                            <TableCell className="text-xs px-3 py-2">
                              {fecha}
                            </TableCell>
                            <TableCell className="px-3 py-2 text-right">
                              <div className="flex justify-end gap-1">
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 w-6 p-0"
                                      onClick={() =>
                                        router.push(
                                          `/oportunidades/${item.id}`
                                        )
                                      }
                                    >
                                      <Eye size={12} />
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent side="left" className="text-xs">
                                    Ver
                                  </TooltipContent>
                                </Tooltip>
                                {canEdit && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-6 w-6 p-0"
                                        onClick={() =>
                                          router.push(
                                            `/oportunidades/${item.id}`
                                          )
                                        }
                                      >
                                        <Edit2 size={12} />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent side="left" className="text-xs">
                                      Editar
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
                {totalPagLeads > 1 && (
                  <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t text-xs">
                    <span className="text-gray-600">
                      Página {pagLeads + 1} de {totalPagLeads}
                    </span>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2"
                        disabled={pagLeads === 0}
                        onClick={() => setPagLeads(pagLeads - 1)}
                      >
                        <ChevronLeft size={14} />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-6 px-2"
                        disabled={pagLeads === totalPagLeads - 1}
                        onClick={() => setPagLeads(pagLeads + 1)}
                      >
                        <ChevronRight size={14} />
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        )}

        {/* INFO */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-3">
            <div className="flex gap-2">
              <div className="text-2xl">ℹ️</div>
              <div className="text-xs space-y-1">
                <p className="font-semibold text-blue-900">Dashboard Info</p>
                <ul className="text-blue-700 space-y-0.5">
                  <li>
                    • <strong>Tarjetas Totales:</strong> OPO y Leads por
                    separado
                  </li>
                  <li>
                    • <strong>Tarjetas Por Etapa:</strong> Suma de OPO + Leads
                    con desglose
                  </li>
                  <li>
                    • <strong>Tabla Agenda:</strong> Filtra por fecha_agenda
                    (Hoy, Semana, Mes)
                  </li>
                  <li>
                    • <strong>Tablas OPO y Leads:</strong> Filtros independientes
                    (Todos, Hoy, Semana, Mes)
                  </li>
                  <li>• 15 registros por página con paginación</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}