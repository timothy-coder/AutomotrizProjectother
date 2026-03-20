"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronsUpDown, Calendar, Building2, Filter } from "lucide-react";
import { format, startOfWeek, addDays, startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { cn } from "@/lib/utils";

function getUserLabel(u) {
  return u?.fullname || u?.username || u?.name || u?.nombre || `ID ${u?.id}`;
}

function getHoraLabel(hora) {
  if (!hora) return "";
  return String(hora).slice(0, 5);
}

function renderTooltipContent(card) {
  return (
    <div className="space-y-1.5 text-xs">
      <div>
        <span className="font-semibold text-blue-300">Código:</span>{" "}
        <span className="text-blue-100">{card?.oportunidad_id || "-"}</span>
      </div>
      <div>
        <span className="font-semibold text-purple-300">Cliente:</span>{" "}
        <span className="text-purple-100">{card?.cliente_name || "-"}</span>
      </div>
      <div>
        <span className="font-semibold text-indigo-300">Vehículo:</span>{" "}
        <span className="text-indigo-100">
          {card?.marca_name ? `${card.marca_name} ` : ""}
          {card?.modelo_name || "-"}
        </span>
      </div>
      <div>
        <span className="font-semibold text-amber-300">Origen:</span>{" "}
        <span className="text-amber-100">{card?.origen_name || "-"}</span>
      </div>
      {card?.suborigen_name && (
        <div>
          <span className="font-semibold text-cyan-300">Suborigen:</span>{" "}
          <span className="text-cyan-100">{card.suborigen_name}</span>
        </div>
      )}
      <div>
        <span className="font-semibold text-green-300">Etapa:</span>{" "}
        <span className="text-green-100">{card?.etapa_name || "-"}</span>
      </div>
      <div>
        <span className="font-semibold text-orange-300">Hora:</span>{" "}
        <span className="text-orange-100">{getHoraLabel(card?.hora_agenda) || "-"}</span>
      </div>
      {card?.detalle && (
        <div className="pt-1.5 border-t border-slate-600">
          <span className="font-semibold text-slate-300">Detalle:</span>
          <p className="text-slate-200 mt-1">{card.detalle}</p>
        </div>
      )}
    </div>
  );
}

export default function VistaPorUsuarios({
  rows,
  usuarios,
  onOpenOportunidad,
  canViewAll = false,
  currentUserId = null,
}) {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [openUsers, setOpenUsers] = useState(false);
  const [estadosTiempo, setEstadosTiempo] = useState([]);
  const [filtroRango, setFiltroRango] = useState("semana");
  const [filtroCliente, setFiltroCliente] = useState("todos");
  const [clientes, setClientes] = useState([]);

  // Cargar configuración de estados de tiempo
  useEffect(() => {
    fetch("/api/configuracion-estados-tiempo", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];
        setEstadosTiempo(lista);
      })
      .catch(() => setEstadosTiempo([]));
  }, []);

  // Cargar clientes únicos
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

  const usuariosActivos = useMemo(() => {
    const base = (usuarios || []).filter(
      (u) =>
        Number(u?.is_active) === 1 ||
        u?.is_active === true ||
        u?.is_active == null
    );

    if (canViewAll) return base;

    return base.filter((u) => String(u?.id) === String(currentUserId));
  }, [usuarios, canViewAll, currentUserId]);

  useEffect(() => {
    if (!usuariosActivos.length) {
      setSelectedUsers([]);
      return;
    }

    if (canViewAll) {
      if (selectedUsers.length === 0) {
        setSelectedUsers(usuariosActivos.map((u) => String(u.id)));
      }
      return;
    }

    setSelectedUsers(
      currentUserId != null ? [String(currentUserId)] : []
    );
  }, [usuariosActivos, canViewAll, currentUserId]);

  // Obtener rango de fechas según filtro
  const getRangoDias = useMemo(() => {
    const hoy = new Date();
    let inicio, fin, dias;

    switch (filtroRango) {
      case "dia":
        inicio = startOfDay(hoy);
        fin = endOfDay(hoy);
        dias = [inicio];
        break;
      case "mes":
        inicio = startOfMonth(hoy);
        fin = endOfMonth(hoy);
        dias = [];
        for (let d = new Date(inicio); d <= fin; d.setDate(d.getDate() + 1)) {
          dias.push(new Date(d));
        }
        break;
      case "semana":
      default:
        inicio = startOfWeek(hoy, { weekStartsOn: 1 });
        dias = Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
        break;
    }

    return dias;
  }, [filtroRango]);

  const usuariosFiltrados = useMemo(() => {
    if (!canViewAll) {
      return usuariosActivos;
    }

    if (!selectedUsers.length) return usuariosActivos;

    return usuariosActivos.filter((u) => selectedUsers.includes(String(u.id)));
  }, [usuariosActivos, selectedUsers, canViewAll]);

  const visibleRows = useMemo(() => {
    if (canViewAll) return rows || [];
    if (!currentUserId) return [];

    return (rows || []).filter(
      (r) => String(r?.asignado_a ?? "") === String(currentUserId)
    );
  }, [rows, canViewAll, currentUserId]);

  const oportunidadesAsignadas = useMemo(() => {
    let filtered = visibleRows.filter(
      (r) => r?.asignado_a != null && r?.hora_agenda && r?.fecha_agenda
    );

    // Filtro de cliente
    if (filtroCliente !== "todos") {
      filtered = filtered.filter(
        (r) => String(r.cliente_id) === String(filtroCliente)
      );
    }

    // Filtro de rango de fechas
    if (getRangoDias.length > 0) {
      const minFecha = startOfDay(getRangoDias[0]);
      const maxFecha = endOfDay(getRangoDias[getRangoDias.length - 1]);

      filtered = filtered.filter((r) => {
        try {
          const fecha = new Date(r.fecha_agenda);
          return fecha >= minFecha && fecha <= maxFecha;
        } catch {
          return false;
        }
      });
    }

    return filtered;
  }, [visibleRows, filtroCliente, getRangoDias]);

  // Función para calcular minutos restantes
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

  // Función para obtener el estado de tiempo
  function getEstadoTiempo(minutosRestantes, etapasconversion_id) {
    if (etapasconversion_id !== 1 && etapasconversion_id !== 2) {
      return "suficiente";
    }

    if (minutosRestantes === null) {
      return null;
    }

    const estadoActivo = estadosTiempo.find(
      (e) =>
        e.activo &&
        minutosRestantes >= e.minutos_desde &&
        minutosRestantes <= e.minutos_hasta
    );

    if (estadoActivo) {
      return estadoActivo.estado;
    }

    return null;
  }

  // Función para obtener color hexadecimal del estado
  function getColorEstado(minutosRestantes, etapasconversion_id) {
    if (etapasconversion_id !== 1 && etapasconversion_id !== 2) {
      return "#10b981";
    }

    if (minutosRestantes === null) {
      return "#6b7280";
    }

    const estadoActivo = estadosTiempo.find(
      (e) =>
        e.activo &&
        minutosRestantes >= e.minutos_desde &&
        minutosRestantes <= e.minutos_hasta
    );

    return estadoActivo?.color_hexadecimal || "#6b7280";
  }

  // Función para determinar si el color es oscuro
  function esColorOscuro(color) {
    const hex = color.replace("#", "");
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness < 128;
  }

  // Calcular resumen de estados
  const resumenEstados = useMemo(() => {
    const resumen = {
      retrasado: 0,
      cercaHora: 0,
      tiempoSuficiente: 0,
    };

    oportunidadesAsignadas.forEach((card) => {
      const minutosRestantes = getMinutosRestantes(
        card.fecha_agenda,
        card.hora_agenda
      );
      const estado = getEstadoTiempo(minutosRestantes, card.etapasconversion_id);

      if (estado === "rojo") {
        resumen.retrasado++;
      } else if (estado === "amarillo") {
        resumen.cercaHora++;
      } else if (estado === "verde" || estado === "suficiente") {
        resumen.tiempoSuficiente++;
      }
    });

    return resumen;
  }, [oportunidadesAsignadas, estadosTiempo]);

  function toggleUser(id) {
    if (!canViewAll) return;

    const key = String(id);
    setSelectedUsers((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  }

  const columnas = filtroRango === "mes" ? 7 : 7;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        {/* FILTROS */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between flex-wrap gap-4">
            {/* Filtros a la izquierda */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter size={16} className="text-slate-600" />
                <span className="text-sm font-medium text-slate-700">Filtrar:</span>
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
                <TooltipContent side="top">Selecciona el rango de fechas a mostrar</TooltipContent>
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
                <TooltipContent side="top">Filtrar por cliente específico</TooltipContent>
              </Tooltip>
            </div>

            {/* Selector de usuarios a la derecha */}
            {canViewAll && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Popover open={openUsers} onOpenChange={setOpenUsers}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="gap-2">
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                          {selectedUsers.length}
                        </span>
                        Asesores
                        <ChevronsUpDown className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[280px] p-2">
                      <div className="space-y-2 max-h-[300px] overflow-auto">
                        {usuariosActivos.map((u) => {
                          const checked = selectedUsers.includes(String(u.id));
                          return (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => toggleUser(u.id)}
                              className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-slate-100 transition-colors"
                            >
                              <div
                                className={cn(
                                  "flex h-4 w-4 items-center justify-center rounded border text-[10px] font-bold",
                                  checked
                                    ? "bg-blue-600 text-white border-blue-600"
                                    : "bg-white border-slate-300"
                                )}
                              >
                                {checked ? "✓" : ""}
                              </div>
                              <span className="text-sm text-slate-900">{getUserLabel(u)}</span>
                            </button>
                          );
                        })}
                      </div>
                    </PopoverContent>
                  </Popover>
                </TooltipTrigger>
                <TooltipContent side="top">Selecciona los asesores a mostrar</TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>

        {/* RESUMEN DE ESTADOS */}
        <div className="grid grid-cols-3 gap-3">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="rounded-lg border-2 border-red-200 bg-red-50 p-4 cursor-help">
                <div className="text-3xl font-bold text-red-600">
                  {resumenEstados.retrasado}
                </div>
                <div className="text-xs text-red-700 font-semibold mt-1">Retrasados</div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">Citas que ya pasaron su hora</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="rounded-lg border-2 border-yellow-200 bg-yellow-50 p-4 cursor-help">
                <div className="text-3xl font-bold text-yellow-600">
                  {resumenEstados.cercaHora}
                </div>
                <div className="text-xs text-yellow-700 font-semibold mt-1">Próximas</div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">Citas en las próximas 2 horas</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 cursor-help">
                <div className="text-3xl font-bold text-green-600">
                  {resumenEstados.tiempoSuficiente}
                </div>
                <div className="text-xs text-green-700 font-semibold mt-1">Con tiempo</div>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top">Citas con más de 2 horas</TooltipContent>
          </Tooltip>
        </div>

        {/* TABLA DE CALENDARIO */}
        <div className="rounded-lg border border-slate-200 overflow-hidden shadow-sm bg-white">
          <div className="overflow-auto max-h-[calc(100vh-400px)]">
            <div
              className="grid gap-0"
              style={{
                gridTemplateColumns: `200px repeat(${columnas}, 1fr)`,
              }}
            >
              {/* ENCABEZADO */}
              <div className="sticky left-0 top-0 z-30 bg-gradient-to-r from-slate-900 to-slate-800 border-b border-slate-700 p-4 font-bold text-white text-lg">
                Asesores
              </div>

              {/* Encabezados de días */}
              {getRangoDias.map((dia) => (
                <div
                  key={dia.toISOString()}
                  className="sticky top-0 z-20 bg-gradient-to-b from-slate-100 to-slate-50 border-b border-slate-200 p-3 text-center"
                >
                  <div className="text-xs font-semibold text-slate-600 uppercase">
                    {format(dia, "EEE", { locale: es })}
                  </div>
                  <div className="text-sm font-bold text-slate-900">
                    {format(dia, "dd", { locale: es })}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    {format(dia, "MMM", { locale: es })}
                  </div>
                </div>
              ))}

              {/* FILAS DE USUARIOS */}
              {usuariosFiltrados.map((usuario, idx) => {
                const coloresDot = [
                  "bg-cyan-500",
                  "bg-blue-500",
                  "bg-indigo-600",
                  "bg-purple-500",
                  "bg-pink-500",
                  "bg-rose-500",
                ];
                const colorDot = coloresDot[idx % coloresDot.length];

                return (
                  <div key={usuario.id} className="contents">
                    {/* Nombre del usuario */}
                    <div className="sticky left-0 z-10 bg-gradient-to-r from-slate-50 to-white border-r border-b border-slate-200 p-4 flex items-center gap-3 min-h-[140px]">
                      <span className={cn("h-3 w-3 rounded-full flex-shrink-0", colorDot)} />
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="text-sm font-medium text-slate-900 cursor-help">
                            {getUserLabel(usuario)}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          {getUserLabel(usuario)}
                        </TooltipContent>
                      </Tooltip>
                    </div>

                    {/* CELDAS POR DÍA */}
                    {getRangoDias.map((dia) => {
                      const diaStr = format(dia, "yyyy-MM-dd");

                      const dayOportunidades = oportunidadesAsignadas.filter(
                        (r) =>
                          String(r?.asignado_a ?? "") === String(usuario.id) &&
                          String(r?.fecha_agenda || "").startsWith(diaStr)
                      );

                      return (
                        <div
                          key={`${usuario.id}-${diaStr}`}
                          className="border-b border-r border-slate-200 min-h-[140px] p-2 bg-slate-50 hover:bg-slate-100 transition-colors"
                        >
                          <div className="space-y-1.5">
                            {dayOportunidades.map((card) => {
                              const colorEstado = getColorEstado(
                                getMinutosRestantes(
                                  card.fecha_agenda,
                                  card.hora_agenda
                                ),
                                card.etapasconversion_id
                              );
                              const textOscuro = esColorOscuro(colorEstado);
                              const textColor = textOscuro ? "#ffffff" : "#000000";

                              return (
                                <Tooltip key={card.id}>
                                  <TooltipTrigger asChild>
                                    <button
                                      type="button"
                                      onClick={() => onOpenOportunidad?.(card)}
                                      className="rounded-md border-2 p-2 text-xs shadow-md w-full text-left transition-all hover:shadow-lg hover:scale-105"
                                      style={{
                                        backgroundColor: colorEstado,
                                        color: textColor,
                                        borderColor: colorEstado,
                                      }}
                                    >
                                      <div className="font-bold truncate text-[11px]">
                                        {card.oportunidad_id}
                                      </div>
                                      <div className="truncate text-[10px] opacity-90">
                                        {card.cliente_name || ""}
                                      </div>
                                      <div className="text-[10px] font-semibold mt-0.5">
                                        ⏰ {getHoraLabel(card.hora_agenda) || "-"}
                                      </div>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[340px]">
                                    {renderTooltipContent(card)}
                                  </TooltipContent>
                                </Tooltip>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}