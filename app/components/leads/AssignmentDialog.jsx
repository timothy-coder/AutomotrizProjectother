"use client";

import { useState } from "react";
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
import { Loader2 } from "lucide-react";

export default function AssignmentDialog({
  open,
  onOpenChange,
  lead,
  usuarios,
  onAssigned,
}) {
  const [asignado_a, setAsignado_a] = useState("");
  const [loading, setLoading] = useState(false);

  if (!lead) return null;

  async function handleAssign() {
    if (!asignado_a) {
      toast.warning("Selecciona un usuario");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch(`/api/leads/${lead.id}/asignar`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          asignado_a: asignado_a === "sin-asignar" ? null : Number(asignado_a),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "Error asignando lead");
      }

      toast.success("Lead asignado correctamente");
      onAssigned?.();
      onOpenChange(false);
      setAsignado_a("");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error asignando lead");
    } finally {
      setLoading(false);
    }
  }

  const usuariosActivos = usuarios.filter(
    (u) => Number(u.is_active) === 1 || u.is_active === true
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Asignar Lead</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              Lead: <span className="font-semibold">{lead.oportunidad_id || `LD-${lead.id}`}</span>
            </p>
            <p className="text-sm text-muted-foreground">
              Selecciona el usuario a asignar
            </p>
          </div>

          <Select value={asignado_a} onValueChange={setAsignado_a} disabled={loading}>
            <SelectTrigger>
              <SelectValue placeholder="Buscar usuario..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sin-asignar">Sin asignar</SelectItem>
              {usuariosActivos.map((usuario) => (
                <SelectItem key={usuario.id} value={String(usuario.id)}>
                  {usuario.fullname || usuario.username}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
            onClick={handleAssign}
            disabled={loading || !asignado_a}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Asignando...
              </>
            ) : (
              "Asignar"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}