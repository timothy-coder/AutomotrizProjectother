"use client";

import { Dialog,DialogContent,DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function ConfirmDeleteDialog({ open, onConfirm, onOpenChange }) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>

        ¿Eliminar registro?

        <DialogFooter>
          <Button variant="outline" onClick={()=>onOpenChange(false)}>Cancelar</Button>
          <Button variant="destructive" onClick={onConfirm}>Eliminar</Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}
