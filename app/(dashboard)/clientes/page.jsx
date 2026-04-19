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

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Plus, AlertTriangle, Loader2, Info, UserRound, Car } from "lucide-react";

export default function ClientesPage() {
  const { permissions, user } = useAuth();

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
    type: null, // "cliente" | "vehiculo"
  });

  const actorName =
    user?.fullname || user?.name || user?.username || user?.email || "Un usuario";

  async function loadClientes() {
    try {
      setLoading(true);
      const r = await fetch("/api/clientes", { cache: "no-store" });
      const data = await r.json();
      setClientes(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Error cargando clientes");
    } finally {
      setLoading(false);
    }
  }

  async function loadAllVehiculos() {
    try {
      const r = await fetch("/api/vehiculos", { cache: "no-store" });
      const data = await r.json();
      setAllVehiculos(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Error cargando vehículos");
    }
  }

  async function loadVehiculos(clienteId) {
    if (!clienteId) return;

    try {
      const r = await fetch(`/api/vehiculos?cliente_id=${clienteId}`, {
        cache: "no-store",
      });
      const data = await r.json();
      setVehiculos(Array.isArray(data) ? data : []);
    } catch {
      toast.error("Error cargando vehículos");
    }
  }

  useEffect(() => {
    loadClientes();
    loadAllVehiculos();
  }, []);

  function onSelectCliente(cliente) {
    setSelectedCliente(cliente);
    loadVehiculos(cliente.id);
  }

  function openVehiculos(cliente) {
    setSelectedCliente(cliente);
    loadVehiculos(cliente.id);
  }

  async function getJefeVentasRole() {
    const resRoles = await fetch("/api/roles", { cache: "no-store" });
    if (!resRoles.ok) return null;

    const roles = await resRoles.json();
    return Array.isArray(roles)
      ? roles.find((r) => r.name?.toLowerCase() === "jefe de ventas")
      : null;
  }

  async function sendNotificationToJefeVentas({
    titulo,
    mensaje,
    url,
    tipo = "info",
    icono = "bell",
  }) {
    try {
      const jefeVentas = await getJefeVentasRole();

      if (!jefeVentas) {
        console.warn('No se encontró el rol "jefe de ventas"');
        return;
      }

      const resNotif = await fetch("/api/notificaciones", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          mensaje,
          tipo,
          icono,
          url,
          roles_ids: [jefeVentas.id],
          usuarios_ids: [],
        }),
      });

      if (!resNotif.ok) {
        const error = await resNotif.json();
        console.warn("Falló la notificación:", error);
      }
    } catch (error) {
      console.error("Error creando notificación:", error);
    }
  }

  async function saveCliente(data) {
    const isEdit = clienteDialog.mode === "edit";
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit ? `/api/clientes/${clienteDialog.data.id}` : `/api/clientes`;

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.message || "Error guardando cliente");
        return;
      }

      toast.success(isEdit ? "✓ Cliente actualizado" : "✓ Cliente creado");

      const nombreCompleto = `${data.nombre || clienteDialog.data?.nombre || ""} ${
        data.apellido || clienteDialog.data?.apellido || ""
      }`.trim();

      await sendNotificationToJefeVentas({
        titulo: isEdit ? "Cliente actualizado" : "Nuevo cliente registrado",
        mensaje: `${actorName} ${isEdit ? "actualizó" : "creó"} el cliente ${nombreCompleto}.`,
        tipo: isEdit ? "info" : "success",
        icono: "user-round",
        url: "/clientes",
      });

      setClienteDialog({ open: false, mode: "create", data: null });
      loadClientes();
      loadAllVehiculos();
    } catch (error) {
      console.error(error);
      toast.error("Error guardando cliente");
    }
  }

  async function saveVehiculo(data) {
    if (!selectedCliente) return;

    const isEdit = vehiculoDialog.mode === "edit";
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit ? `/api/vehiculos/${vehiculoDialog.data.id}` : `/api/vehiculos`;

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          cliente_id: selectedCliente.id,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.message || "Error guardando vehículo");
        return;
      }

      toast.success(isEdit ? "✓ Vehículo actualizado" : "✓ Vehículo creado");

      const vehiculoTexto = `${data.marca || vehiculoDialog.data?.marca || ""} ${
        data.modelo || vehiculoDialog.data?.modelo || ""
      }`.trim();

      await sendNotificationToJefeVentas({
        titulo: isEdit ? "Vehículo actualizado" : "Nuevo vehículo registrado",
        mensaje: `${actorName} ${isEdit ? "actualizó" : "creó"} el vehículo ${vehiculoTexto} del cliente ${selectedCliente.nombre} ${selectedCliente.apellido}.`,
        tipo: isEdit ? "info" : "success",
        icono: "car",
        url: "/clientes",
      });

      setVehiculoDialog({ open: false, mode: "create", data: null });
      loadVehiculos(selectedCliente.id);
      loadAllVehiculos();
    } catch (error) {
      console.error(error);
      toast.error("Error guardando vehículo");
    }
  }

  async function deleteCliente() {
    if (!deleteDialog.item) return;

    try {
      const cliente = deleteDialog.item;

      const response = await fetch(`/api/clientes/${cliente.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.message || "Error eliminando cliente");
        return;
      }

      toast.success("✓ Cliente eliminado");

      await sendNotificationToJefeVentas({
        titulo: "Cliente eliminado",
        mensaje: `${actorName} eliminó el cliente ${cliente.nombre || ""} ${cliente.apellido || ""}.`.trim(),
        tipo: "warning",
        icono: "user-round-x",
        url: "/clientes",
      });

      setDeleteDialog({ open: false, item: null, type: null });
      loadClientes();
      loadAllVehiculos();
      setSelectedCliente(null);
      setVehiculos([]);
    } catch (error) {
      console.error(error);
      toast.error("Error eliminando cliente");
    }
  }

  async function deleteVehiculo(vehiculo) {
    if (!vehiculo) return;

    try {
      const response = await fetch(`/api/vehiculos/${vehiculo.id}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (!response.ok) {
        toast.error(result.message || "No se pudo eliminar");
        return;
      }

      toast.success("✓ Vehículo eliminado");

      await sendNotificationToJefeVentas({
        titulo: "Vehículo eliminado",
        mensaje: `${actorName} eliminó el vehículo ${vehiculo.marca || ""} ${vehiculo.modelo || ""} del cliente ${selectedCliente?.nombre || ""} ${selectedCliente?.apellido || ""}.`.trim(),
        tipo: "warning",
        icono: "car-front",
        url: "/clientes",
      });

      if (selectedCliente) loadVehiculos(selectedCliente.id);
      loadAllVehiculos();
    } catch (err) {
      console.error(err);
      toast.error("Error eliminando vehículo");
    }
  }

  if (!permView) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex gap-3">
        <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-red-700">
          <p className="font-semibold">Sin permiso</p>
          <p className="text-xs mt-1">No tienes permisos para ver esta sección</p>
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
        {/* HEADER GENERAL */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-[#5d16ec] rounded-lg shadow-md">
              <UserRound className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Gestión de Clientes</h1>
              <p className="text-sm text-gray-600 mt-1">
                Administra clientes y sus vehículos asociados
              </p>
            </div>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">Total de Clientes</p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">
                        {stats.totalClientes}
                      </p>
                    </div>
                    <UserRound className="h-12 w-12 text-blue-200" />
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
                      <p className="text-sm text-purple-600 font-medium">Total de Vehículos</p>
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

        {/* LISTA CLIENTES */}
        <Card className="border-l-4 border-l-[#5d16ec] shadow-lg overflow-hidden">
          <CardHeader className="border-b space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#5d16ec] rounded-lg">
                  <UserRound className="h-5 w-5 text-white" />
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

              {/* ✅ BOTÓN CREAR FUERA DE LA TABLA */}
              {permCreate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={() =>
                        setClienteDialog({ open: true, mode: "create", data: null })
                      }
                      className="bg-[#5d16ec] hover:bg-[#4a12c8]/70 text-white shadow-md gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Nuevo Cliente</span>
                      <span className="sm:hidden">Nuevo</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">Crear nuevo cliente</TooltipContent>
                </Tooltip>
              )}
            </div>
          </CardHeader>

          <CardContent className="px-2">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">Cargando clientes...</p>
              </div>
            ) : clientes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-gray-100 rounded-full mb-3">
                  <UserRound className="h-8 w-8 text-gray-400" />
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
                // ✅ ya NO pasamos onCreate (para que no salga dentro de la tabla)
                onEdit={
                  permEdit
                    ? (c) => setClienteDialog({ open: true, mode: "edit", data: c })
                    : undefined
                }
                onDelete={
                  permDelete
                    ? (c) => setDeleteDialog({ open: true, item: c, type: "cliente" })
                    : undefined
                }
              />
            )}
          </CardContent>
        </Card>

        {/* VEHÍCULOS DEL CLIENTE */}
        {selectedCliente && (
          <Card className="border-l-4 border-l-[#5d16ec] shadow-lg overflow-hidden">
            <CardHeader className="border-b space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#5d16ec] rounded-lg">
                    <Car className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-lg font-bold text-gray-900">
                        Vehículos de {selectedCliente.nombre}
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
                          setVehiculoDialog({ open: true, mode: "create", data: null })
                        }
                        className="bg-[#5d16ec] hover:bg-[#4a12c8]/70 text-white shadow-md gap-2"
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
                className="w-fit bg-[#e0d6f5] text-[#5d16ec] border-[#c9b8e0]"
              >
                <Car className="h-3 w-3 mr-1" />
                {vehiculos.length} vehículo{vehiculos.length !== 1 ? "s" : ""}
              </Badge>
            </CardHeader>

            <CardContent className="px-2">
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
                      ? () => setVehiculoDialog({ open: true, mode: "create", data: null })
                      : undefined
                  }
                  onEdit={
                    permEdit
                      ? (v) => setVehiculoDialog({ open: true, mode: "edit", data: v })
                      : undefined
                  }
                  onDelete={
                    permDelete
                      ? (v) => setDeleteDialog({ open: true, item: v, type: "vehiculo" })
                      : undefined
                  }
                />
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* DIALOGS */}
      <ClienteDialog
        open={clienteDialog.open}
        mode={clienteDialog.mode}
        cliente={clienteDialog.data}
        onOpenChange={(v) => setClienteDialog((prev) => ({ ...prev, open: v }))}
        onSave={saveCliente}
      />

      <VehiculoDialog
        open={vehiculoDialog.open}
        mode={vehiculoDialog.mode}
        vehiculo={vehiculoDialog.data}
        onSave={saveVehiculo}
        onOpenChange={(v) => setVehiculoDialog((prev) => ({ ...prev, open: v }))}
      />

      <ConfirmDeleteDialog
        open={deleteDialog.open}
        item={deleteDialog.item}
        type={deleteDialog.type}
        onConfirm={
          deleteDialog.type === "vehiculo"
            ? () => deleteVehiculo(deleteDialog.item)
            : deleteCliente
        }
        onOpenChange={(v) => setDeleteDialog((prev) => ({ ...prev, open: v }))}
      />
    </TooltipProvider>
  );
}