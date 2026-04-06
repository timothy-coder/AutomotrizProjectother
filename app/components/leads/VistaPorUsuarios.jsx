"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format, addDays } from "date-fns";
import { es } from "date-fns/locale";

import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
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
    <div className="space-y-1 text-sm">
      <div><span className="font-semibold">Código:</span> {card?.oportunidad_id || "-"}</div>
      <div><span className="font-semibold">Cliente:</span> {card?.cliente_name || "-"}</div>
      <div><span className="font-semibold">Vehículo:</span> {card?.modelo_name || "-"} {card?.marca_name ? `- ${card.marca_name}` : ""}</div>
      <div><span className="font-semibold">Origen:</span> {card?.origen_name || "-"}</div>
      <div><span className="font-semibold">Suborigen:</span> {card?.suborigen_name || "-"}</div>
      <div><span className="font-semibold">Etapa:</span> {card?.etapa_name || "-"}</div>
      <div><span className="font-semibold">Asignado a:</span> {card?.asignado_a_name || "Sin asignar"}</div>
      <div><span className="font-semibold">Fecha:</span> {card?.fecha_agenda || "-"}</div>
      <div><span className="font-semibold">Hora:</span> {getHoraLabel(card?.hora_agenda) || "-"}</div>
      {card?.detalle ? (
        <div><span className="font-semibold">Detalle:</span> {card.detalle}</div>
      ) : null}
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
  const [filtroRango, setFiltroRango] = useState("dia"); // "dia", "semana", "mes"

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

  const effectiveSelectedUsers = useMemo(() => {
    if (!canViewAll) {
      return currentUserId != null ? [String(currentUserId)] : [];
    }

    if (selectedUsers.length) {
      return selectedUsers;
    }

    return usuariosActivos.map((u) => String(u.id));
  }, [canViewAll, currentUserId, selectedUsers, usuariosActivos]);

  // Obtener días de la semana actual
  const diasSemana = useMemo(() => {
    const inicio = startOfWeek(new Date(), { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
  }, []);

  const usuariosFiltrados = useMemo(() => {
    if (!canViewAll) return usuariosActivos;
    if (!effectiveSelectedUsers.length) return usuariosActivos;

    return usuariosActivos.filter((u) => effectiveSelectedUsers.includes(String(u.id)));
  }, [usuariosActivos, effectiveSelectedUsers, canViewAll]);

  // Función para obtener rango de fechas
  const getRangoFechas = useCallback(() => {
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
  }, [filtroRango]);

  const visibleRows = useMemo(() => {
    const { inicio, fin } = getRangoFechas();
    
    let rowsFiltrados = [];
    
    if (canViewAll) {
      rowsFiltrados = rows || [];
    } else {
      if (!currentUserId) return [];
      rowsFiltrados = (rows || []).filter(
        (r) => String(r?.asignado_a ?? "") === String(currentUserId)
      );
    }

    // Filtrar por rango de fechas
    return rowsFiltrados.filter((row) => {
      if (!row?.fecha_agenda) return false;

      try {
        const fechaRow = new Date(row.fecha_agenda);
        return fechaRow >= inicio && fechaRow <= fin;
      } catch {
        return false;
      }
    });
  }, [rows, canViewAll, currentUserId, getRangoFechas]);

  const oportunidadesAsignadas = useMemo(() => {
    return visibleRows.filter(
      (r) => r?.asignado_a != null && r?.hora_agenda && r?.fecha_agenda
    );
  }, [visibleRows]);

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
  const getEstadoTiempo = useCallback((minutosRestantes, etapasconversion_id) => {
    // Solo lógica dinámica si es "Nuevo" (etapasconversion_id === 1)
    if (etapasconversion_id !== 1) {
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
  }, [estadosTiempo]);

  // Función para obtener color hexadecimal del estado
  function getColorEstado(minutosRestantes, etapasconversion_id) {
    // Solo lógica dinámica si es "Nuevo" (etapasconversion_id === 1)
    if (etapasconversion_id !== 1) {
      return "#28a745";
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
  }, [oportunidadesAsignadas, getEstadoTiempo]);

  function toggleUser(id) {
    if (!canViewAll) return;

    const key = String(id);
    setSelectedUsers((prev) => {
      const base = prev.length ? prev : usuariosActivos.map((u) => String(u.id));
      return base.includes(key)
        ? base.filter((x) => x !== key)
        : [...base, key];
    });
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Filtrar por:</span>
            <Select value={filtroRango} onValueChange={setFiltroRango}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Selecciona rango" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="dia">Por día</SelectItem>
                <SelectItem value="semana">Por semana</SelectItem>
                <SelectItem value="mes">Por mes</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {canViewAll && (
            <Popover open={openUsers} onOpenChange={setOpenUsers}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="rounded-full">
                  Asesores +{effectiveSelectedUsers.length}
                  <ChevronsUpDown className="ml-2 h-4 w-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-2">
                <div className="space-y-2 max-h-[300px] overflow-auto">
                  {usuariosActivos.map((u) => {
                    const checked = effectiveSelectedUsers.includes(String(u.id));
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => toggleUser(u.id)}
                        className="w-full flex items-center gap-2 rounded-md px-2 py-2 text-left hover:bg-muted"
                      >
                        <div
                          className={cn(
                            "flex h-4 w-4 items-center justify-center rounded border text-[10px]",
                            checked ? "bg-primary text-primary-foreground" : "bg-white"
                          )}
                        >
                          {checked ? "✓" : ""}
                        </div>
                        <span className="text-sm">{getUserLabel(u)}</span>
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>
          )}
        </div>

        {/* Resumen de estados */}
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="rounded-lg border border-red-300 bg-red-50 p-3">
            <div className="text-2xl font-bold text-red-600">
              {resumenEstados.retrasado}
            </div>
            <div className="text-xs text-red-700 font-medium">Retrasados</div>
          </div>
          <div className="rounded-lg border border-yellow-300 bg-yellow-50 p-3">
            <div className="text-2xl font-bold text-yellow-600">
              {resumenEstados.cercaHora}
            </div>
            <div className="text-xs text-yellow-700 font-medium">Cerca de la hora</div>
          </div>
          <div className="rounded-lg border border-green-300 bg-green-50 p-3">
            <div className="text-2xl font-bold text-green-600">
              {resumenEstados.tiempoSuficiente}
            </div>
            <div className="text-xs text-green-700 font-medium">Tiempo suficiente</div>
          </div>
        </div>

        <div className="rounded-2xl border">
          <div className="overflow-auto max-h-[75vh]">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `220px repeat(7, 1fr)`,
              }}
            >
              <div className="sticky left-0 top-0 z-30 bg-background border-b border-r p-4 font-semibold text-xl">
                Asesores
              </div>

              {/* Encabezados de días de la semana */}
              {diasSemana.map((dia) => (
                <div
                  key={dia.toISOString()}
                  className="sticky top-0 z-20 bg-background border-b p-3 text-center text-sm font-medium capitalize"
                >
                  {format(dia, "EEEE", { locale: es })}
                </div>
              ))}

              {/* Filas de usuarios */}
              {usuariosFiltrados.map((usuario, idx) => {
                const colorDot =
                  idx % 3 === 0
                    ? "bg-cyan-500"
                    : idx % 3 === 1
                    ? "bg-blue-500"
                    : "bg-indigo-700";

                return (
                  <div key={usuario.id} className="contents">
                    {/* Nombre del usuario */}
                    <div className="sticky left-0 z-10 bg-background border-r border-b p-4 flex items-center gap-3 min-h-[120px]">
                      <span className={cn("h-2.5 w-2.5 rounded-full", colorDot)} />
                      <span className="text-sm leading-5">
                        {getUserLabel(usuario)}
                      </span>
                    </div>

                    {/* Celdas por día de la semana */}
                    {diasSemana.map((dia) => {
                      const diaStr = format(dia, "yyyy-MM-dd");

                      // Obtener todas las oportunidades del usuario en este día
                      const dayOportunidades = oportunidadesAsignadas.filter(
                        (r) =>
                          String(r?.asignado_a ?? "") === String(usuario.id) &&
                          String(r?.fecha_agenda || "").startsWith(diaStr)
                      );

                      return (
                        <div
                          key={`${usuario.id}-${diaStr}`}
                          className="border-b border-r min-h-[120px] p-2 bg-slate-50"
                        >
                          <div className="space-y-2">
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
                                      className="rounded-md border p-2 text-xs shadow-sm w-full text-left transition hover:opacity-80"
                                      style={{
                                        backgroundColor: colorEstado,
                                        color: textColor,
                                        borderColor: colorEstado,
                                      }}
                                    >
                                      <div className="font-bold truncate">
                                        {card.oportunidad_id}
                                      </div>
                                      <div className="truncate text-[10px]">
                                        {card.cliente_name || ""}
                                      </div>
                                      <div className="text-[10px]">
                                        {getHoraLabel(card.hora_agenda) || "-"}
                                      </div>
                                    </button>
                                  </TooltipTrigger>
                                  <TooltipContent side="top" className="max-w-[320px]">
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