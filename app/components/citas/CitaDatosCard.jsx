"use client";

import { useEffect, useState } from "react";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { 
  Paperclip, 
  Trash2,
  Info,
  FileText,
  Calendar,
  Clock,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function CitaDatosCard({ value, onChange }) {
  const [origenes, setOrigenes] = useState([]);

  useEffect(() => {
    fetch("/api/origenes_citas")
      .then((r) => r.json())
      .then((data) => setOrigenes(Array.isArray(data) ? data : []))
      .catch(() => setOrigenes([]));
  }, []);

  function setField(field, val) {
    onChange((prev) => ({ ...prev, [field]: val }));
  }

  function addFiles(files) {
    setField("files", [...(value.files || []), ...files]);
  }

  function removeFile(index) {
    const copy = [...(value.files || [])];
    copy.splice(index, 1);
    setField("files", copy);
  }

  const totalFilesSize = (value.files || []).reduce((acc, f) => acc + (f.size || 0), 0);

  return (
    <TooltipProvider>
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="bg-gradient-to-r from-slate-50 to-blue-50 border-b">
          <div className="flex items-center gap-2">
            <FileText size={24} className="text-blue-600" />
            <CardTitle className="text-lg text-slate-900">Datos de la cita</CardTitle>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-6">

          {/* SECCIÓN 1: ORIGEN Y TIPO SERVICIO */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">1</span>
              Información básica
            </h3>

            {/* Origen */}
            <div>
              <Label className="flex items-center gap-1">
                Origen de la cita
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={14} className="text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    De dónde viene el cliente (referido, llamada, redes, etc.)
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select
                value={value.origen_id ? String(value.origen_id) : ""}
                onValueChange={(v) => setField("origen_id", Number(v))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder="Seleccione origen" />
                </SelectTrigger>

                <SelectContent>
                  {origenes
                    .filter((o) => Number(o.is_active) === 1)
                    .map((o) => (
                      <SelectItem key={o.id} value={String(o.id)}>
                        {o.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {/* Tipo servicio */}
            <div>
              <Label className="flex items-center gap-1">
                Tipo de servicio
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={14} className="text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Selecciona el tipo de servicio a realizar
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Select
                value={value.tipo_servicio || "TALLER"}
                onValueChange={(v) => setField("tipo_servicio", v)}
              >
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TALLER">Taller</SelectItem>
                  <SelectItem value="PLANCHADO_PINTURA">
                    Planchado / Pintura
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* SECCIÓN 2: SERVICIO VALET */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <div className="flex justify-between items-center">
              <Label className="flex items-center gap-1">
                Servicio de recojo y entrega
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={14} className="text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Activa si el cliente requiere recojo y entrega del vehículo
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Switch
                checked={!!value.servicio_valet}
                onCheckedChange={(v) => setField("servicio_valet", v)}
                className="data-[state=checked]:bg-blue-600"
              />
            </div>

            {value.servicio_valet && (
              <div className="space-y-3 pt-2 border-t">
                <p className="text-sm text-slate-600">Fecha y hora de promesa</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <Calendar size={14} />
                      Fecha
                    </Label>
                    <Input
                      type="date"
                      value={value.fecha_promesa || ""}
                      onChange={(e) => setField("fecha_promesa", e.target.value)}
                      className="h-9"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs flex items-center gap-1">
                      <Clock size={14} />
                      Hora
                    </Label>
                    <Input
                      type="time"
                      value={value.hora_promesa || ""}
                      onChange={(e) => setField("hora_promesa", e.target.value)}
                      className="h-9"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 3: NOTAS */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">2</span>
              Notas
            </h3>

            {/* Notas cliente */}
            <div>
              <Label className="flex items-center gap-1 mb-2">
                <MessageSquare size={14} />
                Notas del cliente
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={14} className="text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Información visible para el cliente
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Textarea
                placeholder="Ej: Cliente solicita limpieza interior, cambio de aire..."
                value={value.nota_cliente || ""}
                onChange={(e) => setField("nota_cliente", e.target.value)}
                className="min-h-20 resize-none"
              />
            </div>

            {/* Notas internas */}
            <div>
              <Label className="flex items-center gap-1 mb-2">
                <AlertCircle size={14} />
                Notas internas
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info size={14} className="text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Información interna del taller (no visible para cliente)
                  </TooltipContent>
                </Tooltip>
              </Label>
              <Textarea
                placeholder="Ej: Verificar batería, revisar frenos, cliente es VIP..."
                value={value.nota_interna || ""}
                onChange={(e) => setField("nota_interna", e.target.value)}
                className="min-h-20 resize-none"
              />
            </div>
          </div>

          {/* SECCIÓN 4: ARCHIVOS */}
          <div className="space-y-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs flex items-center justify-center font-bold">3</span>
              Archivos adjuntos
            </h3>

            <Tooltip>
              <TooltipTrigger asChild>
                <label className="cursor-pointer">
                  <Button 
                    asChild 
                    variant="outline" 
                    size="sm"
                    className="gap-2"
                  >
                    <span>
                      <Paperclip size={16} />
                      Adjuntar archivo
                    </span>
                  </Button>

                  <input
                    type="file"
                    hidden
                    multiple
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) addFiles(files);
                      e.target.value = "";
                    }}
                  />
                </label>
              </TooltipTrigger>
              <TooltipContent side="top">
                Adjunta fotos, documentos o cotizaciones
              </TooltipContent>
            </Tooltip>

            {value.files?.length > 0 && (
              <div className="space-y-3 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-900">
                    {value.files.length} archivo(s) adjunto(s)
                  </p>
                  <p className="text-xs text-slate-600">
                    Total: {(totalFilesSize / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>

                <div className="space-y-2">
                  {value.files.map((file, index) => (
                    <div
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between border border-slate-200 rounded-lg px-3 py-2 bg-white hover:bg-slate-50 transition-colors"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {file.name}
                        </p>
                        <p className="text-xs text-slate-600">
                          {(file.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFile(index)}
                            className="hover:bg-red-100 hover:text-red-700 ml-2"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">Eliminar archivo</TooltipContent>
                      </Tooltip>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {!value.files?.length && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-2">
                <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-blue-700">
                  No hay archivos adjuntos. Puedes agregar fotos o documentos relacionados con la cita.
                </p>
              </div>
            )}
          </div>

        </CardContent>
      </Card>
    </TooltipProvider>
  );
}