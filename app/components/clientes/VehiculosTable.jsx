"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ConfirmDeleteDialog from "@/app/components/clientes/ConfirmDeleteDialog";
import { Plus, Eye, Pencil, Trash2, Calendar, FileText } from "lucide-react";

export default function VehiculosTable({
  cliente,
  data,
  onCreate,
  onEdit,
  onDelete,
}) {
  const [delOpen, setDelOpen] = useState(false);
  const [target, setTarget] = useState(null);

  function askDelete(v) {
    setTarget(v);
    setDelOpen(true);
  }

  return (
    <TooltipProvider>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Vehículos
            </h2>
            <p className="text-sm text-gray-600">
              Cliente: <span className="font-medium">{cliente?.nombre} {cliente?.apellido || ""}</span>
            </p>
          </div>

          {onCreate && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onCreate}
                  className="bg-green-600 hover:bg-green-700 text-white gap-2 w-full sm:w-auto"
                >
                  <Plus size={16} />
                  Agregar vehículo
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Registrar nuevo vehículo</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Content */}
        {(!data || data.length === 0) ? (
          <div className="border border-dashed rounded-lg p-8 text-center">
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <FileText size={32} className="text-gray-300" />
              <p className="text-sm">
                Este cliente no tiene vehículos registrados.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {data.map((v, index) => (
              <div
                key={v.id}
                className={`border rounded-lg p-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between transition-colors hover:bg-slate-50 ${
                  index % 2 === 0 ? "bg-white" : "bg-slate-50/30"
                }`}
              >
                {/* Información del vehículo */}
                <div className="min-w-0 flex-1">
                  
                  {/* Placas y modelo */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="inline-flex items-center justify-center bg-blue-100 text-blue-700 px-3 py-1 rounded-md text-sm font-semibold">
                      {v.placas || "SIN PLACAS"}
                    </span>
                    <div className="font-medium text-slate-900 truncate">
                      {v.marca_nombre || ""} {v.modelo_nombre || ""}
                    </div>
                  </div>

                  {/* VIN */}
                  {v.vin && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="text-xs text-gray-600 truncate cursor-help flex items-center gap-1">
                          <FileText size={12} />
                          VIN: <span className="font-mono">{v.vin}</span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        Número de Identificación del Vehículo
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Última visita */}
                  {v.fecha_ultima_visita && (
                    <div className="text-xs text-gray-600 flex items-center gap-1 mt-1">
                      <Calendar size={12} />
                      Última visita: {new Date(v.fecha_ultima_visita).toLocaleDateString('es-ES', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </div>
                  )}

                </div>

                {/* Acciones */}
                <div className="flex gap-1 justify-end flex-shrink-0">
                  
                  {onEdit && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="hover:bg-amber-100 hover:text-amber-700"
                          onClick={() => onEdit(v)}
                        >
                          <Pencil size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Editar vehículo</TooltipContent>
                    </Tooltip>
                  )}

                  {onDelete && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="hover:bg-red-100 hover:text-red-700"
                          onClick={() => askDelete(v)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Eliminar vehículo</TooltipContent>
                    </Tooltip>
                  )}

                </div>

              </div>
            ))}
          </div>
        )}

        {/* Footer con contador */}
        {data && data.length > 0 && (
          <div className="flex items-center justify-between px-1 py-2 bg-slate-50 rounded-lg">
            <span className="text-sm text-gray-600">
              Total de vehículos: <span className="font-semibold text-slate-700">{data.length}</span>
            </span>
          </div>
        )}

        {/* CONFIRM DELETE */}
        <ConfirmDeleteDialog
          open={delOpen}
          onOpenChange={setDelOpen}
          title="Eliminar vehículo"
          description={
            target ? (
              <>
                ¿Eliminar el vehículo{" "}
                <b>{target.placas || target.vin || `#${target.id}`}</b> 
                {target.marca_nombre && target.modelo_nombre && (
                  <>
                    {" "}<span className="text-gray-600">({target.marca_nombre} {target.modelo_nombre})</span>
                  </>
                )}
                ?
              </>
            ) : null
          }
          onConfirm={() => {
            if (!target) return;
            onDelete?.(target);
            setDelOpen(false);
            setTarget(null);
          }}
        />

      </div>
    </TooltipProvider>
  );
}