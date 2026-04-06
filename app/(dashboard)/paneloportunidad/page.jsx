"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  RefreshCw,
  Calendar,
  TrendingUp,
  Users,
  Zap,
  CheckCircle,
  Clock,
  AlertCircle,
  Download,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit2,
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
import { cn } from "@/lib/utils";

import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";

const FILTER_ALL = "all";
const FILTER_TODAY = "hoy";
const FILTER_THIS_WEEK = "esta_semana";
const FILTER_THIS_MONTH = "este_mes";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

const COLORS = [
  "#5d16ec",
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#ffa502",
  "#26de81",
];

function getTemperaturaColor(temperatura) {
  if (temperatura >= 75) {
    return { bg: "bg-red-100", text: "text-red-700", border: "border-red-300" };
  } else if (temperatura >= 50) {
    return {
      bg: "bg-orange-100",
      text: "text-orange-700",
      border: "border-orange-300",
    };
  } else if (temperatura >= 25) {
    return {
      bg: "bg-yellow-100",
      text: "text-yellow-700",
      border: "border-yellow-300",
    };
  } else {
    return { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300" };
  }
}

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
    oportunidadesAsignadas: 0,
    leadsAsignados: 0,
    oportunidadesNuevas: 0,
    leadsNuevos: 0,
    oportunidadesEnProgreso: 0,
    leadsEnProgreso: 0,
    oportunidadesCerradas: 0,
    leadsCerrados: 0,
    tempPromedio: 0,
  });

  const [loading, setLoading] = useState(false);
  const [filterPeriodo, setFilterPeriodo] = useState(FILTER_ALL);
  const [rawData, setRawData] = useState({
    oportunidades: [],
    leads: [],
    usuarios: [],
    etapas: [],
  });

  const [expandedTables, setExpandedTables] = useState({
    usuarios: false,
    etapas: false,
    oportunidadesPorEtapa: false,
    leadsPorEtapa: false,
  });

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

  function filterByPeriodo(items, dateField) {
    const fechas = getFechaFiltros();

    return items.filter((item) => {
      if (!item[dateField]) return false;

      const itemDate = new Date(item[dateField]);

      switch (filterPeriodo) {
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

      setRawData({ oportunidades, leads, usuarios, etapas });

      const opoFiltradas = filterByPeriodo(oportunidades, "created_at");
      const leadsFiltrados = filterByPeriodo(leads, "created_at");

      const opoVisibles = canViewAllOportunidades
        ? opoFiltradas
        : opoFiltradas.filter(
            (opp) =>
              String(opp.asignado_a) === String(user?.id) ||
              String(opp.created_by) === String(user?.id)
          );

      const leadsVisibles = canViewAllLeads
        ? leadsFiltrados
        : leadsFiltrados.filter(
            (lead) =>
              String(lead.asignado_a) === String(user?.id) ||
              String(lead.created_by) === String(user?.id)
          );

      const nuevasEtapaId = etapas.find((e) =>
        e.nombre?.toLowerCase().includes("nuevo")
      )?.id;
      const progresoEtapaIds = etapas
        .filter(
          (e) =>
            !e.nombre?.toLowerCase().includes("cerrada") &&
            !e.nombre?.toLowerCase().includes("nuevo")
        )
        .map((e) => e.id);
      const cerradaEtapaIds = etapas
        .filter((e) => e.nombre?.toLowerCase().includes("cerrada"))
        .map((e) => e.id);

      const tempPromedio =
        opoVisibles.reduce((acc, opp) => {
          const etapa = etapas.find((e) => e.id === opp.etapasconversion_id);
          return acc + (etapa?.descripcion || 0);
        }, 0) / (opoVisibles.length || 1);

      setStats({
        totalOportunidades: opoVisibles.length,
        totalLeads: leadsVisibles.length,
        oportunidadesAsignadas: opoVisibles.filter((opp) => opp.asignado_a)
          .length,
        leadsAsignados: leadsVisibles.filter((lead) => lead.asignado_a).length,
        oportunidadesNuevas: opoVisibles.filter(
          (opp) => opp.etapasconversion_id === nuevasEtapaId
        ).length,
        leadsNuevos: leadsVisibles.filter(
          (lead) => lead.etapasconversion_id === nuevasEtapaId
        ).length,
        oportunidadesEnProgreso: opoVisibles.filter((opp) =>
          progresoEtapaIds.includes(opp.etapasconversion_id)
        ).length,
        leadsEnProgreso: leadsVisibles.filter((lead) =>
          progresoEtapaIds.includes(lead.etapasconversion_id)
        ).length,
        oportunidadesCerradas: opoVisibles.filter((opp) =>
          cerradaEtapaIds.includes(opp.etapasconversion_id)
        ).length,
        leadsCerrados: leadsVisibles.filter((lead) =>
          cerradaEtapaIds.includes(lead.etapasconversion_id)
        ).length,
        tempPromedio: Math.round(tempPromedio),
      });

      toast.success("Dashboard actualizado");
    } catch (error) {
      console.error("Error cargando dashboard:", error);
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

  useEffect(() => {
    if (rawData.oportunidades.length > 0 || rawData.leads.length > 0) {
      loadData();
    }
  }, [filterPeriodo]);

  // ==================== DATOS PARA GRÁFICOS ====================
  const etapaDistribution = useMemo(() => {
    if (rawData.oportunidades.length === 0) return [];

    const filtradas = filterByPeriodo(rawData.oportunidades, "created_at");
    const visibles = canViewAllOportunidades
      ? filtradas
      : filtradas.filter(
          (opp) =>
            String(opp.asignado_a) === String(user?.id) ||
            String(opp.created_by) === String(user?.id)
        );

    const distribution = visibles.reduce((acc, opp) => {
      const etapa = rawData.etapas.find((e) => e.id === opp.etapasconversion_id);
      const etapaNombre = etapa?.nombre || "Sin etapa";

      const existing = acc.find((item) => item.name === etapaNombre);
      if (existing) {
        existing.value += 1;
      } else {
        acc.push({ name: etapaNombre, value: 1 });
      }
      return acc;
    }, []);

    return distribution;
  }, [rawData, filterPeriodo, canViewAllOportunidades, user]);

  const usuariosPerformance = useMemo(() => {
    const filtradas = filterByPeriodo(rawData.oportunidades, "created_at");
    const leadsFiltrados = filterByPeriodo(rawData.leads, "created_at");

    const visiblesOpo = canViewAllOportunidades
      ? filtradas
      : filtradas.filter(
          (opp) =>
            String(opp.asignado_a) === String(user?.id) ||
            String(opp.created_by) === String(user?.id)
        );

    const visiblesLeads = canViewAllLeads
      ? leadsFiltrados
      : leadsFiltrados.filter(
          (lead) =>
            String(lead.asignado_a) === String(user?.id) ||
            String(lead.created_by) === String(user?.id)
        );

    const performance = rawData.usuarios.map((usuario) => {
      const opoAsignadas = visiblesOpo.filter(
        (opp) => opp.asignado_a === usuario.id
      ).length;
      const leadsAsignados = visiblesLeads.filter(
        (lead) => lead.asignado_a === usuario.id
      ).length;

      return {
        id: usuario.id,
        name: usuario.fullname || usuario.username,
        opo: opoAsignadas,
        leads: leadsAsignados,
        total: opoAsignadas + leadsAsignados,
      };
    });

    return performance.filter((p) => p.opo > 0 || p.leads > 0);
  }, [rawData, filterPeriodo, canViewAllOportunidades, canViewAllLeads, user]);

  const oportunidadesPorEtapa = useMemo(() => {
    const filtradas = filterByPeriodo(rawData.oportunidades, "created_at");
    const visibles = canViewAllOportunidades
      ? filtradas
      : filtradas.filter(
          (opp) =>
            String(opp.asignado_a) === String(user?.id) ||
            String(opp.created_by) === String(user?.id)
        );

    const grouped = rawData.etapas
      .map((etapa) => {
        const cantidad = visibles.filter(
          (opp) => opp.etapasconversion_id === etapa.id
        ).length;
        return {
          id: etapa.id,
          nombre: etapa.nombre,
          cantidad,
          temperatura: etapa.descripcion || 0,
          items: visibles.filter((opp) => opp.etapasconversion_id === etapa.id),
        };
      })
      .filter((e) => e.cantidad > 0);

    return grouped;
  }, [rawData, filterPeriodo, canViewAllOportunidades, user]);

  const leadsPorEtapa = useMemo(() => {
    const filtradas = filterByPeriodo(rawData.leads, "created_at");
    const visibles = canViewAllLeads
      ? filtradas
      : filtradas.filter(
          (lead) =>
            String(lead.asignado_a) === String(user?.id) ||
            String(lead.created_by) === String(user?.id)
        );

    const grouped = rawData.etapas
      .map((etapa) => {
        const cantidad = visibles.filter(
          (lead) => lead.etapasconversion_id === etapa.id
        ).length;
        return {
          id: etapa.id,
          nombre: etapa.nombre,
          cantidad,
          temperatura: etapa.descripcion || 0,
          items: visibles.filter((lead) => lead.etapasconversion_id === etapa.id),
        };
      })
      .filter((e) => e.cantidad > 0);

    return grouped;
  }, [rawData, filterPeriodo, canViewAllLeads, user]);

  const downloadCSV = (data, filename) => {
    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map((row) => Object.values(row).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.csv`;
    a.click();
  };

  const statCards = [
    {
      title: "Oportunidades",
      value: stats.totalOportunidades,
      icon: TrendingUp,
      color: "#5d16ec",
      visible: canViewOportunidades,
    },
    {
      title: "Leads",
      value: stats.totalLeads,
      icon: Zap,
      color: "#ff6b6b",
      visible: canViewLeads,
    },
    {
      title: "OPO Asignadas",
      value: stats.oportunidadesAsignadas,
      icon: Users,
      color: "#4ecdc4",
      visible: canViewOportunidades,
    },
    {
      title: "Leads Asignados",
      value: stats.leadsAsignados,
      icon: Users,
      color: "#45b7d1",
      visible: canViewLeads,
    },
    {
      title: "OPO Nuevas",
      value: stats.oportunidadesNuevas,
      icon: AlertCircle,
      color: "#ffa502",
      visible: canViewOportunidades,
    },
    {
      title: "Leads Nuevos",
      value: stats.leadsNuevos,
      icon: AlertCircle,
      color: "#26de81",
      visible: canViewLeads,
    },
  ];

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
              Dashboard
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
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs sm:text-sm h-8 sm:h-9 flex-1 sm:flex-none"
                >
                  <Calendar className="h-3 sm:h-4 w-3 sm:w-4" />
                  <span className="hidden sm:inline">
                    {filterPeriodo === FILTER_ALL
                      ? "Todos"
                      : filterPeriodo === FILTER_TODAY
                      ? "Hoy"
                      : filterPeriodo === FILTER_THIS_WEEK
                      ? "Semana"
                      : "Mes"}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[200px] p-0" align="end">
                <Command>
                  <CommandList>
                    <CommandGroup>
                      {[
                        { value: FILTER_ALL, label: "Todos" },
                        { value: FILTER_TODAY, label: "Hoy" },
                        { value: FILTER_THIS_WEEK, label: "Esta semana" },
                        { value: FILTER_THIS_MONTH, label: "Este mes" },
                      ].map((item) => (
                        <CommandItem
                          key={item.value}
                          value={item.value}
                          onSelect={() => setFilterPeriodo(item.value)}
                          className="cursor-pointer text-xs sm:text-sm"
                        >
                          {filterPeriodo === item.value && "✓ "}
                          {item.label}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={loadData}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs sm:text-sm h-8 sm:h-9"
                >
                  <RefreshCw className="h-3 sm:h-4 w-3 sm:w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Recargar
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* TARJETAS DE ESTADÍSTICAS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {statCards
            .filter((card) => card.visible)
            .map((card, idx) => {
              const Icon = card.icon;
              return (
                <Card
                  key={idx}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                  style={{
                    borderLeftWidth: "3px",
                    borderLeftColor: card.color,
                  }}
                >
                  <CardContent className="p-2 sm:p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-600 truncate">
                          {card.title}
                        </p>
                        <p
                          className="text-xl sm:text-2xl font-bold"
                          style={{ color: card.color }}
                        >
                          {card.value}
                        </p>
                      </div>
                      <Icon
                        size={20}
                        className="flex-shrink-0 opacity-20"
                        style={{ color: card.color }}
                      />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
        </div>

        {/* TEMPERATURA PROMEDIO */}
        {canViewOportunidades && (
          <Card
            style={{
              borderLeftWidth: "3px",
              borderLeftColor: BRAND_PRIMARY,
            }}
          >
            <CardHeader className="pb-2">
              <CardTitle
                className="text-base"
                style={{ color: BRAND_PRIMARY }}
              >
                Temperatura Promedio: {stats.tempPromedio}%
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div
                  className="h-full transition-all duration-300"
                  style={{
                    width: `${stats.tempPromedio}%`,
                    backgroundColor:
                      stats.tempPromedio >= 75
                        ? "#ff6b6b"
                        : stats.tempPromedio >= 50
                        ? "#ffa502"
                        : stats.tempPromedio >= 25
                        ? "#ffd93d"
                        : "#26de81",
                  }}
                />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                {stats.tempPromedio >= 75
                  ? "🔴 Muy caliente"
                  : stats.tempPromedio >= 50
                  ? "🟠 Caliente"
                  : stats.tempPromedio >= 25
                  ? "🟡 Templada"
                  : "🔵 Fría"}
              </p>
            </CardContent>
          </Card>
        )}

        {/* GRÁFICOS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {canViewOportunidades && etapaDistribution.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base" style={{ color: BRAND_PRIMARY }}>
                  OPO por Etapa
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={etapaDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={70}
                      fill="#8884d8"
                      dataKey="value"
                      label={{ fontSize: 10 }}
                    >
                      {etapaDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip fontSize={12} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {usuariosPerformance.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base" style={{ color: BRAND_PRIMARY }}>
                  Desempeño por Usuario
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={usuariosPerformance}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="name"
                      angle={-45}
                      textAnchor="end"
                      height={70}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip fontSize={12} />
                    <Bar dataKey="opo" fill="#5d16ec" />
                    <Bar dataKey="leads" fill="#ff6b6b" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}
        </div>

        {/* TABLAS INTERACTIVAS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {/* TABLA USUARIOS */}
          {usuariosPerformance.length > 0 && (
            <Card>
              <CardHeader
                className="pb-2 cursor-pointer hover:bg-gray-50"
                onClick={() =>
                  setExpandedTables({
                    ...expandedTables,
                    usuarios: !expandedTables.usuarios,
                  })
                }
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm" style={{ color: BRAND_PRIMARY }}>
                    Usuarios
                  </CardTitle>
                  {expandedTables.usuarios ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </div>
              </CardHeader>
              {expandedTables.usuarios && (
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs px-3 py-2">
                          Usuario
                        </TableHead>
                        <TableHead className="text-xs text-right px-3 py-2">
                          OPO
                        </TableHead>
                        <TableHead className="text-xs text-right px-3 py-2">
                          LD
                        </TableHead>
                        <TableHead className="text-xs text-right px-3 py-2">
                          Total
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {usuariosPerformance.map((row) => (
                        <TableRow key={row.id} className="hover:bg-gray-50">
                          <TableCell className="text-xs px-3 py-2 font-medium">
                            {row.name}
                          </TableCell>
                          <TableCell className="text-xs text-right px-3 py-2">
                            {row.opo}
                          </TableCell>
                          <TableCell className="text-xs text-right px-3 py-2">
                            {row.leads}
                          </TableCell>
                          <TableCell className="text-xs text-right px-3 py-2 font-bold">
                            {row.total}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          )}

          {/* TABLA ETAPAS */}
          {oportunidadesPorEtapa.length > 0 && (
            <Card>
              <CardHeader
                className="pb-2 cursor-pointer hover:bg-gray-50"
                onClick={() =>
                  setExpandedTables({
                    ...expandedTables,
                    etapas: !expandedTables.etapas,
                  })
                }
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm" style={{ color: BRAND_PRIMARY }}>
                    Etapas
                  </CardTitle>
                  {expandedTables.etapas ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </div>
              </CardHeader>
              {expandedTables.etapas && (
                <CardContent className="p-0 overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs px-3 py-2">Etapa</TableHead>
                        <TableHead className="text-xs text-right px-3 py-2">
                          Cantidad
                        </TableHead>
                        <TableHead className="text-xs text-right px-3 py-2">
                          Temp.
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {oportunidadesPorEtapa.map((row) => (
                        <TableRow key={row.id} className="hover:bg-gray-50">
                          <TableCell className="text-xs px-3 py-2 font-medium">
                            {row.nombre}
                          </TableCell>
                          <TableCell className="text-xs text-right px-3 py-2">
                            {row.cantidad}
                          </TableCell>
                          <TableCell className="text-xs text-right px-3 py-2">
                            <span
                              className={`px-2 py-1 rounded text-xs font-semibold ${
                                getTemperaturaColor(row.temperatura).bg
                              } ${getTemperaturaColor(row.temperatura).text}`}
                            >
                              {row.temperatura}%
                            </span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              )}
            </Card>
          )}

          {/* TABLA OPO POR ETAPA (EXPANDIBLE) */}
          {oportunidadesPorEtapa.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader
                className="pb-2 cursor-pointer hover:bg-gray-50"
                onClick={() =>
                  setExpandedTables({
                    ...expandedTables,
                    oportunidadesPorEtapa: !expandedTables.oportunidadesPorEtapa,
                  })
                }
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm" style={{ color: BRAND_PRIMARY }}>
                    Oportunidades por Etapa
                  </CardTitle>
                  {expandedTables.oportunidadesPorEtapa ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </div>
              </CardHeader>
              {expandedTables.oportunidadesPorEtapa && (
                <CardContent className="p-0 overflow-x-auto">
                  <div className="space-y-3 p-3">
                    {oportunidadesPorEtapa.map((etapa) => (
                      <div key={etapa.id}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold">{etapa.nombre}</h4>
                          <span className="text-xs text-gray-600">
                            {etapa.cantidad} items
                          </span>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs px-2 py-1">
                                Código
                              </TableHead>
                              <TableHead className="text-xs px-2 py-1">
                                Cliente
                              </TableHead>
                              <TableHead className="text-xs px-2 py-1">
                                Asignado
                              </TableHead>
                              <TableHead className="text-xs text-right px-2 py-1">
                                Acciones
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {etapa.items.slice(0, 3).map((item) => {
                              const usuario = rawData.usuarios.find(
                                (u) => u.id === item.asignado_a
                              );
                              const cliente = rawData.usuarios.find(
                                (c) => c.id === item.cliente_id
                              );
                              return (
                                <TableRow
                                  key={item.id}
                                  className="text-xs hover:bg-gray-50"
                                >
                                  <TableCell className="px-2 py-1 font-medium">
                                    {item.oportunidad_id || `OPO-${item.id}`}
                                  </TableCell>
                                  <TableCell className="px-2 py-1 max-w-xs truncate">
                                    {cliente?.fullname || "-"}
                                  </TableCell>
                                  <TableCell className="px-2 py-1">
                                    {usuario?.fullname || "Sin asignar"}
                                  </TableCell>
                                  <TableCell className="px-2 py-1 text-right">
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
                        {etapa.items.length > 3 && (
                          <p className="text-xs text-gray-500 mt-1 px-2">
                            +{etapa.items.length - 3} más
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* TABLA LEADS POR ETAPA (EXPANDIBLE) */}
          {leadsPorEtapa.length > 0 && (
            <Card className="lg:col-span-2">
              <CardHeader
                className="pb-2 cursor-pointer hover:bg-gray-50"
                onClick={() =>
                  setExpandedTables({
                    ...expandedTables,
                    leadsPorEtapa: !expandedTables.leadsPorEtapa,
                  })
                }
              >
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm" style={{ color: BRAND_PRIMARY }}>
                    Leads por Etapa
                  </CardTitle>
                  {expandedTables.leadsPorEtapa ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </div>
              </CardHeader>
              {expandedTables.leadsPorEtapa && (
                <CardContent className="p-0 overflow-x-auto">
                  <div className="space-y-3 p-3">
                    {leadsPorEtapa.map((etapa) => (
                      <div key={etapa.id}>
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-xs font-bold">{etapa.nombre}</h4>
                          <span className="text-xs text-gray-600">
                            {etapa.cantidad} items
                          </span>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="text-xs px-2 py-1">
                                Código
                              </TableHead>
                              <TableHead className="text-xs px-2 py-1">
                                Cliente
                              </TableHead>
                              <TableHead className="text-xs px-2 py-1">
                                Asignado
                              </TableHead>
                              <TableHead className="text-xs text-right px-2 py-1">
                                Acciones
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {etapa.items.slice(0, 3).map((item) => {
                              const usuario = rawData.usuarios.find(
                                (u) => u.id === item.asignado_a
                              );
                              const cliente = rawData.usuarios.find(
                                (c) => c.id === item.cliente_id
                              );
                              return (
                                <TableRow
                                  key={item.id}
                                  className="text-xs hover:bg-gray-50"
                                >
                                  <TableCell className="px-2 py-1 font-medium">
                                    {item.oportunidad_id || `LD-${item.id}`}
                                  </TableCell>
                                  <TableCell className="px-2 py-1 max-w-xs truncate">
                                    {cliente?.fullname || "-"}
                                  </TableCell>
                                  <TableCell className="px-2 py-1">
                                    {usuario?.fullname || "Sin asignar"}
                                  </TableCell>
                                  <TableCell className="px-2 py-1 text-right">
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
                        {etapa.items.length > 3 && (
                          <p className="text-xs text-gray-500 mt-1 px-2">
                            +{etapa.items.length - 3} más
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>

        {/* INFO */}
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-3">
            <div className="flex gap-2">
              <div className="text-2xl">ℹ️</div>
              <div className="text-xs space-y-1">
                <p className="font-semibold text-blue-900">Dashboard Info</p>
                <ul className="text-blue-700 space-y-0.5">
                  <li>• Filtro por período: Día, Semana, Mes o Todos</li>
                  <li>
                    • Permisos: "view" = Solo tus asignaciones | "viewall" = Todo
                  </li>
                  <li>• Tablas expandibles: Haz click en los headers</li>
                  <li>• Temperatura: Promedio de oportunidades activas</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}