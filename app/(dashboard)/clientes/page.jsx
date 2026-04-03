"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";

import ClientesTable from "@/app/components/clientes/ClientesTable";
import VehiculosTable from "@/app/components/clientes/VehiculosTable";
import ClienteDialog from "@/app/components/clientes/ClienteDialog";
import VehiculoDialog from "@/app/components/clientes/VehiculoDialog";
import ConfirmDeleteDialog from "@/app/components/clientes/ConfirmDeleteDialog";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Plus,
  AlertTriangle,
  Loader2,
  Info,
  Users,
  Car,
  CheckCircle,
} from "lucide-react";

export default function ClientesPage() {
  const { permissions } = useAuth();

  const permView = hasPermission(permissions, "clientes", "view");
  const permCreate = hasPermission(permissions, "clientes", "create");
  const permEdit = hasPermission(permissions, "clientes", "edit");
  const permDelete = hasPermission(permissions, "clientes", "delete");

  const [clientes, setClientes] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [vehiculos, setVehiculos] = useState([]);
  const [allVehiculos, setAllVehiculos] = useState([]);
  const [loading, setLoading] = useState(false);

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

  const [deleteDialog, setDeleteDialog] = useState({
    open: false,
    item: null,
  });

  // ---------------- LOAD CLIENTES ----------------

  async function loadClientes() {
    try {
      setLoading(true);
      const r = await fetch("/api/clientes", { cache: "no-store" });
      setClientes(await r.json());
    } catch {
      toast.error("Error cargando clientes");
    } finally {
      setLoading(false);
    }
  }

  // ---------------- LOAD ALL VEHICULOS ----------------

  async function loadAllVehiculos() {
    try {
      const r = await fetch("/api/vehiculos", { cache: "no-store" });
      setAllVehiculos(await r.json());
    } catch {
      toast.error("Error cargando vehículos");
    }
  }

  // ---------------- LOAD VEHICULOS POR CLIENTE ----------------

  async function loadVehiculos(clienteId) {
    if (!clienteId) return;

    try {
      const r = await fetch(`/api/vehiculos?cliente_id=${clienteId}`);
      setVehiculos(await r.json());
    } catch {
      toast.error("Error cargando vehículos");
    }
  }

  useEffect(() => {
    loadClientes();
    loadAllVehiculos();
  }, []);

  // ---------------- SELECT CLIENTE ----------------

  function onSelectCliente(cliente) {
    setSelectedCliente(cliente);
    loadVehiculos(cliente.id);
  }

  // ---------------- ABRIR VEHICULOS DESDE BOTON ----------------

  function openVehiculos(cliente) {
    setSelectedCliente(cliente);
    loadVehiculos(cliente.id);
  }

  // ---------------- SAVE CLIENTE ----------------

  async function saveCliente(data) {
    const method = clienteDialog.mode === "edit" ? "PUT" : "POST";

    const url =
      clienteDialog.mode === "edit"
        ? `/api/clientes/${clienteDialog.data.id}`
        : `/api/clientes`;

    try {
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      toast.success(
        clienteDialog.mode === "edit"
          ? "Cliente actualizado"
          : "Cliente creado"
      );

      setClienteDialog({ open: false });
      loadClientes();
    } catch {
      toast.error("Error guardando cliente");
    }
  }

  // ---------------- SAVE VEHICULO ----------------

  async function saveVehiculo(data) {
    if (!selectedCliente) return;

    const method = vehiculoDialog.mode === "edit" ? "PUT" : "POST";

    const url =
      vehiculoDialog.mode === "edit"
        ? `/api/vehiculos/${vehiculoDialog.data.id}`
        : `/api/vehiculos`;

    try {
      await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          cliente_id: selectedCliente.id,
        }),
      });

      toast.success(
        vehiculoDialog.mode === "edit"
          ? "Vehículo actualizado"
          : "Vehículo creado"
      );

      setVehiculoDialog({ open: false });
      loadVehiculos(selectedCliente.id);
      loadAllVehiculos();
    } catch {
      toast.error("Error guardando vehículo");
    }
  }

  // ---------------- DELETE CLIENTE ----------------

  async function deleteCliente() {
    try {
      await fetch(`/api/clientes/${deleteDialog.item.id}`, {
        method: "DELETE",
      });

      toast.success("Cliente eliminado");

      setDeleteDialog({ open: false });
      loadClientes();
      loadAllVehiculos();
      setSelectedCliente(null);
    } catch {
      toast.error("Error eliminando cliente");
    }
  }

  if (!permView) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-red-700">
          <p className="font-semibold">Sin permiso</p>
          <p className="text-xs mt-1">
            No tienes permisos para ver esta sección
          </p>
        </div>
      </div>
    );
  }

  const stats = {
    totalClientes: clientes.length,
    totalVehiculos: allVehiculos.length,
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gestión de Clientes
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Administra clientes y sus vehículos asociados
              </p>
            </div>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">
                        Total de Clientes
                      </p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">
                        {stats.totalClientes}
                      </p>
                    </div>
                    <Users className="h-12 w-12 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Cantidad total de clientes registrados
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-purple-600 font-medium">
                        Total de Vehículos
                      </p>
                      <p className="text-3xl font-bold text-purple-900 mt-2">
                        {stats.totalVehiculos}
                      </p>
                    </div>
                    <Car className="h-12 w-12 text-purple-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Cantidad total de vehículos registrados
            </TooltipContent>
          </Tooltip>
        </div>

        {/* TABLA CLIENTES */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 rounded-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg font-bold text-gray-900">
                    Lista de Clientes
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Todos los clientes registrados en el sistema
                  </p>
                </div>
              </div>

            </div>

            <Badge
              variant="secondary"
              className="w-fit bg-blue-100 text-blue-900 border-blue-300"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              {stats.totalClientes} cliente
              {stats.totalClientes !== 1 ? "s" : ""}
            </Badge>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">Cargando clientes...</p>
              </div>
            ) : clientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-gray-100 rounded-full mb-3">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  No hay clientes registrados
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {permCreate
                    ? 'Haz clic en "Nuevo Cliente" para crear uno'
                    : "Sin clientes disponibles"}
                </p>
              </div>
            ) : (
              <ClientesTable
                data={clientes}
                onSelect={onSelectCliente}
                onVehiculos={openVehiculos}
                onCreate={
                  permCreate
                    ? () => setClienteDialog({ open: true, mode: "create" })
                    : undefined
                }
                onEdit={
                  permEdit
                    ? (c) =>
                        setClienteDialog({
                          open: true,
                          mode: "edit",
                          data: c,
                        })
                    : undefined
                }
                onDelete={
                  permDelete
                    ? (c) => setDeleteDialog({ open: true, item: c })
                    : undefined
                }
              />
            )}
          </CardContent>
        </Card>

        {/* TABLA VEHÍCULOS */}
        {selectedCliente && (
          <Card className="border-l-4 border-l-purple-500 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-600 rounded-lg">
                    <Car className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-bold text-gray-900">
                        Vehículos de {selectedCliente.name}
                      </CardTitle>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-gray-400 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Vehículos asociados a este cliente
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      Gestiona los vehículos de este cliente
                    </p>
                  </div>
                </div>

                {permEdit && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={() =>
                          setVehiculoDialog({ open: true, mode: "create" })
                        }
                        className="bg-purple-600 hover:bg-purple-700 text-white shadow-md gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Nuevo Vehículo</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Agregar nuevo vehículo a este cliente
                    </TooltipContent>
                  </Tooltip>
                )}
              </div>

              <Badge
                variant="secondary"
                className="w-fit bg-purple-100 text-purple-900 border-purple-300"
              >
                <Car className="h-3 w-3 mr-1" />
                {vehiculos.length} vehículo
                {vehiculos.length !== 1 ? "s" : ""}
              </Badge>
            </CardHeader>

            <CardContent className="p-0">
              {vehiculos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="p-4 bg-gray-100 rounded-full mb-3">
                    <Car className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600 font-medium">
                    No hay vehículos registrados
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {permEdit
                      ? 'Haz clic en "Nuevo Vehículo" para agregar uno'
                      : "Sin vehículos disponibles"}
                  </p>
                </div>
              ) : (
                <VehiculosTable
                  cliente={selectedCliente}
                  data={vehiculos}
                  onCreate={
                    permEdit
                      ? () =>
                          setVehiculoDialog({
                            open: true,
                            mode: "create",
                          })
                      : undefined
                  }
                  onEdit={
                    permEdit
                      ? (v) =>
                          setVehiculoDialog({
                            open: true,
                            mode: "edit",
                            data: v,
                          })
                      : undefined
                  }
                  onDelete={
                    permDelete
                      ? async (v) => {
                          try {
                            const res = await fetch(
                              `/api/vehiculos/${v.id}`,
                              {
                                method: "DELETE",
                              }
                            );

                            const data = await res.json();

                            if (!res.ok) {
                              toast.error(
                                data.message || "No se pudo eliminar"
                              );
                              return;
                            }

                            toast.success("Vehículo eliminado");

                            loadVehiculos(selectedCliente.id);
                            loadAllVehiculos();
                          } catch (err) {
                            console.error(err);
                            toast.error("Error eliminando vehículo");
                          }
                        }
                      : undefined
                  }
                />
              )}
            </CardContent>
          </Card>
        )}

        {/* INFO BOX */}
        {!loading && clientes.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-1">
              <p className="font-semibold">Información importante:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>
                  Cada cliente puede tener múltiples vehículos asociados
                </li>
                <li>Selecciona un cliente para ver sus vehículos</li>
                <li>Puedes editar o eliminar clientes y vehículos</li>
                <li>Los vehículos están vinculados a los clientes</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* DIALOGS */}
      <ClienteDialog
        open={clienteDialog.open}
        mode={clienteDialog.mode}
        cliente={clienteDialog.data}
        onSave={saveCliente}
        onOpenChange={(v) => setClienteDialog({ open: v })}
      />

      <VehiculoDialog
        open={vehiculoDialog.open}
        mode={vehiculoDialog.mode}
        vehiculo={vehiculoDialog.data}
        onSave={saveVehiculo}
        onOpenChange={(v) => setVehiculoDialog({ open: v })}
      />

      <ConfirmDeleteDialog
        open={deleteDialog.open}
        onConfirm={deleteCliente}
        onOpenChange={(v) => setDeleteDialog({ open: v })}
      />
    </TooltipProvider>
  );
}