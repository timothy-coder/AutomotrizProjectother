"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";

const BRAND_PRIMARY = "#5d16ec";
const BRAND_SECONDARY = "#81929c";

export default function ConfirmDeleteDialog({
  open,
  type,
  item,
  onConfirm,
  onOpenChange,
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md w-full">
        <DialogHeader>
          <DialogTitle style={{ color: BRAND_PRIMARY }}>
            Confirmar eliminación
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <p className="text-xs sm:text-sm" style={{ color: BRAND_SECONDARY }}>
            {type === "mant"
              ? `¿Eliminar el mantenimiento "${item?.name}"?`
              : `¿Eliminar el submantenimiento "${item?.name}"?`}
          </p>

          {type === "mant" && (
            <div
              className="p-2 sm:p-3 rounded-lg border-2 flex gap-2"
              style={{
                backgroundColor: "#fef3c710",
                borderColor: "#fef3c730",
              }}
            >
              <AlertCircle
                size={16}
                className="flex-shrink-0 mt-0.5"
                style={{ color: "#b45309" }}
              />
              <p className="text-xs" style={{ color: "#92400e" }}>
                Todos los submantenimientos asociados también serán eliminados
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-auto"
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={onConfirm}
            className="h-8 sm:h-9 text-xs sm:text-sm w-full sm:w-auto"
          >
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}