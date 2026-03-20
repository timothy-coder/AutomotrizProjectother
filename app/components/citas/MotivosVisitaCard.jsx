"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Trash2, 
  Plus,
  Info,
  CheckCircle,
  Zap
} from "lucide-react";

export default function MotivosVisitaCard({ value = [], onChange }) {
  const [motivos, setMotivos] = useState([]);

  useEffect(() => {
    fetch("/api/motivos_citas?active=1", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setMotivos(Array.isArray(data) ? data : []))
      .catch((e) => {
        console.log(e);
        setMotivos([]);
      });
  }, []);

  function updateRow(i, data) {
    const copy = [...value];
    copy[i] = { ...copy[i], ...data };
    onChange(copy);
  }

  async function fetchSubmotivos(motivoId) {
    if (!motivoId) return [];

    try {
      const subs = await fetch(
        `/api/submotivos-citas?motivo_id=${motivoId}&active=1`,
        { cache: "no-store" }
      ).then((r) => r.json());

      return Array.isArray(subs) ? subs : [];
    } catch (e) {
      console.log(e);
      return [];
    }
  }

  async function cargarSubmotivos(motivoId, i) {
    const subs = await fetchSubmotivos(motivoId);

    updateRow(i, {
      motivo_id: Number(motivoId),
      submotivos: subs,
      submotivo_id: null,
    });
  }

  // 🔥 cargar submotivos iniciales cuando entras a editar
  useEffect(() => {
    if (!value.length) return;

    value.forEach(async (row, i) => {
      if (row?.motivo_id && (!Array.isArray(row.submotivos) || row.submotivos.length === 0)) {
        const subs = await fetchSubmotivos(row.motivo_id);

        const stillSameRow =
          value[i] && Number(value[i].motivo_id) === Number(row.motivo_id);

        if (!stillSameRow) return;

        updateRow(i, {
          submotivos: subs,
          submotivo_id: row.submotivo_id ?? null,
        });
      }
    });
  }, [value.length]);

  function addRow() {
    onChange([
      ...value,
      { motivo_id: null, submotivo_id: null, submotivos: [] },
    ]);
  }

  function removeRow(i) {
    const copy = [...value];
    copy.splice(i, 1);
    onChange(copy);
  }

  const getMotivoNombre = (motivoId) => {
    return motivos.find(m => Number(m.id) === Number(motivoId))?.nombre || "-";
  };

  const getSubmotivoNombre = (row) => {
    return row.submotivos?.find(sm => Number(sm.id) === Number(row.submotivo_id))?.nombre || "-";
  };

  return (
    <TooltipProvider>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-orange-50 border-b">
          <div className="flex items-center gap-2">
            <Zap size={24} className="text-orange-600" />
            <div>
              <h2 className="font-semibold text-lg text-slate-900">Motivo de visita</h2>
              <p className="text-xs text-gray-600 mt-1">Paso 2 - Define los motivos por los que el cliente visita</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 pt-6">
          
          {/* LISTA DE MOTIVOS */}
          {value.length > 0 ? (
            <div className="space-y-3">
              {value.map((row, i) => (
                <div
                  key={`motivo-${i}-${row.motivo_id ?? "new"}`}
                  className="p-4 border border-slate-200 rounded-lg bg-slate-50 hover:bg-white transition-colors"
                >
                  <div className="grid md:grid-cols-[1fr_1fr_auto] gap-3 items-end">
                    
                    {/* MOTIVO */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <label className="text-sm font-semibold text-slate-900">
                          Motivo
                        </label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info size={14} className="text-gray-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Selecciona la razón principal de la visita del cliente
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      <Select
                        value={row.motivo_id ? String(row.motivo_id) : ""}
                        onValueChange={(v) => {
                          updateRow(i, {
                            motivo_id: Number(v),
                            submotivo_id: null,
                            submotivos: [],
                          });

                          cargarSubmotivos(v, i);
                        }}
                      >
                        <SelectTrigger className="h-9 bg-white">
                          <SelectValue placeholder="Seleccione motivo" />
                        </SelectTrigger>
                        <SelectContent>
                          {motivos.map((m) => (
                            <SelectItem key={m.id} value={String(m.id)}>
                              {m.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* SUBMOTIVO */}
                    <div className="space-y-2">
                      <div className="flex items-center gap-1">
                        <label className="text-sm font-semibold text-slate-900">
                          Detalle
                        </label>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info size={14} className="text-gray-400 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Especifica el detalle dentro del motivo seleccionado
                          </TooltipContent>
                        </Tooltip>
                      </div>

                      <Select
                        value={row.submotivo_id ? String(row.submotivo_id) : ""}
                        onValueChange={(v) =>
                          updateRow(i, { submotivo_id: Number(v) })
                        }
                        disabled={!row.motivo_id || !row.submotivos?.length}
                      >
                        <SelectTrigger className="h-9 bg-white">
                          <SelectValue
                            placeholder={
                              row.motivo_id
                                ? row.submotivos?.length
                                  ? "Seleccione detalle"
                                  : "Sin opciones disponibles"
                                : "Seleccione primero un motivo"
                            }
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {row.submotivos?.map((sm) => (
                            <SelectItem key={sm.id} value={String(sm.id)}>
                              {sm.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* ELIMINAR FILA */}
                    <div className="flex gap-1">
                      {value.length > 1 && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeRow(i)}
                              className="hover:bg-red-100 hover:text-red-700 h-9"
                            >
                              <Trash2 size={16} />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            Eliminar este motivo
                          </TooltipContent>
                        </Tooltip>
                      )}

                      {/* INDICADOR DE COMPLETO */}
                      {row.motivo_id && row.submotivo_id && (
                        <div className="flex items-center justify-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <CheckCircle 
                                size={20} 
                                className="text-green-600"
                              />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Motivo completado
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* RESUMEN SI ESTÁ COMPLETO */}
                  {row.motivo_id && row.submotivo_id && (
                    <div className="mt-3 pt-3 border-t border-slate-200 flex items-center gap-2 text-sm">
                      <CheckCircle size={14} className="text-green-600 flex-shrink-0" />
                      <span className="text-slate-900 font-medium">
                        {getMotivoNombre(row.motivo_id)} • {getSubmotivoNombre(row)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
              <Info size={18} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-900">
                  Sin motivos agregados
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Agrega al menos un motivo para continuar
                </p>
              </div>
            </div>
          )}

          {/* AGREGAR MOTIVO */}
          <div className="pt-2 border-t">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={addRow}
                  className="gap-2 w-full md:w-auto"
                >
                  <Plus size={16} />
                  Agregar motivo
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Agrega otro motivo de visita
              </TooltipContent>
            </Tooltip>
          </div>

          {/* INFO BOX */}
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 text-xs">
            <Info size={14} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <p className="text-amber-700">
              Puedes agregar múltiples motivos si el cliente requiere varios servicios en una misma visita
            </p>
          </div>

        </CardContent>
      </Card>
    </TooltipProvider>
  );
}