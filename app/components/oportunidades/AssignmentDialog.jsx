"use client";

import { useEffect, useState } from "react";
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

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Info, Loader } from "lucide-react";

function getLabel(item) {
  return (
    item?.fullname ||
    item?.full_name ||
    item?.name ||
    item?.nombre ||
    item?.razon_social ||
    item?.description ||
    `ID ${item?.id}`
  );
}

export default function AssignmentDialog({
  open,
  onOpenChange,
  oportunidad,
  usuarios,
  onAssigned,
}) {
  const [selectedUsuario, setSelectedUsuario] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && oportunidad) {
      setSelectedUsuario(oportunidad.asignado_a ? String(oportunidad.asignado_a) : "");
    }
  }, [open, oportunidad]);

  const usuariosActivos = usuarios.filter(
    (u) => Number(u.is_active) === 1 || u.is_active === true
  );

  async function handleAsignar() {
    if (!selectedUsuario) {
      toast.warning("Selecciona un usuario");
      return;
    }

    if (!oportunidad?.id) {
      toast.error("No se encontró la oportunidad");
      return;
    }

    try {
      setLoading(true);

      // Primero, obtener la etapa "Asignado"
      const etapasRes = await fetch("/api/etapasconversion", {
        cache: "no-store",
      });
      const etapas = await etapasRes.json();

      const etapaAsignado = etapas.find(
        (e) =>
          String(getLabel(e)).trim().toLowerCase() === "asignado"
      );

      if (!etapaAsignado) {
        toast.error("No se encontró la etapa 'Asignado'");
        return;
      }

      // Actualizar oportunidad con el usuario y cambiar etapa a "Asignado"
      const res = await fetch(
        `/api/oportunidades-oportunidades/${oportunidad.id}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            asignado_a: Number(selectedUsuario),
            etapasconversion_id: etapaAsignado.id,
          }),
        }
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(
          error.message || "No se pudo asignar la oportunidad"
        );
      }

      const usuarioAsignado = usuariosActivos.find(
        (u) => String(u.id) === selectedUsuario
      );

      toast.success(
        `Oportunidad asignada a ${getLabel(usuarioAsignado)} y etapa cambiada a "Asignado"`
      );
      onAssigned?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error al asignar la oportunidad");
    } finally {
      setLoading(false);
    }
  }

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Asignar Oportunidad</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {oportunidad && (
              <div className="p-3 bg-slate-50 rounded border border-slate-200">
                <p className="text-xs text-slate-600">Oportunidad</p>
                <p className="text-sm font-semibold text-slate-900">
                  {oportunidad.oportunidad_id || `OPO-${oportunidad.id}`}
                </p>
              </div>
            )}

            <div>
              <div className="flex items-center gap-2 mb-2">
                <label className="text-sm font-medium">
                  Asignar a *
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info
                      size={14}
                      className="text-muted-foreground cursor-help"
                    />
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    Selecciona un usuario para asignar esta oportunidad.
                    La etapa cambiará automáticamente a "Asignado"
                  </TooltipContent>
                </Tooltip>
              </div>

              <Select value={selectedUsuario} onValueChange={setSelectedUsuario}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar usuario" />
                </SelectTrigger>
                <SelectContent>
                  {usuariosActivos.map((item) => (
                    <SelectItem key={item.id} value={String(item.id)}>
                      {getLabel(item)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
              <p className="font-medium mb-1">ℹ️ Información</p>
              <p>
                Al asignar esta oportunidad, la etapa será actualizada
                automáticamente a "Asignado"
              </p>
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
              onClick={handleAsignar}
              disabled={!selectedUsuario || loading}
              className="gap-2 bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader className="h-4 w-4 animate-spin" />
                  Asignando...
                </>
              ) : (
                "Asignar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}