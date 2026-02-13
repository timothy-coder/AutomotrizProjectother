"use client";

import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";

export default function ConfirmDeleteDialog({
  open,
  onOpenChange,
  item,
  onConfirm,
}) {
  if (!item) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>

        <DialogHeader>
          <DialogTitle>Eliminar</DialogTitle>
          <DialogDescription>
            ¿Seguro que deseas eliminar <b>{item.name}</b>?
            Esta acción no se puede deshacer.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>

          <Button variant="destructive" onClick={onConfirm}>
            Eliminar
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
