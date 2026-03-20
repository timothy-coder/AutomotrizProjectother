"use client";

import { useMemo, useState, useEffect } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
} from "@tanstack/react-table";
import { ArrowUpDown, Pencil, UserPlus, Eye, ChevronLeft, ChevronRight, Calendar, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { useRouter } from "next/navigation";

const FILTER_ALL_ASSIGNED = "__all_assigned__";
const FILTER_ALL_STATUS = "__all_status__";
const FILTER_ALL_ETAPA = "__all_etapa__";
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

export default function OportunidadesTable({
  rows,
  loading,
  onEdit,
  onAssign,
  canEdit,
  canAssign,
  onRefresh,
  usuarios,
  canViewAll,
}) {
  const router = useRouter();
  const [sorting, setSorting] = useState([]);
  const [estadosTiempo, setEstadosTiempo] = useState([]);
  const [todosEstados, setTodosEstados] = useState([]);
  const [filtroRango, setFiltroRango] = useState("dia");
  const [filtroCliente, setFiltroCliente] = useState("todos");
  const [filtroUsuario, setFiltroUsuario] = useState(FILTER_ALL_ASSIGNED);
  const [filtroEstado, setFiltroEstado] = useState(FILTER_ALL_STATUS);
  const [filtroEstadoAsignacion, setFiltroEstadoAsignacion] = useState(FILTER_ALL_ETAPA);
  const [filtroAsignacion, setFiltroAsignacion] = useState(FILTER_ASSIGN_MODE_ALL);
  const [clientes, setClientes] = useState([]);

  useEffect(() => {
    fetch("/api/configuracion-estados-tiempo", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];
        setEstadosTiempo(lista);
      })
      .catch(() => setEstadosTiempo([]));
  }, []);

  // Cargar TODOS los estados disponibles
  useEffect(() => {
    fetch("/api/etapasconversion", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];
        const estadosList = lista.map((item) => ({
          id: String(item.id),
          name: item.name || item.nombre || `Etapa ${item.id}`,
        })).sort((a, b) => a.name.localeCompare(b.name, "es"));
        setTodosEstados(estadosList);
      })
      .catch(() => setTodosEstados([]));
  }, []);

  useEffect(() => {
    if (rows && rows.length > 0) {
      const clientesUnicos = Array.from(
        new Map(
          rows.map((row) => [
            row.cliente_id,
            {
              id: row.cliente_id,
              name: row.cliente_name,
            },
          ])
        ).values()
      ).sort((a, b) => (a.name || "").localeCompare(b.name || ""));

      setClientes(clientesUnicos);
    }
  }, [rows]);

  const assignedToOptions = useMemo(() => {
    return buildUniqueOptions(rows, "asignado_a", "asignado_a_name");
  }, [rows]);

  const statusOptions = useMemo(() => {
    // Usar todos los estados, no solo los de los registros
    return todosEstados.length > 0 ? todosEstados : buildUniqueStatusOptions(rows);
  }, [rows, todosEstados]);

  function getMinutosRestantes(fechaAgenda, horaAgenda) {
    if (!fechaAgenda || !horaAgenda) return null;

    try {
      const fechaStr = String(fechaAgenda).trim().split("T")[0];
      const horaStr = String(horaAgenda)
        .trim()
        .split(":")
        .slice(0, 2)
        .join(":");

      const fechaHoraString = `${fechaStr}T${horaStr}:00`;
      const ahora = new Date();
      const agendaDateTime = new Date(fechaHoraString);

      if (isNaN(agendaDateTime.getTime())) {
        return null;
      }

      const diferencia = agendaDateTime.getTime() - ahora.getTime();
      const minutos = Math.floor(diferencia / 1000 / 60);

      return minutos;
    } catch (error) {
      console.error("Error calculando minutos:", error);
      return null;
    }
  }

  function getColorEstadoTiempo(minutosRestantes, etapasconversion_id) {
    if (etapasconversion_id !== 1 && etapasconversion_id !== 2) {
      return {
        bg: "transparent",
        text: "#000000",
        border: "",
      };
    }

    if (minutosRestantes === null) {
      return {
        bg: "transparent",
        text: "#000000",
        border: "",
      };
    }

    const estadoActivo = estadosTiempo.find(
      (e) =>
        e.activo &&
        minutosRestantes >= e.minutos_desde &&
        minutosRestantes <= e.minutos_hasta
    );

    if (estadoActivo) {
      return {
        bg: estadoActivo.color_hexadecimal,
        text: esColorOscuro(estadoActivo.color_hexadecimal) ? "#ffffff" : "#000000",
        border: estadoActivo.color_hexadecimal,
      };
    }

    return {
      bg: "transparent",
      text: "#000000",
      border: "",
    };
  }

  function esColorOscuro(color) {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  }

  function getRangoFechas() {
    const ahora = new Date();

    switch (filtroRango) {
      case "dia":
        return {
          inicio: startOfDay(ahora),
          fin: endOfDay(ahora),
        };
      case "semana":
        return {
          inicio: startOfWeek(ahora, { weekStartsOn: 1 }),
          fin: endOfWeek(ahora, { weekStartsOn: 1 }),
        };
      case "mes":
        return {
          inicio: startOfMonth(ahora),
          fin: endOfMonth(ahora),
        };
      default:
        return {
          inicio: startOfDay(ahora),
          fin: endOfDay(ahora),
        };
    }
  }

  const rowsFiltrados = useMemo(() => {
    const { inicio, fin } = getRangoFechas();

    return (rows || []).filter((row) => {
      if (!row?.fecha_agenda) return false;

      try {
        const fechaRow = new Date(row.fecha_agenda);
        const dentroDeRango = fechaRow >= inicio && fechaRow <= fin;

        if (!dentroDeRango) return false;
      } catch {
        return false;
      }

      if (filtroCliente !== "todos" && String(row.cliente_id) !== String(filtroCliente)) {
        return false;
      }

      // Filtro de estado de asignación
      if (filtroEstadoAsignacion !== FILTER_ALL_ETAPA) {
        const isAssigned = row?.asignado_a != null && String(row.asignado_a).trim() !== "";
        if (filtroEstadoAsignacion === "asignado" && !isAssigned) {
          return false;
        }
        if (filtroEstadoAsignacion === "sin_asignar" && isAssigned) {
          return false;
        }
      }

      if (canViewAll || true) {
        const matchesUsuario =
          filtroUsuario === FILTER_ALL_ASSIGNED ||
          String(row?.asignado_a ?? "") === filtroUsuario;

        const matchesEstado =
          filtroEstado === FILTER_ALL_STATUS ||
          String(row?.etapa_name || "") === filtroEstado;

        const isAssigned =
          row?.asignado_a != null && String(row.asignado_a).trim() !== "";

        const matchesAsignacion =
          filtroAsignacion === FILTER_ASSIGN_MODE_ALL ||
          (filtroAsignacion === FILTER_ASSIGN_MODE_ONLY_UNASSIGNED && !isAssigned) ||
          (filtroAsignacion === FILTER_ASSIGN_MODE_ONLY_ASSIGNED && isAssigned);

        if (!matchesUsuario || !matchesEstado || !matchesAsignacion) {
          return false;
        }
      }

      return true;
    });
  }, [rows, filtroRango, filtroCliente, filtroUsuario, filtroEstado, filtroEstadoAsignacion, filtroAsignacion, canViewAll]);

  const handleVerOportunidad = (oportunidad) => {
    router.push(`/oportunidades/${oportunidad.id}`);
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: "oportunidad_id",
        header: "Código",
        cell: ({ row }) => (
          <div className="font-mono font-semibold text-blue-600">
            {row.original?.oportunidad_id || "-"}
          </div>
        ),
      },
      {
        accessorKey: "cliente_name",
        header: ({ column }) => (
          <Button
            variant="ghost"
            className="px-0 hover:bg-transparent"
            onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          >
            Cliente
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        ),
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="font-medium text-slate-900 cursor-help max-w-xs truncate">
                {row.original?.cliente_name || "-"}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs">
              {row.original?.cliente_name || "Sin cliente"}
            </TooltipContent>
          </Tooltip>
        ),
      },
      {
        accessorKey: "asignado_a_name",
        header: "Asignado a",
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 inline-block cursor-help">
                {row.original?.asignado_a_name || "Sin asignar"}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              Asignado a {row.original?.asignado_a_name || "nadie"}
            </TooltipContent>
          </Tooltip>
        ),
      },
      {
        accessorKey: "origen_name",
        header: "Origen",
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-sm cursor-help max-w-xs truncate">
                {row.original?.origen_name || "-"}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              Origen: {row.original?.origen_name || "Sin especificar"}
            </TooltipContent>
          </Tooltip>
        ),
      },
      {
        accessorKey: "suborigen_name",
        header: "Suborigen",
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="text-sm text-slate-600 cursor-help max-w-xs truncate">
                {row.original?.suborigen_name || "-"}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              Suborigen: {row.original?.suborigen_name || "Sin especificar"}
            </TooltipContent>
          </Tooltip>
        ),
      },
      {
        id: "vehiculo",
        header: "Vehículo",
        cell: ({ row }) => {
          const modelo = row.original?.modelo_name || "";
          const marca = row.original?.marca_name || "";
          const texto = `${marca}${marca && modelo ? " " : ""}${modelo}`;
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm font-medium text-slate-700 cursor-help max-w-xs truncate">
                  {texto || "-"}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="text-xs">
                  <div>Marca: {marca || "N/A"}</div>
                  <div>Modelo: {modelo || "N/A"}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: "etapa_name",
        header: "Etapa",
        cell: ({ row }) => (
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="px-2 py-1 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-700 inline-block cursor-help">
                {row.original?.etapa_name || "-"}
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">
              Etapa: {row.original?.etapa_name || "Sin etapa"}
            </TooltipContent>
          </Tooltip>
        ),
      },
      {
        accessorKey: "fecha_agenda",
        header: () => (
          <div className="flex items-center gap-1">
            <Calendar size={16} />
            Fecha agendada
          </div>
        ),
        cell: ({ row }) => {
          const minutosRestantes = getMinutosRestantes(
            row.original?.fecha_agenda,
            row.original?.hora_agenda
          );

          let tiempoLabel = "";
          if (minutosRestantes !== null) {
            if (minutosRestantes < 0) {
              tiempoLabel = `Hace ${Math.abs(minutosRestantes)} min`;
            } else if (minutosRestantes < 60) {
              tiempoLabel = `En ${minutosRestantes} min`;
            } else {
              const horas = Math.floor(minutosRestantes / 60);
              tiempoLabel = `En ${horas}h`;
            }
          }

          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="text-sm cursor-help">
                  <div className="font-medium text-slate-900">
                    {row.original?.fecha_agenda
                      ? new Date(row.original.fecha_agenda).toLocaleDateString("es-ES", {
                        year: "2-digit",
                        month: "short",
                        day: "numeric",
                      })
                      : "-"}
                  </div>
                  <div className="text-xs text-slate-600">
                    {row.original?.hora_agenda
                      ? String(row.original.hora_agenda).slice(0, 5)
                      : "-"}
                  </div>
                  {tiempoLabel && (
                    <div className="text-xs font-semibold text-blue-600 mt-1">
                      {tiempoLabel}
                    </div>
                  )}
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="text-xs">
                  <div>
                    {row.original?.fecha_agenda
                      ? new Date(row.original.fecha_agenda).toLocaleDateString("es-ES", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })
                      : "-"}
                  </div>
                  <div>
                    {row.original?.hora_agenda
                      ? `A las ${String(row.original.hora_agenda).slice(0, 5)}`
                      : "-"}
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        accessorKey: "temperatura",
        header: "Temperatura",
        cell: ({ row }) => {
          const temp = row.original?.temperatura ?? 0;
          const tempNum = Math.min(Math.max(Number(temp) || 0, 0), 100);

          let bgColor = "bg-slate-100 text-slate-700";
          let label = "Fría";

          if (tempNum >= 75) {
            bgColor = "bg-red-100 text-red-700";
            label = "Muy caliente";
          } else if (tempNum >= 50) {
            bgColor = "bg-orange-100 text-orange-700";
            label = "Caliente";
          } else if (tempNum >= 25) {
            bgColor = "bg-yellow-100 text-yellow-700";
            label = "Templada";
          }

          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <div className={`px-2 py-1 rounded-full text-xs font-semibold ${bgColor} inline-block`}>
                    {tempNum}%
                  </div>
                  <div className="w-12 h-2 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all ${tempNum >= 75 ? "bg-red-500" :
                          tempNum >= 50 ? "bg-orange-500" :
                            tempNum >= 25 ? "bg-yellow-500" :
                              "bg-slate-400"
                        }`}
                      style={{ width: `${tempNum}%` }}
                    />
                  </div>
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                <div className="text-xs">
                  <div>Temperatura: {tempNum}%</div>
                  <div>Estado: {label}</div>
                </div>
              </TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        id: "acciones",
        header: "Acciones",
        cell: ({ row }) => (
          <TooltipProvider>
            <div className="flex gap-1.5">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    className="text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
                    size="sm"
                    onClick={() => handleVerOportunidad(row.original)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Ver detalle completo</TooltipContent>
              </Tooltip>

              {canEdit && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="text-slate-700 shadow-sm"
                      variant="outline"
                      size="sm"
                      onClick={() => onEdit(row.original)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Editar oportunidad</TooltipContent>
                </Tooltip>
              )}

              {canAssign && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      className="text-slate-700 shadow-sm"
                      variant="outline"
                      size="sm"
                      onClick={() => onAssign(row.original)}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Asignar a usuario</TooltipContent>
                </Tooltip>
              )}
            </div>
          </TooltipProvider>
        ),
      },
    ],
    [canEdit, onEdit, canAssign, onAssign]
  );

  const table = useReactTable({
    data: rowsFiltrados,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  return (
    <TooltipProvider>
      <div className="space-y-0 border border-slate-200 rounded-lg overflow-hidden shadow-sm">

        {/* FILTROS */}
        <div className="bg-white border-b border-slate-200 p-4">
          <div className="flex items-center justify-between">
            {/* FILTROS A LA IZQUIERDA */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-medium text-slate-700">Todos los estados</span>
                <RotateCw size={16} className="text-slate-600 cursor-pointer hover:rotate-180 transition-transform" />
              </div>

              <div className="flex items-center gap-3 border-l border-slate-300 pl-3">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-slate-600" />
                  <span className="text-sm font-medium text-slate-700">Filtrar por:</span>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Select value={filtroRango} onValueChange={setFiltroRango}>
                        <SelectTrigger className="w-[120px] h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="dia">Por día</SelectItem>
                          <SelectItem value="semana">Por semana</SelectItem>
                          <SelectItem value="mes">Por mes</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">Filtrar por rango de fechas</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Select value={filtroCliente} onValueChange={setFiltroCliente}>
                        <SelectTrigger className="w-[160px] h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos los clientes</SelectItem>
                          {clientes.map((cliente) => (
                            <SelectItem key={cliente.id} value={String(cliente.id)}>
                              {cliente.name || `Cliente ${cliente.id}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">Filtrar por cliente</TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <div>
                      <Select value={filtroEstadoAsignacion} onValueChange={setFiltroEstadoAsignacion}>
                        <SelectTrigger className="w-[140px] h-9 text-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={FILTER_ALL_ETAPA}>Todos los estados</SelectItem>
                          <SelectItem value="asignado">Asignado</SelectItem>
                          <SelectItem value="sin_asignar">Sin asignar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="top">Filtrar por estado de asignación (Asignado/Sin asignar)</TooltipContent>
                </Tooltip>

                {canViewAll && (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Select value={filtroUsuario} onValueChange={setFiltroUsuario}>
                            <SelectTrigger className="w-[140px] h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={FILTER_ALL_ASSIGNED}>Todos los usuarios</SelectItem>
                              {assignedToOptions.map((item) => (
                                <SelectItem key={item.id} value={item.id}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">Filtrar por usuario asignado</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                            <SelectTrigger className="w-[140px] h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={FILTER_ALL_STATUS}>Todos los estados</SelectItem>
                              {statusOptions.map((item) => (
                                <SelectItem key={item.id} value={item.name}>
                                  {item.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">Filtrar por etapa/estado - Muestra todos los estados disponibles</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div>
                          <Select value={filtroAsignacion} onValueChange={setFiltroAsignacion}>
                            <SelectTrigger className="w-[140px] h-9 text-sm">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value={FILTER_ASSIGN_MODE_ALL}>Todos</SelectItem>
                              <SelectItem value={FILTER_ASSIGN_MODE_ONLY_ASSIGNED}>Solo asignados</SelectItem>
                              <SelectItem value={FILTER_ASSIGN_MODE_ONLY_UNASSIGNED}>Sin asignar</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">Filtrar por estado de asignación avanzado</TooltipContent>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>

            {/* BOTÓN Y REGISTROS A LA DERECHA */}
            <div className="flex items-center gap-3">
              <div className="text-sm text-slate-600 font-medium">
                {rowsFiltrados.length} registros
              </div>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="gap-2"
                    onClick={onRefresh}
                    disabled={loading}
                  >
                    <RotateCw size={16} className={loading ? "animate-spin" : ""} />
                    Recargar
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Recargar datos</TooltipContent>
              </Tooltip>
            </div>
          </div>
        </div>

        {/* TABLA */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-200">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-4 py-3 text-left font-semibold text-slate-900 whitespace-nowrap"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>

            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center">
                    <div className="flex items-center justify-center gap-2 text-muted-foreground">
                      <div className="animate-spin rounded-full h-5 w-5 border border-slate-300 border-t-blue-600"></div>
                      Cargando...
                    </div>
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-muted-foreground">
                    No hay oportunidades registradas
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => {
                  const colores = getColorEstadoTiempo(
                    getMinutosRestantes(
                      row.original?.fecha_agenda,
                      row.original?.hora_agenda
                    ),
                    row.original?.etapasconversion_id
                  );

                  return (
                    <tr
                      key={row.id}
                      className="border-b border-slate-100 hover:bg-slate-50 transition-colors"
                      style={{
                        backgroundColor: colores.bg,
                        color: colores.text,
                      }}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} className="px-4 py-3 whitespace-nowrap">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* PAGINACIÓN */}
        <div className="bg-white border-t border-slate-200 p-4 flex items-center justify-between">
          <div className="text-sm text-slate-600 font-medium">
            Página{" "}
            <span className="font-semibold text-slate-900">
              {table.getState().pagination.pageIndex + 1}
            </span>{" "}
            de{" "}
            <span className="font-semibold text-slate-900">
              {table.getPageCount() || 1}
            </span>
          </div>

          <div className="flex gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.previousPage()}
                  disabled={!table.getCanPreviousPage()}
                  className="gap-2"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Anterior
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Ir a página anterior</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => table.nextPage()}
                  disabled={!table.getCanNextPage()}
                  className="gap-2"
                >
                  Siguiente
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Ir a página siguiente</TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}