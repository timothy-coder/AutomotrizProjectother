"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronsUpDown } from "lucide-react";

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
import { cn } from "@/lib/utils";

function getUserLabel(u) {
  return u?.fullname || u?.username || u?.name || u?.nombre || `ID ${u?.id}`;
}

function getHoraLabel(hora) {
  if (!hora) return "";
  return String(hora).slice(0, 5);
}

function generateHours() {
  const hours = [];
  for (let h = 0; h <= 24; h++) {
    const hh = String(h).padStart(2, "0");
    hours.push(`${hh}:00`);
    if (h !== 24) hours.push(`${hh}:30`);
  }
  return hours;
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

export default function VistaPorUsuariosLeads({
  rows,
  usuarios,
  onOpenOportunidad,
  canViewAll = false,
  currentUserId = null,
}) {
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [openUsers, setOpenUsers] = useState(false);

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

  const horas = useMemo(() => generateHours(), []);

  const usuariosFiltrados = useMemo(() => {
    if (!canViewAll) return usuariosActivos;
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
    return visibleRows.filter(
      (r) => r?.asignado_a != null && r?.hora_agenda && r?.fecha_agenda
    );
  }, [visibleRows]);

  const noLlegaron = useMemo(() => {
    return visibleRows.filter((r) => {
      const etapa = String(r?.etapa_name || "").toLowerCase().trim();
      return (
        (etapa.includes("no llegó") || etapa.includes("no llego")) &&
        r?.hora_agenda
      );
    });
  }, [visibleRows]);

  function toggleUser(id) {
    if (!canViewAll) return;

    const key = String(id);
    setSelectedUsers((prev) =>
      prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]
    );
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        {canViewAll && (
          <div className="flex items-center justify-end">
            <Popover open={openUsers} onOpenChange={setOpenUsers}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="rounded-full">
                  Asesores +{selectedUsers.length}
                  <ChevronsUpDown className="ml-2 h-4 w-4" />
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
          </div>
        )}

        <div className="rounded-2xl border">
          <div className="overflow-auto max-h-[75vh]">
            <div
              className="grid min-w-[3200px]"
              style={{
                gridTemplateColumns: `220px repeat(${horas.length}, minmax(120px, 1fr))`,
              }}
            >
              <div className="sticky left-0 top-0 z-30 bg-background border-b border-r p-4 font-semibold text-xl">
                Asesores
              </div>

              {horas.map((hora) => (
                <div
                  key={hora}
                  className="sticky top-0 z-20 bg-background border-b p-3 text-center text-sm font-medium"
                >
                  {hora}
                </div>
              ))}

              {usuariosFiltrados.map((usuario, idx) => {
                const colorDot =
                  idx % 3 === 0 ? "bg-cyan-500" : idx % 3 === 1 ? "bg-blue-500" : "bg-indigo-700";

                return (
                  <div key={usuario.id} className="contents">
                    <div className="sticky left-0 z-10 bg-background border-r border-b p-4 flex items-center gap-3 min-h-[92px]">
                      <span className={cn("h-2.5 w-2.5 rounded-full", colorDot)} />
                      <span className="text-sm leading-5">{getUserLabel(usuario)}</span>
                    </div>

                    {horas.map((hora) => {
                      const card = oportunidadesAsignadas.find(
                        (r) =>
                          String(r?.asignado_a ?? "") === String(usuario.id) &&
                          getHoraLabel(r?.hora_agenda) === hora
                      );

                      return (
                        <div
                          key={`${usuario.id}-${hora}`}
                          className="border-b border-r min-h-[92px] p-1"
                        >
                          {card ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  type="button"
                                  onClick={() => onOpenOportunidad?.(card)}
                                  className="rounded-md border bg-white p-2 text-xs shadow-sm h-full w-full text-left transition hover:bg-slate-50"
                                  style={{
                                    borderTop: `4px solid ${
                                      String(card?.etapa_name || "").toLowerCase().includes("no llegó") ||
                                      String(card?.etapa_name || "").toLowerCase().includes("no llego")
                                        ? "#ef4444"
                                        : "#10b981"
                                    }`,
                                  }}
                                >
                                  <div className="font-bold truncate">
                                    {card.oportunidad_id}
                                  </div>
                                  <div className="truncate">{card.cliente_name || ""}</div>
                                  <div>{getHoraLabel(card.hora_agenda) || "-"}</div>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-[320px]">
                                {renderTooltipContent(card)}
                              </TooltipContent>
                            </Tooltip>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                );
              })}

              <div className="sticky left-0 z-10 bg-background border-r p-4 flex items-center gap-3 min-h-[92px]">
                <span className="text-red-500 text-xl">◔</span>
                <span className="text-sm">No llegó</span>
              </div>

              {horas.map((hora) => {
                const items = noLlegaron.filter((r) => getHoraLabel(r?.hora_agenda) === hora);

                return (
                  <div key={`no-llego-${hora}`} className="border-r p-1 min-h-[92px]">
                    <div className="space-y-1">
                      {items.map((card) => (
                        <Tooltip key={card.id}>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onOpenOportunidad?.(card)}
                              className="rounded-md border bg-white p-2 text-xs shadow-sm w-full text-left transition hover:bg-slate-50"
                              style={{ borderTop: "4px solid #ef4444" }}
                            >
                              <div className="font-bold truncate">{card.oportunidad_id}</div>
                              <div className="truncate">{card.cliente_name || ""}</div>
                              <div className="font-semibold uppercase">NO LLEGÓ</div>
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[320px]">
                            {renderTooltipContent(card)}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
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
