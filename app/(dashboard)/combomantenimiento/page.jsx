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
import { Switch } from "@/components/ui/switch";
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

export default function SubmantenimientoPage() {

  const { permissions } = useAuth();

  const permView   = hasPermission(permissions,"combomantenimiento","view");
  const permCreate = hasPermission(permissions,"combomantenimiento","create");
  const permEdit   = hasPermission(permissions,"combomantenimiento","edit");
  const permDelete = hasPermission(permissions,"combomantenimiento","delete");

  const [data,setData] = useState([]);
  const [tipos,setTipos] = useState([]);

  const [dialog,setDialog] = useState({ open:false, mode:"create", item:null });
  const [form,setForm] = useState({
    name:"",
    type_id:"",
    is_active:true
  });

  // 🔹 LOAD DATA
  async function loadData(){
    const r = await fetch("/api/submantenimiento",{ cache:"no-store" });
    setData(await r.json());
  }

  async function loadTipos(){
    const r = await fetch("/api/mantenimiento");
    setTipos(await r.json());
  }

  useEffect(()=>{
    loadData();
    loadTipos();
  },[]);

  // 🔹 SAVE
  async function save(){

    if(!form.name.trim() || !form.type_id){
      toast.warning("Complete los campos");
      return;
    }

    const method = dialog.mode==="edit" ? "PUT":"POST";
    const url = dialog.mode==="edit"
      ? `/api/submantenimiento/${dialog.item.id}`
      : `/api/submantenimiento`;

    await fetch(url,{
      method,
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({
        name:form.name,
        type_id:form.type_id,
        is_active: form.is_active ? 1 : 0
      })
    });

    toast.success("Guardado");
    setDialog({ open:false });
    loadData();
  }

  // 🔹 DELETE
  async function remove(item){
    if(!confirm("¿Eliminar submantenimiento?")) return;

    await fetch(`/api/submantenimiento/${item.id}`,{ method:"DELETE" });
    loadData();
  }

  // 🔹 SWITCH
  async function toggleActive(item,value){
    await fetch(`/api/submantenimiento/${item.id}/toggle`,{
      method:"PATCH",
      headers:{ "Content-Type":"application/json" },
      body: JSON.stringify({ is_active:value ? 1 : 0 })
    });

    setData(prev =>
      prev.map(r =>
        r.id===item.id
          ? { ...r, is_active:value ? 1 : 0 }
          : r
      )
    );
  }

  // 🔹 TABLE
  const columns = useMemo(()=>[
    { accessorKey:"name", header:"Submantenimiento" },
    { accessorKey:"mantenimiento", header:"Mantenimiento" },
    {
      accessorKey:"is_active",
      header:"Activo",
      cell:({ row }) => (
        <Switch
          checked={row.original.is_active===1}
          onCheckedChange={(v)=>toggleActive(row.original,v)}
          disabled={!permEdit}
        />
      )
    },
    {
      header:"Acciones",
      cell:({ row }) => (
        <div className="flex gap-2">
          {permEdit && (
            <Button variant="ghost" size="sm" onClick={()=>{
              setDialog({
                open:true,
                mode:"edit",
                item:row.original
              });
              setForm({
                name:row.original.name,
                type_id:String(row.original.type_id),
                is_active:row.original.is_active===1
              });
            }}>
              <Pencil size={16} />
            </Button>
          )}

          {permDelete && (
            <Button size="sm" variant="destructive"
              onClick={()=>remove(row.original)}>
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

      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Combos de Mantenimiento</h1>

        {permCreate && (
          <Button onClick={()=>{
            setForm({ name:"", type_id:"", is_active:true });
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
                    {flexRender(h.column.columnDef.header,h.getContext())}
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
                    {flexRender(cell.column.columnDef.cell,cell.getContext())}
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
              {dialog.mode==="edit"?"Editar":"Nuevo"} Combo de mantenimiento
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">

            <div>
              <Label>Nombre</Label>
              <Input
                value={form.name}
                onChange={e=>setForm(p=>({...p,name:e.target.value}))}
              />
            </div>

            <div>
              <Label>Mantenimiento</Label>
              <Select
                value={form.type_id}
                onValueChange={v=>setForm(p=>({...p,type_id:v}))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione"/>
                </SelectTrigger>
                <SelectContent>
                  {tipos.map(t=>(
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={form.is_active}
                onCheckedChange={v=>setForm(p=>({...p,is_active:v}))}
              />
              <Label>Activo</Label>
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
