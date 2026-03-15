"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";

function getUserLabel(item) {
  return (
    item?.fullname ||
    item?.full_name ||
    item?.username ||
    item?.name ||
    item?.nombre ||
    `ID ${item?.id}`
  );
}

export default function AssignmentDialogLead({
  open,
  onOpenChange,
  oportunidad,
  usuarios = [],
  onAssigned,
}) {
  const [loading, setLoading] = useState(false);
  const [asignadoA, setAsignadoA] = useState("");

  useEffect(() => {
    if (!open) return;

    setAsignadoA(
      oportunidad?.asignado_a != null && String(oportunidad.asignado_a).trim() !== ""
        ? String(oportunidad.asignado_a)
        : ""
    );
  }, [open, oportunidad]);

  const usuariosActivos = useMemo(() => {
    return usuarios.filter(
      (u) => Number(u?.is_active) === 1 || u?.is_active === true || u?.is_active == null
    );
  }, [usuarios]);

  async function handleSave() {
    if (!oportunidad?.id) {
      toast.error("No se encontró el lead");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`/api/leads/${oportunidad.id}/asignar`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          asignado_a: asignadoA || null,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo asignar el lead");
      }

      toast.success(data?.message || "Lead asignado correctamente");
      onAssigned?.(data);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "No se pudo asignar el lead");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!loading) onOpenChange(value);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar lead</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Código</label>
            <div className="h-10 rounded-md border px-3 flex items-center text-sm bg-muted">
              {oportunidad?.oportunidad_id || "-"}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Cliente</label>
            <div className="h-10 rounded-md border px-3 flex items-center text-sm bg-muted">
              {oportunidad?.cliente_name || "Sin cliente"}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium">Asignado a</label>
            <Select value={asignadoA} onValueChange={setAsignadoA}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar usuario" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__sin_asignar__">Sin asignar</SelectItem>
                {usuariosActivos.map((item) => (
                  <SelectItem key={item.id} value={String(item.id)}>
                    {getUserLabel(item)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancelar
          </Button>

          <Button
            onClick={() => {
              const finalValue = asignadoA === "__sin_asignar__" ? "" : asignadoA;
              setAsignadoA(finalValue);
              setTimeout(handleSave, 0);
            }}
            disabled={loading}
          >
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
