"use client";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Pencil, Trash2, Package } from "lucide-react";

export default function ModelosSubTable({
  marca,
  modelos = [],
  canEdit,
  canDelete,
  onEdit,
  onDelete,
}) {
  return (
    <TooltipProvider>
      <div className="space-y-4">

        {/* Header */}
        <div className="flex items-center gap-2">
          <Package size={20} className="text-[#5d16ec]" />
          <h3 className="font-semibold text-slate-900">
            Modelos de {marca?.name}
          </h3>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 text-[#5d16ec] text-xs font-semibold">
            {modelos.length}
          </span>
        </div>

        {/* Content */}
        {modelos.length === 0 ? (
          <div className="border border-dashed rounded-lg p-6 text-center bg-slate-50">
            <div className="flex flex-col items-center gap-2 text-gray-500">
              <Package size={28} className="text-gray-300" />
              <p className="text-sm">No hay modelos registrados para esta marca</p>
            </div>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden bg-white">
            <table className="w-full text-sm">

              {/* Header */}
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="p-3 text-left font-semibold text-slate-700">Modelo</th>
                  <th className="p-3 text-left font-semibold text-slate-700">Clase</th>
                  <th className="p-3 text-right font-semibold text-slate-700">Acciones</th>
                </tr>
              </thead>

              {/* Body */}
              <tbody>
                {modelos.map((modelo, index) => (
                  <tr 
                    key={modelo.id} 
                    className={`border-b  transition-colors `}
                  >
                    {/* Nombre */}
                    <td className="p-3">
                      <span className="font-medium text-slate-900">
                        {modelo.name}
                      </span>
                    </td>

                    {/* Clase */}
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block w-2 h-2 rounded-full bg-purple-500"></span>
                        <span className="text-gray-700">
                          {modelo.clase_nombre || "—"}
                        </span>
                      </span>
                    </td>

                    {/* Acciones */}
                    <td className="p-3 text-right">
                      <div className="flex gap-1 justify-end">

                        {canEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onEdit?.(modelo)}
                              >
                                <Pencil size={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Editar modelo</TooltipContent>
                          </Tooltip>
                        )}

                        {canDelete && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => onDelete?.(modelo)}
                              >
                                <Trash2 size={16} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Eliminar modelo</TooltipContent>
                          </Tooltip>
                        )}

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        )}

        {/* Footer con información */}
        {modelos.length > 0 && (
          <div className="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg text-sm">
            <span className="text-gray-600">
              Total: <span className="font-semibold text-slate-700">{modelos.length}</span> modelo(s)
            </span>
          </div>
        )}

      </div>
    </TooltipProvider>
  );
}