"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ClaseDialog({ open, onOpenChange, mode, clase, onSave }) {
  const isView = mode === "view";
  const isEdit = mode === "edit";

  const [form, setForm] = useState({
    name: "",
  });

  useEffect(() => {
    if (clase) {
      setForm({
        id: clase.id,
        name: clase.name || "",
      });
    } else {
      setForm({ name: "" });
    }
  }, [clase]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function save() {
    if (isView) return;
    onSave?.(form);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full overflow-hidden">
        <DialogHeader>
          <DialogTitle>
            {isView ? "Ver clase" : isEdit ? "Editar clase" : "Nueva clase"}
          </DialogTitle>
          <DialogDescription>
            {isView ? "Solo lectura." : "Completa la información y guarda."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <div>
            <Label>Nombre</Label>
            <Input
              disabled={isView}
              value={form.name || ""}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {isView ? "Cerrar" : "Cancelar"}
          </Button>
          {!isView && <Button onClick={save}>Guardar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}