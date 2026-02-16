"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useReactTable,
  getCoreRowModel,
  flexRender
} from "@tanstack/react-table";
import { toast } from "sonner";
import { Plus,Eye, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table, TableHeader, TableRow, TableHead, TableBody, TableCell
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectTrigger, SelectContent, SelectItem, SelectValue
} from "@/components/ui/select";

import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";

export default function CarrosParaMantenimientoPage() {

  const { permissions } = useAuth();

  const permView   = hasPermission(permissions,"carrosparamantenimiento","view");
  const permCreate = hasPermission(permissions,"carrosparamantenimiento","create");
  const permEdit   = hasPermission(permissions,"carrosparamantenimiento","edit");
  const permDelete = hasPermission(permissions,"carrosparamantenimiento","delete");

  const [data,setData] = useState([]);
  const [marcas,setMarcas] = useState([]);
  const [modelos,setModelos] = useState([]);

  const [dialog,setDialog] = useState({ open:false, mode:"create", item:null });

  const [form,setForm] = useState({
    marca_id:"",
    modelo_id:"",
    year:"",
    version:""
  });

  // ================= LOAD =================

  async function loadData(){
    const r = await fetch("/api/carrosparamantenimiento",{ cache:"no-store" });
    setData(await r.json());
  }

  async function loadMarcas(){
    const r = await fetch("/api/marcas");
    setMarcas(await r.json());
  }

  async function loadModelos(marcaId){
    if(!marcaId) return setModelos([]);
    const r = await fetch(`/api/modelos?marca_id=${marcaId}`);
    setModelos(await r.json());
  }

  useEffect(()=>{
    loadData();
    loadMarcas();
  },[]);

  useEffect(()=>{
    loadModelos(form.marca_id);
  },[form.marca_id]);

  // ================= SAVE =================

  async function save(){

    if(!form.marca_id || !form.modelo_id){
      toast.warning("Seleccione marca y modelo");
      return;
    }

    const method = dialog.mode==="edit" ? "PUT":"POST";
    const url = dialog.mode==="edit"
      ? `/api/carrosparamantenimiento/${dialog.item.id}`
      : `/api/carrosparamantenimiento`;

    await fetch(url,{
      method,
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({
        ...form,
        year: form.year || null,
        version: form.version || null
      })
    });

    toast.success("Guardado");
    setDialog({ open:false });
    loadData();
  }

  // ================= DELETE =================

  async function remove(item){
    if(!confirm("¿Eliminar registro?")) return;

    await fetch(`/api/carrosparamantenimiento/${item.id}`,{
      method:"DELETE"
    });

    loadData();
  }

  // ================= TABLE =================

  const columns = useMemo(()=>[
    { accessorKey:"marca_nombre", header:"Marca" },
    { accessorKey:"modelo_nombre", header:"Modelo" },
    { accessorKey:"year", header:"Año" },
    { accessorKey:"version", header:"Versión" },
    {
      header:"Acciones",
      cell:({ row })=>(
        <div className="flex gap-2">

          {permEdit && (
            <Button
              size="sm"
              variant="ghost"
              onClick={()=>{
                const item = row.original;
                setDialog({ open:true, mode:"edit", item });
                setForm({
                  marca_id:String(item.marca_id),
                  modelo_id:String(item.modelo_id),
                  year:item.year || "",
                  version:item.version || ""
                });
              }}
            >
              <Pencil size={16} />
            </Button>
          )}

          {permDelete && (
            <Button
              size="sm"
              variant="destructive"
              onClick={()=>remove(row.original)}
            >
              <Trash2 size={16} />
            </Button>
          )}

        </div>
      )
    }
  ],[permEdit,permDelete]);

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel:getCoreRowModel()
  });

  if(!permView) return <p>Sin permiso</p>;

  return (
    <div className="space-y-5">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">
          Carros para mantenimiento
        </h1>

        {permCreate && (
          <Button onClick={()=>{
            setForm({ marca_id:"", modelo_id:"", year:"", version:"" });
            setDialog({ open:true, mode:"create" });
          }}>
            <Plus size={16} />Nuevo
          </Button>
        )}
      </div>

      {/* TABLE */}
      <div className="border rounded-md">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map(hg=>(
              <TableRow key={hg.id}>
                {hg.headers.map(h=>(
                  <TableHead key={h.id}>
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>

          <TableBody>
            {table.getRowModel().rows.map(row=>(
              <TableRow key={row.id}>
                {row.getVisibleCells().map(cell=>(
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* DIALOG */}
      <Dialog open={dialog.open} onOpenChange={(v)=>setDialog({ open:v })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {dialog.mode==="edit" ? "Editar" : "Nuevo"} registro
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">

            <div>
              <Label>Marca</Label>
              <Select
                value={form.marca_id}
                onValueChange={v=>setForm(p=>({...p,marca_id:v,modelo_id:""}))}
              >
                <SelectTrigger><SelectValue placeholder="Seleccione"/></SelectTrigger>
                <SelectContent>
                  {marcas.map(m=>(
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Modelo</Label>
              <Select
                value={form.modelo_id}
                onValueChange={v=>setForm(p=>({...p,modelo_id:v}))}
              >
                <SelectTrigger><SelectValue placeholder="Seleccione"/></SelectTrigger>
                <SelectContent>
                  {modelos.map(m=>(
                    <SelectItem key={m.id} value={String(m.id)}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Año</Label>
              <Input
                type="number"
                value={form.year}
                onChange={e=>setForm(p=>({...p,year:e.target.value}))}
              />
            </div>

            <div>
              <Label>Versión</Label>
              <Input
                value={form.version}
                onChange={e=>setForm(p=>({...p,version:e.target.value}))}
              />
            </div>

          </div>

          <DialogFooter>
            <Button variant="outline" onClick={()=>setDialog({ open:false })}>
              Cancelar
            </Button>
            <Button onClick={save}>Guardar</Button>
          </DialogFooter>

        </DialogContent>
      </Dialog>

    </div>
  );
}
