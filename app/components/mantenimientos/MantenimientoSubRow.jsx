"use client";

import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

export default function MantenimientoSubRow({ item, onEdit, onDelete }) {
  return (
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border rounded-lg px-2 sm:px-3 py-2 sm:py-3 bg-white hover:bg-slate-50 transition-colors">
      <div className="flex-1 pl-6 sm:pl-8 min-w-0">
        <p className="font-medium text-sm" style={{ color: BRAND_PRIMARY }}>
          {item.name}
        </p>
        {item.description && (
          <p className="text-xs mt-0.5" style={{ color: BRAND_SECONDARY }}>
            {item.description}
          </p>
        )}
      </div>

      <div className="flex gap-1">
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
      </div>
    </div>
  );
}