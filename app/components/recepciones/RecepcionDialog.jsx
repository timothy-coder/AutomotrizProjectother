"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem
} from "@/components/ui/select";

import { Camera, Video, Mic, Trash2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function RecepcionDialog({
  open,
  onOpenChange,
  cita = null,
  onSaved
}) {
  const { user } = useAuth();

  const [clientes, setClientes] = useState([]);
  const [vehiculos, setVehiculos] = useState([]);
  const [centros, setCentros] = useState([]);
  const [talleres, setTalleres] = useState([]);

  const [form, setForm] = useState({
    cliente_id: "",
    carro_id: "",
    centro_id: "",
    taller_id: "",
    notas_cliente: "",
    notas_generales: "",
  });

  const [media, setMedia] = useState({
    fotos: [],
    videos: [],
    audios: [],
  });

  function setField(field, value) {
    setForm(prev => ({ ...prev, [field]: value }));
  }

  function addFiles(type, files) {
    setMedia(prev => ({
      ...prev,
      [type]: [...prev[type], ...Array.from(files)]
    }));
  }

  function removeFile(type, index) {
    setMedia(prev => ({
      ...prev,
      [type]: prev[type].filter((_, i) => i !== index)
    }));
  }

  useEffect(() => {
    if (!open) return;

    Promise.all([
      fetch("/api/clientes").then(r => r.json()),
      fetch("/api/vehiculos").then(r => r.json()),
      fetch("/api/centros").then(r => r.json()),
      fetch("/api/talleres").then(r => r.json()),
    ]).then(([c, v, ce, t]) => {
      setClientes(c);
      setVehiculos(v);
      setCentros(ce);
      setTalleres(t);
    });

  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (cita) {
      setForm({
        cliente_id: String(cita.cliente_id),
        carro_id: String(cita.carro_id),
        centro_id: String(cita.centro_id),
        taller_id: String(cita.taller_id),
        notas_cliente: "",
        notas_generales: "",
      });
    } else {
      setForm({
        cliente_id: "",
        carro_id: "",
        centro_id: "",
        taller_id: "",
        notas_cliente: "",
        notas_generales: "",
      });
    }

    setMedia({ fotos: [], videos: [], audios: [] });

  }, [open, cita]);

  async function save() {
    if (!form.cliente_id || !form.carro_id) {
      toast.error("Cliente y vehículo obligatorios");
      return;
    }

    const payload = {
      ...form,
      cita_id: cita?.id || null,
      created_by: user?.id
    };

    const res = await fetch("/api/recepciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!res.ok) {
      toast.error("Error guardando");
      return;
    }

    toast.success("Recepción creada");

    onSaved?.();
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {cita ? "Recepcionar cita" : "Nueva recepción"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">

          {/* SELECTS */}
          <div className="grid md:grid-cols-2 gap-3">
            <Select value={form.cliente_id} onValueChange={(v)=>setField("cliente_id",v)}>
              <SelectTrigger><SelectValue placeholder="Cliente" /></SelectTrigger>
              <SelectContent>
                {clientes.map(c=>(
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre} {c.apellido}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={form.carro_id} onValueChange={(v)=>setField("carro_id",v)}>
              <SelectTrigger><SelectValue placeholder="Vehículo" /></SelectTrigger>
              <SelectContent>
                {vehiculos.map(v=>(
                  <SelectItem key={v.id} value={String(v.id)}>
                    {v.placas}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={form.centro_id} onValueChange={(v)=>setField("centro_id",v)}>
              <SelectTrigger><SelectValue placeholder="Centro" /></SelectTrigger>
              <SelectContent>
                {centros.map(c=>(
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={form.taller_id} onValueChange={(v)=>setField("taller_id",v)}>
              <SelectTrigger><SelectValue placeholder="Taller" /></SelectTrigger>
              <SelectContent>
                {talleres.map(t=>(
                  <SelectItem key={t.id} value={String(t.id)}>
                    {t.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Input
            placeholder="Notas del cliente"
            value={form.notas_cliente}
            onChange={(e)=>setField("notas_cliente",e.target.value)}
          />

          <Input
            placeholder="Notas generales"
            value={form.notas_generales}
            onChange={(e)=>setField("notas_generales",e.target.value)}
          />

          <MediaUploader label="Fotos" icon={<Camera size={16}/>} files={media.fotos} onAdd={(f)=>addFiles("fotos",f)} onRemove={(i)=>removeFile("fotos",i)} accept="image/*"/>
          <MediaUploader label="Videos" icon={<Video size={16}/>} files={media.videos} onAdd={(f)=>addFiles("videos",f)} onRemove={(i)=>removeFile("videos",i)} accept="video/*"/>
          <MediaUploader label="Audios" icon={<Mic size={16}/>} files={media.audios} onAdd={(f)=>addFiles("audios",f)} onRemove={(i)=>removeFile("audios",i)} accept="audio/*"/>

          <Button className="w-full" onClick={save}>
            Guardar recepción
          </Button>

        </div>
      </DialogContent>
    </Dialog>
  );
}

function MediaUploader({ label, icon, files, onAdd, onRemove, accept }) {
  return (
    <div className="space-y-2">
      <label className="flex justify-between items-center border rounded-lg p-3 cursor-pointer">
        <div className="flex gap-2 items-center text-sm">{icon} {label}</div>
        <input type="file" multiple accept={accept} className="hidden" onChange={(e)=>onAdd(e.target.files)} />
      </label>

      {files.map((file,i)=>(
        <div key={i} className="flex justify-between bg-muted px-3 py-2 rounded">
          <span className="text-xs truncate">{file.name}</span>
          <Trash2 size={16} className="text-red-500 cursor-pointer" onClick={()=>onRemove(i)} />
        </div>
      ))}
    </div>
  );
}
