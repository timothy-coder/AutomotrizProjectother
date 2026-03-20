"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";

import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { 
  Check, 
  ChevronsUpDown,
  User,
  Car,
  Phone,
  Mail,
  MapPin,
  FileText,
  Gauge,
  Palette,
  Calendar,
  Plus,
  Info
} from "lucide-react";

import ClienteDialog from "@/app/components/clientes/ClienteDialog";
import VehiculoDialog from "@/app/components/clientes/VehiculoDialog";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function ClienteSelectCard({
  onSelect,
  initialClienteId = null,
  initialVehiculoId = null,
}) {
  const [clientes, setClientes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);

  const [clienteOpen, setClienteOpen] = useState(false);
  const [vehiculoOpen, setVehiculoOpen] = useState(false);

  const [selectedCliente, setSelectedCliente] = useState(null);
  const [selectedVehiculo, setSelectedVehiculo] = useState(null);

  const [clienteDialog, setClienteDialog] = useState({
    open: false,
    mode: "create",
    data: null,
  });

  const [vehiculoDialog, setVehiculoDialog] = useState({
    open: false,
    mode: "create",
    data: null,
  });

  useEffect(() => {
    (async () => {
      try {
        const cRes = await fetch("/api/clientes", { cache: "no-store" });
        const cJson = await cRes.json();
        setClientes(Array.isArray(cJson) ? cJson : []);

        const vRes = await fetch("/api/vehiculos", { cache: "no-store" });
        const vJson = await vRes.json();
        setVehiculos(Array.isArray(vJson) ? vJson : []);
      } catch (e) {
        console.error(e);
        toast.error("Error cargando clientes/vehículos");
        setClientes([]);
        setVehiculos([]);
      }
    })();
  }, []);

  const vehiculosVisibles = useMemo(() => {
    if (!selectedCliente?.id) return vehiculos;
    return vehiculos.filter(
      (v) => Number(v.cliente_id) === Number(selectedCliente.id)
    );
  }, [vehiculos, selectedCliente]);

  function emitir(cliente, vehiculo) {
    onSelect?.({
      cliente: cliente || null,
      vehiculo: vehiculo || null,
    });
  }

  function pickCliente(c) {
    setSelectedCliente(c);
    setSelectedVehiculo(null);
    setClienteOpen(false);
    emitir(c, null);
  }

  function pickVehiculo(v) {
    const cliente = clientes.find(
      (c) => Number(c.id) === Number(v.cliente_id)
    );

    setSelectedVehiculo(v);
    setSelectedCliente(cliente || null);
    setVehiculoOpen(false);
    emitir(cliente || null, v);
  }

  // 🔥 sincronizar selección inicial correctamente
  useEffect(() => {
    if (!clientes.length && !vehiculos.length) return;
    if (!initialClienteId && !initialVehiculoId) return;

    let nextVehiculo = null;
    let nextCliente = null;

    if (initialVehiculoId) {
      nextVehiculo =
        vehiculos.find((v) => Number(v.id) === Number(initialVehiculoId)) || null;
    }

    if (nextVehiculo) {
      nextCliente =
        clientes.find((c) => Number(c.id) === Number(nextVehiculo.cliente_id)) || null;
    } else if (initialClienteId) {
      nextCliente =
        clientes.find((c) => Number(c.id) === Number(initialClienteId)) || null;
    }

    const sameCliente =
      Number(selectedCliente?.id || 0) === Number(nextCliente?.id || 0);

    const sameVehiculo =
      Number(selectedVehiculo?.id || 0) === Number(nextVehiculo?.id || 0);

    if (!sameCliente) {
      setSelectedCliente(nextCliente || null);
    }

    if (!sameVehiculo) {
      setSelectedVehiculo(nextVehiculo || null);
    }

    if (!sameCliente || !sameVehiculo) {
      emitir(nextCliente || null, nextVehiculo || null);
    }
  }, [
    clientes,
    vehiculos,
    initialClienteId,
    initialVehiculoId,
    selectedCliente?.id,
    selectedVehiculo?.id,
  ]);

  const clienteLabel = selectedCliente
    ? `${selectedCliente.nombre ?? ""} ${selectedCliente.apellido ?? ""}`.trim()
    : "Seleccionar cliente...";

  const vehiculoLabel = selectedVehiculo
    ? `${selectedVehiculo.placas ?? selectedVehiculo.placa ?? "-"}${
        selectedVehiculo.vin ? ` · VIN: ${selectedVehiculo.vin}` : ""
      }`
    : "Seleccionar vehículo...";

  async function handleSaveCliente(data) {
    const method = clienteDialog.mode === "edit" ? "PUT" : "POST";
    const url =
      clienteDialog.mode === "edit"
        ? `/api/clientes/${clienteDialog.data.id}`
        : `/api/clientes`;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json?.message || "Error al guardar cliente");
        return;
      }

      toast.success("Cliente guardado");
      setClienteDialog({ open: false, mode: "create", data: null });

      const cRes = await fetch("/api/clientes", { cache: "no-store" });
      const cJson = await cRes.json();
      setClientes(Array.isArray(cJson) ? cJson : []);
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar cliente");
    }
  }

  async function handleSaveVehiculo(data) {
    if (!selectedCliente) {
      toast.warning("Primero seleccione un cliente");
      return;
    }

    const method = vehiculoDialog.mode === "edit" ? "PUT" : "POST";
    const url =
      vehiculoDialog.mode === "edit"
        ? `/api/vehiculos/${vehiculoDialog.data.id}`
        : `/api/vehiculos`;

    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          cliente_id: selectedCliente.id,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        toast.error(json?.message || "Error al guardar vehículo");
        return;
      }

      toast.success("Vehículo guardado");
      setVehiculoDialog({ open: false, mode: "create", data: null });

      const vRes = await fetch("/api/vehiculos", { cache: "no-store" });
      const vJson = await vRes.json();
      setVehiculos(Array.isArray(vJson) ? vJson : []);
    } catch (err) {
      console.error(err);
      toast.error("Error al guardar vehículo");
    }
  }

  return (
    <TooltipProvider>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
          <div className="flex items-center gap-2">
            <User size={24} className="text-blue-600" />
            <h2 className="font-semibold text-lg text-slate-900">Cliente y Vehículo</h2>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">

          {/* CLIENTE */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <User size={16} className="text-blue-600" />
              <label className="text-sm font-semibold text-slate-900">Cliente</label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={14} className="text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  Selecciona un cliente existente o crea uno nuevo
                </TooltipContent>
              </Tooltip>
            </div>

            <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={clienteOpen}
                  className="w-full justify-between h-10"
                >
                  <span className="truncate text-slate-900">
                    {clienteLabel}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Buscar por nombre, celular..." />
                  <CommandList>
                    <CommandEmpty>Sin resultados</CommandEmpty>

                    <CommandGroup heading="Clientes disponibles">
                      {clientes.length > 0 ? (
                        clientes.map((c) => {
                          const label = `${c.nombre ?? ""} ${c.apellido ?? ""}`.trim();
                          const selected =
                            Number(selectedCliente?.id) === Number(c.id);

                          return (
                            <CommandItem
                              key={c.id}
                              value={`${label} ${c.celular ?? ""}`.toLowerCase()}
                              onSelect={() => pickCliente(c)}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selected ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col flex-1">
                                <span className="font-medium text-slate-900">
                                  {label || "—"}
                                </span>
                                <span className="text-xs text-slate-600">
                                  Cel: {c.celular || "-"}
                                </span>
                              </div>
                            </CommandItem>
                          );
                        })
                      ) : (
                        <CommandEmpty>No hay clientes disponibles</CommandEmpty>
                      )}
                    </CommandGroup>

                    <CommandGroup heading="Acciones">
                      <CommandItem
                        onSelect={() =>
                          setClienteDialog({ open: true, mode: "create", data: null })
                        }
                        className="cursor-pointer"
                      >
                        <Plus size={16} className="mr-2 text-green-600" />
                        <span className="text-green-600 font-medium">Agregar cliente</span>
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          {/* VEHÍCULO */}
          <div className="space-y-2">
            <div className="flex items-center gap-1">
              <Car size={16} className="text-green-600" />
              <label className="text-sm font-semibold text-slate-900">Vehículo</label>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info size={14} className="text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="top">
                  Selecciona un vehículo del cliente o registra uno nuevo
                </TooltipContent>
              </Tooltip>
            </div>

            <Popover open={vehiculoOpen} onOpenChange={setVehiculoOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  role="combobox"
                  aria-expanded={vehiculoOpen}
                  className="w-full justify-between h-10"
                  disabled={!selectedCliente}
                >
                  <span className="truncate text-slate-900">
                    {vehiculoLabel}
                  </span>
                  <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50 flex-shrink-0" />
                </Button>
              </PopoverTrigger>

              <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                <Command>
                  <CommandInput placeholder="Buscar por placa o VIN..." />
                  <CommandList>
                    <CommandEmpty>
                      {selectedCliente
                        ? "Sin vehículos para este cliente"
                        : "Selecciona un cliente primero"}
                    </CommandEmpty>

                    {vehiculosVisibles.length > 0 && (
                      <CommandGroup
                        heading={
                          selectedCliente
                            ? `Vehículos de ${selectedCliente.nombre}`
                            : "Vehículos"
                        }
                      >
                        {vehiculosVisibles.map((v) => {
                          const label = `${v.placas ?? v.placa ?? "-"}${
                            v.vin ? ` · VIN: ${v.vin}` : ""
                          }`;

                          const selected =
                            Number(selectedVehiculo?.id) === Number(v.id);

                          const filterValue = `${v.placas ?? ""} ${v.placa ?? ""} ${
                            v.vin ?? ""
                          } ${v.cliente_nombre ?? ""}`.toLowerCase();

                          return (
                            <CommandItem
                              key={v.id}
                              value={filterValue}
                              onSelect={() => pickVehiculo(v)}
                              className="cursor-pointer"
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  selected ? "opacity-100" : "opacity-0"
                                )}
                              />
                              <div className="flex flex-col flex-1">
                                <span className="font-medium text-slate-900">
                                  {label}
                                </span>
                                <span className="text-xs text-slate-600">
                                  {v.marca_nombre} {v.modelo_nombre}
                                </span>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    )}

                    <CommandGroup heading="Acciones">
                      <CommandItem
                        onSelect={() =>
                          setVehiculoDialog({ open: true, mode: "create", data: null })
                        }
                        className="cursor-pointer"
                      >
                        <Plus size={16} className="mr-2 text-green-600" />
                        <span className="text-green-600 font-medium">Agregar vehículo</span>
                      </CommandItem>
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>

            {!selectedCliente && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 p-2 rounded">
                Selecciona un cliente primero para registrar vehículos
              </p>
            )}
          </div>

          {/* RESUMEN */}
          {(selectedCliente || selectedVehiculo) && (
            <div className="space-y-4 pt-4 border-t">
              
              {/* Cliente */}
              {selectedCliente && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <User size={16} className="text-blue-600" />
                    Datos del cliente
                  </div>

                  <div className="text-sm space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium min-w-[80px]">Nombre:</span>
                      <span className="text-slate-900">
                        {selectedCliente.nombre} {selectedCliente.apellido}
                      </span>
                    </div>

                    {selectedCliente.celular && (
                      <div className="flex items-center gap-2">
                        <Phone size={14} className="text-blue-600 min-w-[80px]" />
                        <span className="text-slate-900">{selectedCliente.celular}</span>
                      </div>
                    )}

                    {(selectedCliente.email || selectedCliente.correo) && (
                      <div className="flex items-center gap-2">
                        <Mail size={14} className="text-blue-600 min-w-[80px]" />
                        <span className="text-slate-900">
                          {selectedCliente.email || selectedCliente.correo}
                        </span>
                      </div>
                    )}

                    {selectedCliente.dni && (
                      <div className="flex items-center gap-2">
                        <FileText size={14} className="text-blue-600 min-w-[80px]" />
                        <span className="text-slate-900">{selectedCliente.dni}</span>
                      </div>
                    )}

                    {selectedCliente.direccion && (
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-blue-600 min-w-[80px]" />
                        <span className="text-slate-900">{selectedCliente.direccion}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Vehículo */}
              {selectedVehiculo && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg space-y-2">
                  <div className="font-semibold text-slate-900 flex items-center gap-2">
                    <Car size={16} className="text-green-600" />
                    Datos del vehículo
                  </div>

                  <div className="text-sm space-y-1 grid grid-cols-2 gap-2">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-600 text-xs">Placa:</span>
                      <span className="text-slate-900 font-semibold">
                        {selectedVehiculo.placa || selectedVehiculo.placas || "-"}
                      </span>
                    </div>

                    {selectedVehiculo.vin && (
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-600 text-xs">VIN:</span>
                        <span className="text-slate-900 text-xs font-mono">
                          {selectedVehiculo.vin}
                        </span>
                      </div>
                    )}

                    {selectedVehiculo.marca_nombre && (
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-600 text-xs">Marca:</span>
                        <span className="text-slate-900">
                          {selectedVehiculo.marca_nombre}
                        </span>
                      </div>
                    )}

                    {selectedVehiculo.modelo_nombre && (
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-600 text-xs">Modelo:</span>
                        <span className="text-slate-900">
                          {selectedVehiculo.modelo_nombre}
                        </span>
                      </div>
                    )}

                    {selectedVehiculo.anio && (
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-600 text-xs">Año:</span>
                        <span className="text-slate-900 flex items-center gap-1">
                          <Calendar size={12} />
                          {selectedVehiculo.anio}
                        </span>
                      </div>
                    )}

                    {selectedVehiculo.color && (
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-600 text-xs">Color:</span>
                        <span className="text-slate-900 flex items-center gap-1">
                          <Palette size={12} />
                          {selectedVehiculo.color}
                        </span>
                      </div>
                    )}

                    {selectedVehiculo.kilometraje && (
                      <div className="flex flex-col">
                        <span className="font-medium text-slate-600 text-xs">Km:</span>
                        <span className="text-slate-900 flex items-center gap-1">
                          <Gauge size={12} />
                          {selectedVehiculo.kilometraje}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

            </div>
          )}

        </CardContent>
      </Card>

      <ClienteDialog
        open={clienteDialog.open}
        mode={clienteDialog.mode}
        cliente={clienteDialog.data}
        onSave={handleSaveCliente}
        onOpenChange={(v) =>
          setClienteDialog((prev) => ({ ...prev, open: v }))
        }
      />

      <VehiculoDialog
        open={vehiculoDialog.open}
        mode={vehiculoDialog.mode}
        vehiculo={vehiculoDialog.data}
        onSave={handleSaveVehiculo}
        onOpenChange={(v) =>
          setVehiculoDialog((prev) => ({ ...prev, open: v }))
        }
      />
    </TooltipProvider>
  );
}