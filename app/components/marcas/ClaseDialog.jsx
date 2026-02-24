"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export default function ClaseDialog({ open, onOpenChange, mode, clase, onSave }) {
  const isView = mode === "view";
  const isEdit = mode === "edit";

  const [form, setForm] = useState({ name: "" });

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

  function handleSubmit(e) {
    e.preventDefault();
    e.stopPropagation();
    if (isView) return;

    onSave?.({
      ...form,
      name: (form.name || "").trim(),
    });
  }

  const canSave = !isView && (form.name || "").trim().length > 0;

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

        {/* ✅ Enter = Guardar */}
        <form onSubmit={handleSubmit}>
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

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              {isView ? "Cerrar" : "Cancelar"}
            </Button>

            {!isView && (
              <Button type="submit" disabled={!canSave}>
                Guardar
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}