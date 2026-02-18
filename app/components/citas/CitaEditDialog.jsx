"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export default function EditCitaDialog({
  open,
  onOpenChange,
  cita,
  permEdit = false,
  onSaved,
}) {

  const [form, setForm] = useState({});
  const [motivos, setMotivos] = useState([]);

  const [clientes, setClientes] = useState([]);
  const [centros, setCentros] = useState([]);
  const [talleres, setTalleres] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [motivosCatalogo, setMotivosCatalogo] = useState([]);
  const [submotivosCatalogo, setSubmotivosCatalogo] = useState([]);

  // ================= CARGA INICIAL =================
  useEffect(() => {
    if (!open || !cita) return;

    setForm(cita);
    setMotivos(cita.motivos || []);

    Promise.all([
      fetch("/api/clientes").then(r=>r.json()),
      fetch("/api/centros").then(r=>r.json()),
      fetch("/api/usuarios?role=asesor").then(r=>r.json()),
      fetch("/api/motivos_citas?active=1").then(r=>r.json()),
      fetch("/api/submotivos-citas?active=1").then(r=>r.json())
    ]).then(([c,ce,u,m,sm])=>{
      setClientes(c);
      setCentros(ce);
      setUsuarios(u);
      setMotivosCatalogo(m);
      setSubmotivosCatalogo(sm);
    });

  }, [open, cita]);

  // talleres por centro
  useEffect(() => {
    if (!form.centro_id) return;
    fetch(`/api/talleres?centro_id=${form.centro_id}`)
      .then(r=>r.json())
      .then(setTalleres);
  }, [form.centro_id]);

  // submotivos agrupados
  const subsByMotivoId = useMemo(()=>{
    const map = new Map();
    submotivosCatalogo.forEach(sm=>{
      if(!map.has(sm.motivo_id)) map.set(sm.motivo_id, []);
      map.get(sm.motivo_id).push(sm);
    });
    return map;
  }, [submotivosCatalogo]);

  function updateField(field,value){
    setForm(prev=>({...prev,[field]:value}));
  }

  function updateMotivoRow(i,data){
    setMotivos(prev=>{
      const copy=[...prev];
      copy[i]={...copy[i],...data};
      return copy;
    });
  }

  function removeMotivoRow(i){
    setMotivos(prev=>prev.filter((_,idx)=>idx!==i));
  }

  // ================= GUARDAR =================
  async function handleSave(){
    try{
      const res = await fetch(`/api/citas/${form.id}`,{
        method:"PUT",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(form)
      });

      if(!res.ok) throw new Error();

      // actualizar motivos
      await fetch(`/api/citas/${form.id}/motivos`,{
        method:"PUT",
        headers:{ "Content-Type":"application/json" },
        body: JSON.stringify(motivos)
      });

      toast.success("Cita actualizada");
      onSaved?.();
      onOpenChange(false);

    }catch{
      toast.error("Error guardando cambios");
    }
  }

  function handleReprogramar(){
    updateField("estado","reprogramada");
    toast("Estado cambiado a reprogramada");
  }

  if(!form) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">

        <DialogHeader>
          <DialogTitle>
            {permEdit ? "Editar Cita" : "Detalle Cita"}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="cliente">

          <TabsList>
            <TabsTrigger value="cliente">Cliente</TabsTrigger>
            <TabsTrigger value="motivos">Motivos</TabsTrigger>
            <TabsTrigger value="agenda">Agenda</TabsTrigger>
            <TabsTrigger value="extra">Extra</TabsTrigger>
          </TabsList>

          {/* ================= CLIENTE ================= */}
          <TabsContent value="cliente">
            <Select
              disabled={!permEdit}
              value={form.cliente_id ? String(form.cliente_id):""}
              onValueChange={v=>updateField("cliente_id",Number(v))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Cliente"/>
              </SelectTrigger>
              <SelectContent>
                {clientes.map(c=>(
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre} {c.apellido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </TabsContent>

          {/* ================= MOTIVOS ================= */}
          <TabsContent value="motivos">
            <div className="space-y-3">

              {motivos.map((m,i)=>{
                const subs = subsByMotivoId.get(m.motivo_id) || [];

                return(
                  <div key={i} className="grid md:grid-cols-12 gap-3 border p-3 rounded">

                    <div className="md:col-span-5">
                      <Select
                        disabled={!permEdit}
                        value={m.motivo_id?String(m.motivo_id):""}
                        onValueChange={v=>updateMotivoRow(i,{motivo_id:Number(v),submotivo_id:null})}
                      >
                        <SelectTrigger><SelectValue placeholder="Motivo"/></SelectTrigger>
                        <SelectContent>
                          {motivosCatalogo.map(mo=>(
                            <SelectItem key={mo.id} value={String(mo.id)}>
                              {mo.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="md:col-span-5">
                      <Select
                        disabled={!permEdit || !m.motivo_id}
                        value={m.submotivo_id?String(m.submotivo_id):""}
                        onValueChange={v=>updateMotivoRow(i,{submotivo_id:Number(v)})}
                      >
                        <SelectTrigger><SelectValue placeholder="Submotivo"/></SelectTrigger>
                        <SelectContent>
                          {subs.map(s=>(
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {permEdit && (
                      <div className="md:col-span-2">
                        <Button variant="outline" onClick={()=>removeMotivoRow(i)}>
                          Quitar
                        </Button>
                      </div>
                    )}
                  </div>
                )
              })}

              {permEdit && (
                <Button onClick={()=>setMotivos(prev=>[...prev,{motivo_id:null,submotivo_id:null}])}>
                  Agregar motivo
                </Button>
              )}
            </div>
          </TabsContent>

          {/* ================= AGENDA ================= */}
          <TabsContent value="agenda">
            <div className="grid md:grid-cols-2 gap-3">

              <Select
                disabled={!permEdit}
                value={form.centro_id?String(form.centro_id):""}
                onValueChange={v=>updateField("centro_id",Number(v))}
              >
                <SelectTrigger><SelectValue placeholder="Centro"/></SelectTrigger>
                <SelectContent>
                  {centros.map(c=>(
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                disabled={!permEdit}
                value={form.taller_id?String(form.taller_id):""}
                onValueChange={v=>updateField("taller_id",Number(v))}
              >
                <SelectTrigger><SelectValue placeholder="Taller"/></SelectTrigger>
                <SelectContent>
                  {talleres.map(t=>(
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select
                disabled={!permEdit}
                value={form.asesor_id?String(form.asesor_id):""}
                onValueChange={v=>updateField("asesor_id",Number(v))}
              >
                <SelectTrigger><SelectValue placeholder="Asesor"/></SelectTrigger>
                <SelectContent>
                  {usuarios.map(u=>(
                    <SelectItem key={u.id} value={String(u.id)}>
                      {u.fullname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="datetime-local"
                disabled={!permEdit}
                value={form.start_at || ""}
                onChange={e=>updateField("start_at",e.target.value)}
              />

              <Input
                type="datetime-local"
                disabled={!permEdit}
                value={form.end_at || ""}
                onChange={e=>updateField("end_at",e.target.value)}
              />

            </div>
          </TabsContent>

          {/* ================= EXTRA ================= */}
          <TabsContent value="extra">
            <Textarea
              disabled={!permEdit}
              placeholder="Nota cliente"
              value={form.nota_cliente || ""}
              onChange={e=>updateField("nota_cliente",e.target.value)}
            />
          </TabsContent>

        </Tabs>

        <div className="flex justify-between pt-4">
          {permEdit && (
            <Button variant="secondary" onClick={handleReprogramar}>
              Reprogramar
            </Button>
          )}

          <div className="flex gap-2">
            <Button variant="outline" onClick={()=>onOpenChange(false)}>
              Cerrar
            </Button>

            {permEdit && (
              <Button onClick={handleSave}>
                Guardar Cambios
              </Button>
            )}
          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
}
