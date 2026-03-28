"use client";

import { useRouter } from "next/navigation";
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

import { Edit2, Send, Clock, Eye, Loader2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

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
    // Extraer solo la fecha en formato YYYY-MM-DD
    const fechaLimpia = fechaAgenda.split("T")[0];
    
    // horaAgenda ya viene en formato HH:mm:ss, extraer solo HH:mm
    const horaLimpia = horaAgenda.substring(0, 5); // "17:10"

    // Crear la fecha y hora de la agenda
    const agendaDateTime = new Date(`${fechaLimpia}T${horaLimpia}:00`);
    const ahora = new Date();

    // Calcular diferencia: agenda - ahora (minutos que faltan o han pasado)
    // Si es positivo: faltan minutos
    // Si es negativo: ya pasó
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

    // Buscar el estado que coincida con los minutos
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

// Función para convertir hex a rgba
function hexToRgba(hex, alpha) {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
  etapas,
  clientes,
  origenes,
  estadosTiempo,
}) {
  const router = useRouter();
  const [loadingRow, setLoadingRow] = useState(null);

  if (loading) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Cargando oportunidades...
      </div>
    );
  }

  if (!rows.length) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay oportunidades para mostrar
      </div>
    );
  }

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

  const handleVerDetalle = async (row) => {
    // Verificar si está en etapa "Nuevo" (id: 1) o "Asignado" (id: 2)
    const etapaActual = row.etapasconversion_id;
    const esNuevoOAsignado = etapaActual === 1 || etapaActual === 2;

    if (esNuevoOAsignado) {
      // Cambiar a "En Atención" (id: 4)
      setLoadingRow(row.id);
      try {
        const response = await fetch(
          `/api/oportunidades-oportunidades/${row.id}/etapa`,
          {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              etapasconversion_id: 4, // En Atención
              created_by: 1, // Ajusta según tu usuario
            }),
          }
        );

        if (response.ok) {
          toast.success("Etapa cambiada a 'En Atención'");
          // Recargar datos
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

    // Navegar al detalle
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
                Estado
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

              return (
                <TableRow
                  key={row.id}
                  className="border-b border-slate-200 hover:bg-slate-50 transition-colors"
                  style={estiloFila}
                >
                  <TableCell className="text-sm font-medium text-slate-900">
                    <Tooltip>
                      <TooltipTrigger className="cursor-help underline underline-offset-2 text-blue-600">
                        {row.oportunidad_id || `OPO-${row.id}`}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        ID: {row.id}
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
                          {row.hora_ultima_agenda.substring(0, 5)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400">Sin agenda</span>
                    )}
                  </TableCell>

                  <TableCell className="text-sm">
                    {estadoTiempo ? (
                      <span
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium text-white"
                        style={{
                          backgroundColor: estadoTiempo.color_hexadecimal,
                        }}
                        title={estadoTiempo.descripcion}
                      >
                        {estadoTiempo.nombre}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-xs">—</span>
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
                            Editar oportunidad
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