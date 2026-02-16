"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CitaDatosCard({ value, onChange }) {

  const [origenes, setOrigenes] = useState([]);

  useEffect(() => {
    fetch("/api/origenes_citas")
      .then(r => r.json())
      .then(setOrigenes);
  }, []);

  function setField(field, val) {
    onChange(prev => ({ ...prev, [field]: val }));
  }

  function addFiles(files) {
    setField("files", [...(value.files || []), ...files]);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Datos de la cita</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">

        <div>
          <Label>Origen</Label>
          <Select onValueChange={(v)=>setField("origen_id", Number(v))}>
            <SelectTrigger>
              <SelectValue placeholder="Seleccione" />
            </SelectTrigger>
            <SelectContent>
              {origenes.map(o => (
                <SelectItem key={o.id} value={String(o.id)}>
                  {o.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label>Tipo servicio</Label>
          <Select onValueChange={(v)=>setField("tipo_servicio", v)}>
            <SelectTrigger><SelectValue/></SelectTrigger>
            <SelectContent>
              <SelectItem value="TALLER">Taller</SelectItem>
              <SelectItem value="PLANCHADO_PINTURA">Planchado / Pintura</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex justify-between">
          <Label>Servicio valet</Label>
          <Switch onCheckedChange={(v)=>setField("servicio_valet", v)} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Input type="date" onChange={(e)=>setField("fecha_promesa", e.target.value)} />
          <Input type="time" onChange={(e)=>setField("hora_promesa", e.target.value)} />
        </div>

        <Textarea placeholder="Notas cliente"
          onChange={(e)=>setField("nota_cliente", e.target.value)} />

        <Textarea placeholder="Notas internas"
          onChange={(e)=>setField("nota_interna", e.target.value)} />

        <div>
          <label className="cursor-pointer">
            <Button asChild variant="outline" size="sm">
              <span><Paperclip className="mr-2"/> Adjuntar</span>
            </Button>
            <input
              type="file"
              hidden
              multiple
              onChange={(e)=>addFiles(Array.from(e.target.files))}
            />
          </label>
        </div>

      </CardContent>
    </Card>
  );
}
