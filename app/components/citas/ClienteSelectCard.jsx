"use client";

import { useEffect, useMemo, useState } from "react";
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

import { Check, ChevronsUpDown } from "lucide-react";

function toArray(x) {
  if (Array.isArray(x)) return x;
  if (Array.isArray(x?.data)) return x.data;
  if (Array.isArray(x?.rows)) return x.rows;
  return [];
}

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function ClienteSelectCard({ onSelect }) {
  const [clientes, setClientes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);

  const [clienteOpen, setClienteOpen] = useState(false);
  const [vehiculoOpen, setVehiculoOpen] = useState(false);

  const [selectedCliente, setSelectedCliente] = useState(null);
  const [selectedVehiculo, setSelectedVehiculo] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const cRes = await fetch("/api/clientes", { cache: "no-store" });
        const cJson = await cRes.json();
        setClientes(toArray(cJson));

        const vRes = await fetch("/api/vehiculos", { cache: "no-store" });
        const vJson = await vRes.json();
        setVehiculos(toArray(vJson));
      } catch (e) {
        console.error(e);
        toast.error("Error cargando clientes/vehículos");
        setClientes([]);
        setVehiculos([]);
      }
    })();
  }, []);

  // (opcional) mostrar vehículos solo del cliente seleccionado.
  // Si quieres mostrar TODOS siempre, cambia esto por "vehiculos".
  const vehiculosVisibles = useMemo(() => {
    if (!selectedCliente?.id) return vehiculos;
    return vehiculos.filter(v => Number(v.cliente_id) === Number(selectedCliente.id));
  }, [vehiculos, selectedCliente]);

  function emitir(cliente, vehiculo) {
    onSelect?.(cliente, vehiculo);
  }

  function pickCliente(c) {
    setSelectedCliente(c);
    setSelectedVehiculo(null); // al cambiar cliente, limpiamos vehículo
    setClienteOpen(false);
    emitir(c, null);
  }

  function pickVehiculo(v) {
    const cliente =
      clientes.find(c => Number(c.id) === Number(v.cliente_id)) ||
      (v.cliente_id
        ? { id: v.cliente_id, nombre: v.cliente_nombre || "", apellido: "" }
        : null);

    setSelectedVehiculo(v);
    setSelectedCliente(cliente);
    setVehiculoOpen(false);

    emitir(cliente, v);
  }

  const clienteLabel = selectedCliente
    ? `${selectedCliente.nombre ?? ""} ${selectedCliente.apellido ?? ""}`.trim()
    : "Seleccionar cliente...";

  const vehiculoLabel = selectedVehiculo
    ? `${selectedVehiculo.placa ?? "-"}` + (selectedVehiculo.vin ? ` · VIN: ${selectedVehiculo.vin}` : "")
    : "Seleccionar vehículo...";

  return (
    <Card>
      <CardHeader className="font-semibold">Cliente y Vehículo</CardHeader>

      <CardContent className="space-y-4">

        {/* ===== SELECT CLIENTE (Command) ===== */}
        <div className="space-y-1">
          <div className="text-sm font-medium">Cliente</div>

          <Popover open={clienteOpen} onOpenChange={setClienteOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={clienteOpen}
                className="w-full justify-between"
              >
                <span className="truncate">{clienteLabel}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Buscar cliente..." />
                <CommandList>
                  <CommandEmpty>Sin resultados</CommandEmpty>

                  <CommandGroup heading="Clientes">
                    {clientes.map((c) => {
                      const label = `${c.nombre ?? ""} ${c.apellido ?? ""}`.trim();
                      const selected = Number(selectedCliente?.id) === Number(c.id);

                      return (
                        <CommandItem
                          key={c.id}
                          value={`${label} ${c.celular ?? ""}`.toLowerCase()}
                          onSelect={() => pickCliente(c)}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                          <div className="flex flex-col">
                            <span className="font-medium">{label || "—"}</span>
                            <span className="text-xs text-muted-foreground">
                              Cel: {c.celular || "-"}
                            </span>
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

        {/* ===== SELECT VEHICULO (Command) ===== */}
        <div className="space-y-1">
          <div className="text-sm font-medium">Vehículo</div>

          <Popover open={vehiculoOpen} onOpenChange={setVehiculoOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={vehiculoOpen}
                className="w-full justify-between"
              >
                <span className="truncate">{vehiculoLabel}</span>
                <ChevronsUpDown className="ml-2 h-4 w-4 opacity-50" />
              </Button>
            </PopoverTrigger>

            <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
              <Command>
                <CommandInput placeholder="Buscar por placa o VIN..." />
                <CommandList>
                  <CommandEmpty>Sin resultados</CommandEmpty>

                  <CommandGroup heading={selectedCliente ? "Vehículos del cliente" : "Vehículos"}>
                    {vehiculosVisibles.map((v) => {
                      const label =
                        `${v.placa ?? "-"}` + (v.vin ? ` · VIN: ${v.vin}` : "");
                      const selected = Number(selectedVehiculo?.id) === Number(v.id);

                      // value es lo que el Command usa para filtrar
                      const filterValue = `${v.placa ?? ""} ${v.vin ?? ""} ${v.cliente_nombre ?? ""}`.toLowerCase();

                      return (
                        <CommandItem
                          key={v.id}
                          value={filterValue}
                          onSelect={() => pickVehiculo(v)}
                        >
                          <Check className={cn("mr-2 h-4 w-4", selected ? "opacity-100" : "opacity-0")} />
                          <div className="flex flex-col">
                            <span className="font-medium">{label}</span>
                            <span className="text-xs text-muted-foreground">
                              Cliente: {v.cliente_nombre || v.nombre_cliente || "-"}
                            </span>
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

        {/* ===== RESUMEN ===== */}
        {/* ===== FICHA COMPLETA ===== */}
{(selectedCliente || selectedVehiculo) && (
  <div className="bg-muted p-4 rounded-lg text-sm space-y-4">

    {/* CLIENTE */}
    {selectedCliente && (
      <div>
        <div className="font-semibold mb-1 text-base">
          Datos del cliente
        </div>

        <div><b>Nombre:</b> {selectedCliente.nombre} {selectedCliente.apellido}</div>
        <div><b>Celular:</b> {selectedCliente.celular || "-"}</div>
        <div><b>Email:</b> {selectedCliente.email || "-"}</div>
        <div><b>DNI:</b> {selectedCliente.dni || "-"}</div>
        <div><b>Dirección:</b> {selectedCliente.direccion || "-"}</div>
      </div>
    )}

    {/* VEHICULO */}
    {selectedVehiculo && (
      <div>
        <div className="font-semibold mb-1 text-base">
          Datos del vehículo
        </div>

        <div><b>Placa:</b> {selectedVehiculo.placa || selectedVehiculo.placas || "-"}</div>
        <div><b>VIN:</b> {selectedVehiculo.vin || "-"}</div>
        <div><b>Marca:</b> {selectedVehiculo.marca_nombre || "-"}</div>
        <div><b>Modelo:</b> {selectedVehiculo.modelo_nombre || "-"}</div>
        <div><b>Año:</b> {selectedVehiculo.anio || "-"}</div>
        <div><b>Color:</b> {selectedVehiculo.color || "-"}</div>
        <div><b>Kilometraje:</b> {selectedVehiculo.kilometraje || "-"}</div>
      </div>
    )}

  </div>
)}

      </CardContent>
    </Card>
  );
}
