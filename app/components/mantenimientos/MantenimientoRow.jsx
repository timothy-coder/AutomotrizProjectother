"use client";

import {
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  Plus,
  AlertCircle,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

export default function MantenimientoRow({
  mantenimiento,
  expanded,
  onToggleExpand,
  onEdit,
  onDelete,
  onToggleActive,
  onAddSub,
  children,
}) {
  return (
    <div className="border-b last:border-b-0">
      <div
        className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-4 p-3 sm:p-4 hover:bg-slate-50 transition-colors ${
          Number(mantenimiento.is_active) === 0 ? "opacity-60" : ""
        }`}
      >
        <div
          className="flex items-center gap-2 sm:gap-3 flex-1 cursor-pointer w-full sm:w-auto"
          onClick={onToggleExpand}
        >
          {expanded ? (
            <ChevronDown size={18} className="flex-shrink-0" style={{ color: BRAND_PRIMARY }} />
          ) : (
            <ChevronRight size={18} className="flex-shrink-0 text-gray-400" />
          )}

          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm sm:text-base" style={{ color: BRAND_PRIMARY }}>
              {mantenimiento.name}
            </p>
            <p className="text-xs" style={{ color: BRAND_SECONDARY }}>
              {mantenimiento.items?.length || 0} submantenimiento(s)
            </p>
          </div>

          {mantenimiento.mantenimiento_id && String(mantenimiento.mantenimiento_id).trim() !== "" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="text-[10px] sm:text-[11px] px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full font-semibold flex-shrink-0 cursor-help text-white"
                  style={{ backgroundColor: BRAND_PRIMARY }}
                >
                  Con base
                </span>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Mantenimiento base: {mantenimiento.mantenimiento_id}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        <div className="flex gap-1 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 px-2 sm:px-3 py-1 bg-gray-100 rounded-lg flex-shrink-0">
                <Switch
                  checked={Number(mantenimiento.is_active) === 1}
                  onCheckedChange={(v) => onToggleActive(mantenimiento, v)}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              {Number(mantenimiento.is_active) === 1 ? "Desactivar" : "Activar"}
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="ghost" onClick={onEdit}>
                <Pencil size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Editar
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="destructive" onClick={onDelete}>
                <Trash2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Eliminar
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                className="h-8 px-2 text-white text-xs gap-1 flex-shrink-0"
                style={{ backgroundColor: BRAND_PRIMARY }}
                onClick={onAddSub}
              >
                <Plus size={14} />
                <span className="hidden sm:inline">Sub</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs">
              Agregar sub
            </TooltipContent>
          </Tooltip>
        </div>
      </div>

      {expanded && children}
    </div>
  );
}