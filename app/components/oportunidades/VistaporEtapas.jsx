"use client";

import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function getHoraLabel(hora) {
  if (!hora) return "";
  return String(hora).slice(0, 5);
}

function renderTooltipContent(item) {
  return (
    <div className="space-y-1 text-sm">
      <div>
        <span className="font-semibold">Código:</span>{" "}
        {item?.oportunidad_id || "-"}
      </div>
      <div>
        <span className="font-semibold">Cliente:</span>{" "}
        {item?.cliente_name || "-"}
      </div>
      <div>
        <span className="font-semibold">Vehículo:</span>{" "}
        {item?.modelo_name || "-"}
        {item?.marca_name ? ` - ${item.marca_name}` : ""}
      </div>
      <div>
        <span className="font-semibold">Etapa:</span>{" "}
        {item?.etapa_name || "-"}
      </div>
      <div>
        <span className="font-semibold">Asignado a:</span>{" "}
        {item?.asignado_a_name || "Sin asignar"}
      </div>
      <div>
        <span className="font-semibold">Fecha:</span>{" "}
        {item?.fecha_agenda || "-"}
      </div>
      <div>
        <span className="font-semibold">Hora:</span>{" "}
        {getHoraLabel(item?.hora_agenda) || "-"}
      </div>
      {item?.detalle ? (
        <div>
          <span className="font-semibold">Detalle:</span> {item.detalle}
        </div>
      ) : null}
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

  return (
    <TooltipProvider delayDuration={150}>
      <div className="rounded-2xl border">
        <div className="overflow-x-auto overflow-y-hidden">
          <div className="min-w-[1800px]">
            <div
              className="grid"
              style={{
                gridTemplateColumns: `repeat(${Math.max(etapas.length, 1)}, minmax(260px, 1fr))`,
              }}
            >
              {etapas.length === 0 ? (
                <div className="col-span-full p-6 text-sm text-muted-foreground">
                  No hay registros para mostrar.
                </div>
              ) : (
                etapas.map((etapa) => {
                  const items = rowsConEtapa.filter(
                    (r) => String(r?.etapasconversion_id) === etapa.id
                  );

                  return (
                    <div
                      key={etapa.id}
                      className="border-r min-h-[650px] bg-background"
                    >
                      <div className="sticky top-0 z-10 border-b bg-background px-4 py-3 text-center text-base font-medium text-slate-600">
                        {etapa.nombre}
                      </div>

                      <div className="p-4 space-y-4">
                        {items.length === 0 ? (
                          <div className="text-sm text-muted-foreground">
                            Sin registros
                          </div>
                        ) : (
                          items.map((item) => (
                            <Tooltip key={item.id}>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => onOpenOportunidad?.(item)}
                                  className="mx-auto block w-[150px] rounded-full px-4 py-2 text-center text-white font-bold text-base shadow transition hover:opacity-90"
                                  style={{ backgroundColor: etapa.color }}
                                >
                                  {String(item.oportunidad_id || "")}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[320px]">
                                {renderTooltipContent(item)}
                              </TooltipContent>
                            </Tooltip>
                          ))
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}
