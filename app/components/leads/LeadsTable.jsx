"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Edit2, Send, Clock, Eye, Loader2, Flame } from "lucide-react";

function getLabel(item) {
  return (
    item?.fullname ||
    item?.full_name ||
    item?.nombre ||
    item?.name ||
    item?.razon_social ||
    item?.description ||
    `ID ${item?.id}`
  );
}

function obtenerEstadoTiempo(fechaAgenda, horaAgenda, estadosTiempo) {
  if (!fechaAgenda || !horaAgenda || !estadosTiempo.length) {
    return null;
  }

  try {
    const fechaLimpia = fechaAgenda.split("T")[0];
    const horaLimpia = horaAgenda.substring(0, 5);

    const agendaDateTime = new Date(`${fechaLimpia}T${horaLimpia}:00`);
    const ahora = new Date();

    const diferenciaMilisegundos = agendaDateTime - ahora;
    const minutosParaAgenda = Math.floor(
      diferenciaMilisegundos / (1000 * 60)
    );

    console.log("Estado de tiempo:", {
      agendaDateTime: agendaDateTime.toLocaleString(),
      ahora: ahora.toLocaleString(),
      minutosParaAgenda,
      fechaAgenda,
      horaAgenda,
    });

    const estado = estadosTiempo.find(
      (e) =>
        minutosParaAgenda >= e.minutos_desde &&
        minutosParaAgenda <= e.minutos_hasta
    );

    if (estado) {
      console.log("Estado encontrado:", estado.nombre);
    }

    return estado || null;
  } catch (error) {
    console.error("Error calculando estado de tiempo:", error, {
      fechaAgenda,
      horaAgenda,
    });
    return null;
  }
}

function debeColorearse(etapaId, etapas) {
  const etapa = etapas.find((e) => String(e.id) === String(etapaId));
  if (!etapa) return false;

  const nombreEtapa = (getLabel(etapa) || "").toLowerCase();
  return nombreEtapa.includes("nuevo") || nombreEtapa.includes("asignado");
}

function esEtapaCerrada(etapaId, etapas) {
  const etapa = etapas.find((e) => String(e.id) === String(etapaId));
  if (!etapa) return false;

  const nombreEtapa = (getLabel(etapa) || "").toLowerCase();
  return nombreEtapa.includes("cerrada");
}

function calcularTemperatura(etapaActualId, etapas) {
  if (!etapaActualId || !etapas || etapas.length === 0) {
    return 0;
  }

  try {
    const etapaActual = etapas.find((e) => String(e.id) === String(etapaActualId));
    if (!etapaActual) return 0;

    const sortOrderActual = etapaActual.sort_order;

    let temperaturaCalculada = 0;
    etapas.forEach((etapa) => {
      if (etapa.sort_order <= sortOrderActual && etapa.is_active === 1) {
        temperaturaCalculada += etapa.descripcion || 0;
      }
    });

    console.log("🔥 Temperatura calculada:", {
      etapaActual: etapaActual.nombre,
      sortOrder: sortOrderActual,
      temperatura: temperaturaCalculada,
    });

    return temperaturaCalculada;
  } catch (error) {
    console.error("Error calculando temperatura:", error);
    return 0;
  }
}

function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getTemperaturaColor(temperatura) {
  if (temperatura === undefined || temperatura === null || temperatura === 0) {
    return { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-300" };
  }

  const temp = parseInt(temperatura);

  if (temp >= 75) {
    return { bg: "bg-red-100", text: "text-red-700", border: "border-red-300", icon: "🔴" };
  } else if (temp >= 50) {
    return { bg: "bg-orange-100", text: "text-orange-700", border: "border-orange-300", icon: "🟠" };
  } else if (temp >= 25) {
    return { bg: "bg-yellow-100", text: "text-yellow-700", border: "border-yellow-300", icon: "🟡" };
  } else {
    return { bg: "bg-blue-100", text: "text-blue-700", border: "border-blue-300", icon: "🔵" };
  }
}

function getTemperaturaLabel(temperatura) {
  if (temperatura === undefined || temperatura === null || temperatura === 0) {
    return "Sin temp.";
  }

  const temp = parseInt(temperatura);

  if (temp >= 75) return "Muy caliente";
  if (temp >= 50) return "Caliente";
  if (temp >= 25) return "Templada";
  return "Fría";
}

export default function LeadsTable({
  rows = [],
  loading = false,
  onEdit,
  onAssign,
  canEdit = false,
  canAssign = false,
  onRefresh,
  usuarios = [],
  etapas = [],
  clientes = [],
  origenes = [],
  estadosTiempo = [],
}) {
  const router = useRouter();
  const [loadingRow, setLoadingRow] = useState(null);

  // ✅ DIAGNÓSTICO
  useEffect(() => {
    console.log("🎯 LeadsTable MONTADO con:", {
      rowsLength: rows?.length,
      loading,
      rows: rows?.slice(0, 2),
    });
  }, [rows, loading]);

  console.log("🔴 LeadsTable render:", {
    rowsLength: rows?.length,
    loading,
    isRowsArray: Array.isArray(rows),
  });

  if (loading) {
    console.log("⏳ Está en loading");
    return (
      <div className="text-center py-8 text-muted-foreground">
        Cargando leads...
      </div>
    );
  }

  if (!rows || !Array.isArray(rows)) {
    console.error("❌ rows no es un array:", rows);
    return (
      <div className="text-center py-8 text-muted-foreground">
        Error: datos inválidos
      </div>
    );
  }

  if (!rows.length) {
    console.warn("⚠️ rows.length = 0");
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay leads para mostrar
      </div>
    );
  }

  console.log("✅ Renderizando tabla con", rows.length, "filas");

  const getUsuarioNombre = (id) => {
    const usuario = usuarios.find((u) => String(u.id) === String(id));
    return usuario ? getLabel(usuario) : `Usuario ${id}`;
  };

  const getEtapaNombre = (id) => {
    const etapa = etapas.find((e) => String(e.id) === String(id));
    return etapa ? getLabel(etapa) : `Etapa ${id}`;
  };

  const getClienteNombre = (id) => {
    const cliente = clientes.find((c) => String(c.id) === String(id));
    return cliente ? getLabel(cliente) : `Cliente ${id}`;
  };

  const getOrigenNombre = (id) => {
    const origen = origenes.find((o) => String(o.id) === String(id));
    return origen ? getLabel(origen) : `Origen ${id}`;
  };

  const handleAbrirLead = async (row) => {
    console.log("🔗 Abriendo lead:", row.id);
    router.push(`/oportunidades/${row.id}`);
  };

  const handleVerDetalle = async (row) => {
    const etapaActual = row.etapasconversion_id;
    const esNuevoOAsignado = etapaActual === 1 || etapaActual === 2;

    if (esNuevoOAsignado) {
      setLoadingRow(row.id);
      try {
        const response = await fetch(
          `/api/leads/${row.id}/etapa`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              etapasconversion_id: 4,
              created_by: 1,
            }),
          }
        );

        if (response.ok) {
          toast.success("Etapa cambiada a 'En Atención'");
          if (onRefresh) {
            await onRefresh();
          }
        } else {
          const error = await response.json();
          toast.error(error.message || "Error cambiando etapa");
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("Error cambiando etapa");
      } finally {
        setLoadingRow(null);
      }
    }

    router.push(`/oportunidades/${row.id}`);

  };

  return (
    <TooltipProvider>
      <div className="border border-slate-200 rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-gradient-to-r from-slate-50 to-slate-100">
            <TableRow className="border-b border-slate-200 hover:bg-transparent">
              <TableHead className="text-xs font-semibold text-slate-700">
                Código
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">
                Cliente
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">
                Origen
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">
                Etapa
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">
                Asignado a
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">
                Próxima Agenda
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">
                Temperatura
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700">
                Detalle
              </TableHead>
              <TableHead className="text-xs font-semibold text-slate-700 text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => {
              const estadoTiempo = obtenerEstadoTiempo(
                row.fecha_ultima_agenda,
                row.hora_ultima_agenda,
                estadosTiempo
              );

              const colorearFila = debeColorearse(
                row.etapasconversion_id,
                etapas
              );

              const estiloFila =
                colorearFila && estadoTiempo
                  ? {
                      backgroundColor: hexToRgba(
                        estadoTiempo.color_hexadecimal,
                        0.25
                      ),
                    }
                  : {};

              const temperaturaCalculada = calcularTemperatura(
                row.etapasconversion_id,
                etapas
              );
              const temperaturaColor = getTemperaturaColor(temperaturaCalculada);
              const temperaturaLabel = getTemperaturaLabel(temperaturaCalculada);

              const etapaEsCerrada = esEtapaCerrada(row.etapasconversion_id, etapas);

              return (
                <TableRow
                  key={row.id}
                  className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                  style={estiloFila}
                >
                  <TableCell className="text-sm font-medium text-slate-900">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={() => handleAbrirLead(row)}
                          variant="ghost"
                          className="p-0 h-auto text-blue-600 hover:text-blue-700 underline underline-offset-2 cursor-pointer"
                        >
                          {row.oportunidad_id || `LD-${row.id}`}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        ID: {row.id} (Haz clic para abrir)
                      </TooltipContent>
                    </Tooltip>
                  </TableCell>

                  <TableCell className="text-sm text-slate-700">
                    {getClienteNombre(row.cliente_id)}
                  </TableCell>

                  <TableCell className="text-sm text-slate-700">
                    {getOrigenNombre(row.origen_id)}
                  </TableCell>

                  <TableCell className="text-sm">
                    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                      {getEtapaNombre(row.etapasconversion_id)}
                    </span>
                  </TableCell>

                  <TableCell className="text-sm text-slate-700">
                    {row.asignado_a
                      ? getUsuarioNombre(row.asignado_a)
                      : "No asignado"}
                  </TableCell>

                  <TableCell className="text-sm text-slate-700">
                    {row.fecha_ultima_agenda ? (
                      <div className="flex items-center gap-1">
                        <Clock size={14} />
                        <span>
                          {row.fecha_ultima_agenda.split("T")[0]}{" "}
                          {row.hora_ultima_agenda?.substring(0, 5) || ""}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">Sin agenda</span>
                    )}
                  </TableCell>

                  <TableCell className="text-sm">
                    {etapaEsCerrada ? (
                      <span className="text-slate-400 text-xs">-</span>
                    ) : (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${temperaturaColor.bg} ${temperaturaColor.text} ${temperaturaColor.border} cursor-help`}
                          >
                            <Flame size={14} />
                            {temperaturaCalculada}%
                          </div>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <div className="space-y-1">
                            <p className="font-semibold">
                              {temperaturaLabel}
                            </p>
                            <p className="text-xs">
                              Temperatura: {temperaturaCalculada}%
                            </p>
                            <div className="text-xs mt-2 pt-2 border-t border-slate-400">
                              <p className="font-semibold mb-1">Etapas incluidas:</p>
                              {etapas
                                .filter(
                                  (e) =>
                                    e.sort_order <=
                                      etapas.find(
                                        (et) =>
                                          String(et.id) ===
                                          String(row.etapasconversion_id)
                                      )?.sort_order &&
                                    e.is_active === 1
                                )
                                .map((e) => (
                                  <p key={e.id}>
                                    • {e.nombre}: +{e.descripcion}%
                                  </p>
                                ))}
                            </div>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </TableCell>

                  <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                    {row.detalle || "-"}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => handleVerDetalle(row)}
                            size="sm"
                            variant="ghost"
                            className="gap-1"
                            disabled={loadingRow === row.id}
                          >
                            {loadingRow === row.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left">
                          Ver detalle completo
                        </TooltipContent>
                      </Tooltip>

                      {canEdit && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => onEdit(row)}
                              size="sm"
                              variant="ghost"
                              className="gap-1"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            Editar lead
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {canAssign && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={() => onAssign(row)}
                              size="sm"
                              variant="ghost"
                              className="gap-1"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="left">
                            Asignar usuario
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
      </div>
    </TooltipProvider>
  );
}