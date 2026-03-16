"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandItem,
  CommandList,
  CommandEmpty,
  CommandGroup,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";

function getUserLabel(u) {
  return u?.fullname || u?.username || u?.name || u?.nombre || `ID ${u?.id}`;
}

export default function AssignmentDialog({
  open,
  onOpenChange,
  oportunidad,
  usuarios,
  onAssigned,
  type = "oportunidadespv", // "oportunidadespv" o "leadspv"
}) {
  const [loading, setLoading] = useState(false);
  const [usuarioId, setUsuarioId] = useState("");
  const [userSearchOpen, setUserSearchOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    setUsuarioId(
      oportunidad?.asignado_a != null ? String(oportunidad.asignado_a) : ""
    );
  }, [open, oportunidad]);

  const usuariosActivos = useMemo(() => {
    return usuarios.filter(
      (u) =>
        Number(u?.is_active) === 1 ||
        u?.is_active === true ||
        u?.is_active == null
    );
  }, [usuarios]);

  const usuarioSeleccionado = useMemo(() => {
    return usuariosActivos.find((u) => String(u.id) === String(usuarioId)) || null;
  }, [usuariosActivos, usuarioId]);

  async function handleSave() {
    if (!oportunidad?.id) {
      toast.error("No se encontró la oportunidad");
      return;
    }

    try {
      setLoading(true);

      // Determinar la ruta según el tipo
      const endpoint = type === "leadspv" 
        ? `/api/leadspv/${oportunidad.id}/asignar`
        : `/api/oportunidadespv/${oportunidad.id}/asignar`;

      const res = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          asignado_a: usuarioId ? Number(usuarioId) : null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.message || "No se pudo asignar");
      }

      toast.success(data?.message || "Asignación actualizada");
      onAssigned?.();
      onOpenChange(false);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "No se pudo asignar");
    } finally {
      setLoading(false);
    }
  }

  const tipoLabel = type === "leadspv" ? "lead" : "oportunidad";

  return (
    <Dialog open={open} onOpenChange={(value) => !loading && onOpenChange(value)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Asignar {tipoLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border p-3 text-sm">
            <div><span className="font-medium">Código:</span> {oportunidad?.oportunidad_id || "-"}</div>
            <div><span className="font-medium">Cliente:</span> {oportunidad?.cliente_name || "-"}</div>
            <div><span className="font-medium">Vehículo:</span> {oportunidad?.modelo_name || "-"} {oportunidad?.marca_name ? `- ${oportunidad.marca_name}` : ""}</div>
            <div><span className="font-medium">Etapa:</span> {oportunidad?.etapa_name || "-"}</div>
            <div><span className="font-medium">Asignado actual:</span> {oportunidad?.asignado_a_name || "Sin asignar"}</div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Usuario asignado</label>

            <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between">
                  {usuarioSeleccionado ? getUserLabel(usuarioSeleccionado) : "Seleccionar usuario"}
                  <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[400px] p-0">
                <Command>
                  <CommandInput placeholder="Buscar usuario..." />
                  <CommandList>
                    <CommandEmpty>No se encontraron usuarios.</CommandEmpty>
                    <CommandGroup>
                      <CommandItem
                        value="__sin_asignar__"
                        onSelect={() => {
                          setUsuarioId("");
                          setUserSearchOpen(false);
                        }}
                      >
                        <Check
                          className={cn(
                            "mr-2 h-4 w-4",
                            usuarioId === "" ? "opacity-100" : "opacity-0"
                          )}
                        />
                        Sin asignar
                      </CommandItem>

                      {usuariosActivos.map((u) => {
                        const label = getUserLabel(u);

                        return (
                          <CommandItem
                            key={u.id}
                            value={`${label} ${u.email || ""}`}
                            onSelect={() => {
                              setUsuarioId(String(u.id));
                              setUserSearchOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                String(usuarioId) === String(u.id) ? "opacity-100" : "opacity-0"
                              )}
                            />
                            {label}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            Guardar asignación
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}