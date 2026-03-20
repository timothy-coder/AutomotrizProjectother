"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, User, Building2, Layers, AlertCircle } from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

      const res = await fetch(`/api/oportunidades/${oportunidad.id}/asignar`, {
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
    } catch (error) {
      console.error(error);
      toast.error(error.message || "No se pudo asignar");
    } finally {
      setLoading(false);
    }
  }

  const cambioAsignacion = usuarioId !== (oportunidad?.asignado_a != null ? String(oportunidad.asignado_a) : "");

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={(value) => !loading && onOpenChange(value)}>
        <DialogContent className="max-w-md">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl">Asignar oportunidad</DialogTitle>
            <p className="text-sm text-slate-600">Selecciona un usuario para asignar esta oportunidad</p>
          </DialogHeader>

          <div className="space-y-4">
            {/* INFORMACIÓN DE LA OPORTUNIDAD */}
            <div className="rounded-lg border border-slate-200 bg-gradient-to-br from-slate-50 to-slate-100 p-4 space-y-3">
              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <AlertCircle size={16} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-600">Código</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="font-mono font-semibold text-blue-600 cursor-help truncate">
                          {oportunidad?.oportunidad_id || "-"}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {oportunidad?.oportunidad_id || "Sin código"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
                    <Building2 size={16} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-600">Cliente</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <p className="font-medium text-slate-900 cursor-help truncate">
                          {oportunidad?.cliente_name || "-"}
                        </p>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        {oportunidad?.cliente_name || "Sin cliente"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
                    <Layers size={16} className="text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-600">Etapa</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-block">
                          <span className="inline-block px-2 py-1 rounded-md text-xs font-semibold bg-indigo-100 text-indigo-700 cursor-help">
                            {oportunidad?.etapa_name || "-"}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Etapa: {oportunidad?.etapa_name || "Sin etapa"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-2">
                <div className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <User size={16} className="text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-600">Asignado actual</p>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="inline-block">
                          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium cursor-help ${
                            oportunidad?.asignado_a ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600"
                          }`}>
                            {oportunidad?.asignado_a_name || "Sin asignar"}
                          </span>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="top">
                        Actualmente asignado a: {oportunidad?.asignado_a_name || "nadie"}
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              </div>
            </div>

            {/* SELECTOR DE USUARIO */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-semibold text-slate-900">
                  Nuevo usuario asignado
                </label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="text-xs text-slate-500 cursor-help">
                      ({usuariosActivos.length} disponibles)
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Usuarios activos disponibles para asignación
                  </TooltipContent>
                </Tooltip>
              </div>

              <Popover open={userSearchOpen} onOpenChange={setUserSearchOpen}>
                <PopoverTrigger asChild>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button 
                        variant="outline" 
                        role="combobox" 
                        className="w-full justify-between h-10 bg-white border-slate-300 hover:bg-slate-50"
                      >
                        <span className="truncate text-left">
                          {usuarioSeleccionado ? (
                            <span className="flex items-center gap-2">
                              <div className="h-6 w-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-semibold text-blue-700">
                                {getUserLabel(usuarioSeleccionado).charAt(0).toUpperCase()}
                              </div>
                              {getUserLabel(usuarioSeleccionado)}
                            </span>
                          ) : (
                            "Seleccionar usuario"
                          )}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Haz clic para seleccionar un usuario
                    </TooltipContent>
                  </Tooltip>
                </PopoverTrigger>

                <PopoverContent className="w-[350px] p-0">
                  <Command>
                    <CommandInput 
                      placeholder="Buscar por nombre o email..." 
                      className="text-sm"
                    />
                    <CommandList className="max-h-[300px]">
                      <CommandEmpty className="text-center py-6 text-sm text-slate-600">
                        No se encontraron usuarios.
                      </CommandEmpty>
                      <CommandGroup className="overflow-hidden">
                        <CommandItem
                          value="__sin_asignar__"
                          onSelect={() => {
                            setUsuarioId("");
                            setUserSearchOpen(false);
                          }}
                          className="cursor-pointer aria-selected:bg-blue-50"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 flex-shrink-0",
                              usuarioId === "" ? "opacity-100" : "opacity-0"
                            )}
                          />
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">Sin asignar</p>
                            <p className="text-xs text-slate-500">Dejar sin asignación</p>
                          </div>
                        </CommandItem>

                        {usuariosActivos.map((u) => {
                          const label = getUserLabel(u);
                          const email = u.email || "";

                          return (
                            <CommandItem
                              key={u.id}
                              value={`${label} ${email}`}
                              onSelect={() => {
                                setUsuarioId(String(u.id));
                                setUserSearchOpen(false);
                              }}
                              className="cursor-pointer aria-selected:bg-blue-50"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4 flex-shrink-0",
                                  String(usuarioId) === String(u.id) ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex-1">
                                <p className="font-medium text-slate-900">{label}</p>
                                {email && (
                                  <p className="text-xs text-slate-500">{email}</p>
                                )}
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* CAMBIO DE ASIGNACIÓN */}
            {cambioAsignacion && (
              <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 flex gap-2">
                <AlertCircle size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-700">
                  <p className="font-semibold">Cambio de asignación</p>
                  <p className="mt-1">
                    Se cambiará de <span className="font-medium">{oportunidad?.asignado_a_name || "sin asignar"}</span> a{" "}
                    <span className="font-medium">{usuarioSeleccionado ? getUserLabel(usuarioSeleccionado) : "sin asignar"}</span>
                  </p>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  onClick={() => onOpenChange(false)} 
                  disabled={loading}
                  className="gap-2"
                >
                  Cancelar
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Cerrar sin guardar cambios</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleSave} 
                  disabled={loading || !cambioAsignacion}
                  className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? "Guardando..." : "Guardar asignación"}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {!cambioAsignacion ? "Selecciona un usuario diferente" : "Guardar la nueva asignación"}
              </TooltipContent>
            </Tooltip>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}