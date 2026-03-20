"use client";

import { useMemo } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function getHoraLabel(hora) {
  if (!hora) return "";
  return String(hora).slice(0, 5);
}

function renderTooltipContent(item) {
  return (
    <div className="space-y-1.5 text-xs max-w-xs">
      <div>
        <span className="font-semibold text-blue-300">Código:</span>{" "}
        <span className="text-blue-100 font-mono">{item?.oportunidad_id || "-"}</span>
      </div>
      <div>
        <span className="font-semibold text-purple-300">Cliente:</span>{" "}
        <span className="text-purple-100">{item?.cliente_name || "-"}</span>
      </div>
      <div>
        <span className="font-semibold text-indigo-300">Vehículo:</span>{" "}
        <span className="text-indigo-100">
          {item?.marca_name ? `${item.marca_name} ` : ""}
          {item?.modelo_name || "-"}
        </span>
      </div>
      <div>
        <span className="font-semibold text-amber-300">Origen:</span>{" "}
        <span className="text-amber-100">{item?.origen_name || "-"}</span>
      </div>
      {item?.suborigen_name && (
        <div>
          <span className="font-semibold text-cyan-300">Suborigen:</span>{" "}
          <span className="text-cyan-100">{item.suborigen_name}</span>
        </div>
      )}
      <div>
        <span className="font-semibold text-green-300">Etapa:</span>{" "}
        <span className="text-green-100">{item?.etapa_name || "-"}</span>
      </div>
      <div>
        <span className="font-semibold text-orange-300">Asignado:</span>{" "}
        <span className="text-orange-100">{item?.asignado_a_name || "Sin asignar"}</span>
      </div>
      <div>
        <span className="font-semibold text-pink-300">Fecha/Hora:</span>{" "}
        <span className="text-pink-100">
          {item?.fecha_agenda || "-"} {getHoraLabel(item?.hora_agenda) ? `@${getHoraLabel(item.hora_agenda)}` : ""}
        </span>
      </div>
      {item?.detalle && (
        <div className="pt-1.5 border-t border-slate-600 mt-1.5">
          <span className="font-semibold text-slate-300">Detalle:</span>
          <p className="text-slate-200 mt-1">{item.detalle}</p>
        </div>
      )}
    </div>
  );
}

export default function VistaPorEtapas({
  rows,
  onOpenOportunidad,
  canViewAll = false,
  currentUserId = null,
}) {
  const visibleRows = useMemo(() => {
    if (canViewAll) return rows || [];
    if (!currentUserId) return [];

    return (rows || []).filter(
      (r) => String(r?.asignado_a ?? "") === String(currentUserId)
    );
  }, [rows, canViewAll, currentUserId]);

  const etapas = useMemo(() => {
    const map = new Map();

    visibleRows.forEach((r) => {
      if (!r?.etapasconversion_id) return;

      const key = String(r.etapasconversion_id);

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          nombre: r.etapa_name || "Sin etapa",
          sort_order: Number(r.etapa_sort_order || 0),
          color: r.etapa_color || "#2563eb",
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.sort_order - b.sort_order);
  }, [visibleRows]);

  const rowsConEtapa = useMemo(() => {
    return visibleRows.filter((r) => r?.etapasconversion_id);
  }, [visibleRows]);

  // Calcular resumen por etapa
  const resumenEtapas = useMemo(() => {
    const resumen = {};
    etapas.forEach((etapa) => {
      resumen[etapa.id] = rowsConEtapa.filter(
        (r) => String(r?.etapasconversion_id) === etapa.id
      ).length;
    });
    return resumen;
  }, [etapas, rowsConEtapa]);

  const totalOportunidades = rowsConEtapa.length;

  return (
    <TooltipProvider delayDuration={150}>
      <div className="flex flex-col h-full bg-gradient-to-br from-slate-50 to-slate-100">
        {/* ENCABEZADO CON RESUMEN */}
        <div className="bg-white border-b border-slate-200 p-4 shadow-sm">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.max(etapas.length, 1)}, 1fr)` }}>
            {etapas.length === 0 ? (
              <div className="col-span-full text-center py-8 text-slate-500">
                <p className="text-sm font-medium">No hay etapas disponibles</p>
              </div>
            ) : (
              etapas.map((etapa) => {
                const count = resumenEtapas[etapa.id] || 0;
                return (
                  <Tooltip key={`header-${etapa.id}`}>
                    <TooltipTrigger asChild>
                      <div
                        className="rounded-lg p-3 text-white text-center cursor-help transition-transform hover:scale-105"
                        style={{ backgroundColor: etapa.color }}
                      >
                        <div className="text-xs font-semibold opacity-90">{etapa.nombre}</div>
                        <div className="text-2xl font-bold mt-1">{count}</div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <div className="text-xs">
                        <div className="font-semibold">{etapa.nombre}</div>
                        <div className="mt-1">{count} oportunidad{count !== 1 ? "es" : ""}</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                );
              })
            )}
          </div>

          {/* Total de oportunidades */}
          <div className="mt-3 pt-3 border-t border-slate-200 text-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="text-sm font-semibold text-slate-700 cursor-help">
                  Total de oportunidades:{" "}
                  <span className="text-lg text-blue-600">{totalOportunidades}</span>
                </p>
              </TooltipTrigger>
              <TooltipContent side="top">
                Suma total de todas las oportunidades por etapa
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* COLUMNAS KANBAN */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden">
          <div className="flex gap-0 h-full min-w-full">
            {etapas.length === 0 ? (
              <div className="w-full flex items-center justify-center text-slate-500">
                <p className="text-base font-medium">No hay registros para mostrar.</p>
              </div>
            ) : (
              etapas.map((etapa) => {
                const items = rowsConEtapa.filter(
                  (r) => String(r?.etapasconversion_id) === etapa.id
                );

                return (
                  <div
                    key={etapa.id}
                    className="flex-1 min-w-[280px] max-w-[400px] border-r border-slate-300 bg-white flex flex-col"
                  >
                    {/* ENCABEZADO DE COLUMNA */}
                    <div
                      className="sticky top-0 z-10 border-b-2 px-4 py-3 text-center text-sm font-bold text-white"
                      style={{
                        backgroundColor: etapa.color,
                      }}
                    >
                      <div>{etapa.nombre}</div>
                      <div className="text-xs font-semibold opacity-80 mt-1">
                        {items.length} elemento{items.length !== 1 ? "s" : ""}
                      </div>
                    </div>

                    {/* CONTENIDO DE COLUMNA */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-2">
                      {items.length === 0 ? (
                        <div className="flex items-center justify-center h-32">
                          <p className="text-xs text-slate-400 text-center">
                            Sin oportunidades
                          </p>
                        </div>
                      ) : (
                        items.map((item) => {
                          const isColorDark = parseInt(etapa.color.slice(1), 16) < 0x888888;

                          return (
                            <Tooltip key={item.id}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => onOpenOportunidad?.(item)}
                                  className="w-full rounded-lg px-3 py-2.5 text-left text-xs font-medium transition-all hover:shadow-lg hover:scale-105 active:scale-95 border-2"
                                  style={{
                                    backgroundColor: etapa.color,
                                    borderColor: etapa.color,
                                    color: isColorDark ? "#ffffff" : "#000000",
                                    opacity: 0.95,
                                  }}
                                >
                                  <div className="font-bold truncate text-sm">
                                    {String(item.oportunidad_id || "")}
                                  </div>
                                  <div className="text-[11px] opacity-80 truncate mt-0.5">
                                    {item.cliente_name || "Sin cliente"}
                                  </div>
                                  {item.hora_agenda && (
                                    <div className="text-[10px] opacity-70 mt-1">
                                      🕐 {getHoraLabel(item.hora_agenda)}
                                    </div>
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-sm">
                                {renderTooltipContent(item)}
                              </TooltipContent>
                            </Tooltip>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}