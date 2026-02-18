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

import { Card, CardContent } from "@/components/ui/card";

export default function ClientesPage() {

  const { permissions } = useAuth();

  const permView = hasPermission(permissions, "clientes", "view");
  const permCreate = hasPermission(permissions, "clientes", "create");
  const permEdit = hasPermission(permissions, "clientes", "edit");
  const permDelete = hasPermission(permissions, "clientes", "delete");

  const [clientes, setClientes] = useState([]);
  const [selectedCliente, setSelectedCliente] = useState(null);
  const [vehiculos, setVehiculos] = useState([]);

  const [clienteDialog, setClienteDialog] = useState({
    open:false,
    mode:"create",
    data:null
  });

  const [vehiculoDialog, setVehiculoDialog] = useState({
    open:false,
    mode:"create",
    data:null
  });

  const [deleteDialog, setDeleteDialog] = useState({
    open:false,
    item:null
  });

  // ---------------- LOAD CLIENTES ----------------

  async function loadClientes() {
    try {
      const r = await fetch("/api/clientes",{ cache:"no-store" });
      setClientes(await r.json());
    } catch {
      toast.error("Error cargando clientes");
    }
  }

  // ---------------- LOAD VEHICULOS ----------------

  async function loadVehiculos(clienteId) {
    if(!clienteId) return;

    try {
      const r = await fetch(`/api/vehiculos?cliente_id=${clienteId}`);
      setVehiculos(await r.json());
    } catch {
      toast.error("Error cargando vehículos");
    }
  }

  useEffect(()=>{ loadClientes() },[]);

  // ---------------- SELECT CLIENTE ----------------

  function onSelectCliente(cliente){
    setSelectedCliente(cliente);
    loadVehiculos(cliente.id);
  }

  // ---------------- ABRIR VEHICULOS DESDE BOTON ----------------

  function openVehiculos(cliente){
    setSelectedCliente(cliente);
    loadVehiculos(cliente.id);
  }

  // ---------------- SAVE CLIENTE ----------------

  async function saveCliente(data){

    const method = clienteDialog.mode === "edit" ? "PUT" : "POST";

    const url = clienteDialog.mode === "edit"
      ? `/api/clientes/${clienteDialog.data.id}`
      : `/api/clientes`;

    await fetch(url,{
      method,
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify(data)
    });

    setClienteDialog({ open:false });
    loadClientes();
  }

  // ---------------- SAVE VEHICULO ----------------

  async function saveVehiculo(data){

    if(!selectedCliente) return;

    const method = vehiculoDialog.mode === "edit" ? "PUT" : "POST";

    const url = vehiculoDialog.mode === "edit"
      ? `/api/vehiculos/${vehiculoDialog.data.id}`
      : `/api/vehiculos`;

    await fetch(url,{
      method,
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        ...data,
        cliente_id:selectedCliente.id
      })
    });

    setVehiculoDialog({ open:false });
    loadVehiculos(selectedCliente.id);
  }

  // ---------------- DELETE CLIENTE ----------------

  async function deleteCliente(){

    await fetch(`/api/clientes/${deleteDialog.item.id}`,{
      method:"DELETE"
    });

    setDeleteDialog({ open:false });
    loadClientes();
    setSelectedCliente(null);
  }

  if(!permView) return <p>Sin permiso</p>;

  return (
    <div className="space-y-5">

      {/* CLIENTES */}
      <Card>
        <CardContent>

          <ClientesTable
            data={clientes}

            onSelect={onSelectCliente}
            onVehiculos={openVehiculos}

            onCreate={
              permCreate
                ? ()=>setClienteDialog({ open:true, mode:"create" })
                : undefined
            }

            onEdit={
              permEdit
                ? c=>setClienteDialog({ open:true, mode:"edit", data:c })
                : undefined
            }

            onDelete={
              permDelete
                ? c=>setDeleteDialog({ open:true, item:c })
                : undefined
            }

          />

        </CardContent>
      </Card>

      {/* VEHICULOS */}
      {selectedCliente && (
        <Card>
          <CardContent>

            <VehiculosTable
  cliente={selectedCliente}
  data={vehiculos}
  onCreate={permEdit ? () => setVehiculoDialog({ open:true, mode:"create" }) : undefined}
  onEdit={permEdit ? v => setVehiculoDialog({ open:true, mode:"edit", data:v }) : undefined}
  onDelete={
  permDelete
    ? async (v) => {
        try {
          const res = await fetch(`/api/vehiculos/${v.id}`, {
            method: "DELETE",
          });

          const data = await res.json();

          if (!res.ok) {
            toast.error(data.message || "No se pudo eliminar");
            return;
          }

          toast.success("Vehículo eliminado");

          loadVehiculos(selectedCliente.id);

        } catch (err) {
          console.error(err);
          toast.error("Error eliminando vehículo");
        }
      }
    : undefined
}

/>


          </CardContent>
        </Card>
      )}

      {/* DIALOG CLIENTE */}
      <ClienteDialog
        open={clienteDialog.open}
        mode={clienteDialog.mode}
        cliente={clienteDialog.data}
        onSave={saveCliente}
        onOpenChange={v=>setClienteDialog({ open:v })}
      />

      {/* DIALOG VEHICULO */}
      <VehiculoDialog
        open={vehiculoDialog.open}
        mode={vehiculoDialog.mode}
        vehiculo={vehiculoDialog.data}
        onSave={saveVehiculo}
        onOpenChange={v=>setVehiculoDialog({ open:v })}
      />

      {/* DELETE */}
      <ConfirmDeleteDialog
        open={deleteDialog.open}
        onConfirm={deleteCliente}
        onOpenChange={v=>setDeleteDialog({ open:v })}
      />

    </div>
  );
}
