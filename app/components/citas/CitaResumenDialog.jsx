"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Pencil,
  Clock,
  User,
  Car,
  FileText,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  Info,
  Wrench
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

function formatHour(value) {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleTimeString("es-PE", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function formatDate(value) {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleDateString("es-PE", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function estadoColor(estado) {
  const e = String(estado || "").toLowerCase();
  if (e === "confirmada") return {
    bg: "bg-green-50",
    border: "border-green-200",
    text: "text-green-700",
    badge: "bg-green-100 text-green-800",
    icon: "text-green-600"
  };
  if (e === "pendiente") return {
    bg: "bg-amber-50",
    border: "border-amber-200",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-800",
    icon: "text-amber-600"
  };
  if (e === "cancelada") return {
    bg: "bg-red-50",
    border: "border-red-200",
    text: "text-red-700",
    badge: "bg-red-100 text-red-800",
    icon: "text-red-600"
  };
  if (e === "reprogramada") return {
    bg: "bg-blue-50",
    border: "border-blue-200",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-800",
    icon: "text-blue-600"
  };
  return {
    bg: "bg-gray-50",
    border: "border-gray-200",
    text: "text-gray-700",
    badge: "bg-gray-100 text-gray-800",
    icon: "text-gray-600"
  };
}

export default function CitaResumenDialog({
  open,
  onOpenChange,
  cita,
}) {
  const router = useRouter();

  if (!cita) return null;

  const clienteNombre =
    [cita.nombre, cita.apellido].filter(Boolean).join(" ") ||
    cita.cliente ||
    "--";

  const vehiculo = [
    cita.placa || cita.placas || "SIN PLACA",
    cita.vin || "--",
    cita.marca || "--",
    cita.modelo || "--",
  ].join(", ");

  const colors = estadoColor(cita.estado);

  function handleEditar() {
    if (!cita?.id) {
      toast.error("No se encontró el ID de la cita");
      return;
    }

    onOpenChange(false);
    router.push(`/citas/${cita.id}/editar`);
  }

  function handleCrearOrden() {
    toast.success("Orden creada");
  }

  function handleClienteNoLlego() {
    toast.error("Cliente marcado como no llegó");
  }

  return (
    <TooltipProvider>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          
          {/* HEADER */}
          <DialogHeader className="pb-4 border-b">
            <div className="flex items-start justify-between gap-2">
              <div>
                <DialogTitle className="text-2xl">Detalle de cita</DialogTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  Cita #{cita.id}
                </p>
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleEditar}
                    className="h-9 w-9 hover:bg-blue-100"
                  >
                    <Pencil className="h-4 w-4 text-blue-600" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="left">Editar cita</TooltipContent>
              </Tooltip>
            </div>

            {/* ESTADO BADGE */}
            <div className={`inline-block mt-3 px-3 py-1.5 rounded-full text-xs font-bold ${colors.badge}`}>
              {cita.estado?.toUpperCase() || "--"}
            </div>
          </DialogHeader>

          {/* CONTENIDO */}
          <div className="space-y-4">

            {/* CLIENTE */}
            <div className={`p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
              <div className="flex items-center gap-2 mb-3">
                <User size={18} className={colors.icon} />
                <h3 className="font-semibold text-slate-900">Cliente</h3>
              </div>
              <div className="space-y-1.5 text-sm">
                <div>
                  <span className="text-muted-foreground">Nombre:</span>
                  <div className="font-semibold text-slate-900">{clienteNombre}</div>
                </div>
                {cita.correo && (
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <div className="font-medium text-slate-900">{cita.correo}</div>
                  </div>
                )}
                {cita.celular && (
                  <div>
                    <span className="text-muted-foreground">Celular:</span>
                    <div className="font-medium text-slate-900">{cita.celular}</div>
                  </div>
                )}
                {cita.dni && (
                  <div>
                    <span className="text-muted-foreground">DNI:</span>
                    <div className="font-medium text-slate-900">{cita.dni}</div>
                  </div>
                )}
              </div>
            </div>

            {/* VEHÍCULO */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <Car size={18} className="text-green-600" />
                <h3 className="font-semibold text-slate-900">Vehículo</h3>
              </div>
              <div className="space-y-1.5 text-sm">
                <div>
                  <span className="text-muted-foreground">Placa:</span>
                  <div className="font-semibold text-slate-900">
                    {cita.placa || cita.placas || "SIN PLACA"}
                  </div>
                </div>
                {cita.vin && (
                  <div>
                    <span className="text-muted-foreground">VIN:</span>
                    <div className="font-mono text-xs text-slate-900">{cita.vin}</div>
                  </div>
                )}
                {(cita.marca || cita.modelo) && (
                  <div>
                    <span className="text-muted-foreground">Modelo:</span>
                    <div className="font-medium text-slate-900">
                      {[cita.marca, cita.modelo].filter(Boolean).join(" ")}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* HORARIO */}
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <Clock size={18} className="text-purple-600" />
                <h3 className="font-semibold text-slate-900">
                  Fecha y hora
                </h3>
              </div>
              <div className="space-y-1.5 text-sm">
                <div>
                  <span className="text-muted-foreground">Fecha:</span>
                  <div className="font-semibold text-slate-900">
                    {formatDate(cita.start_at)}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Horario:</span>
                  <div className="font-semibold text-slate-900">
                    {formatHour(cita.start_at)} - {formatHour(cita.end_at)}
                  </div>
                </div>
              </div>
            </div>

            {/* ASESOR */}
            {cita.asesor && (
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-3">
                  <User size={18} className="text-blue-600" />
                  <h3 className="font-semibold text-slate-900">
                    Asesor de Servicio
                  </h3>
                </div>
                <div className="font-semibold text-slate-900">
                  {cita.asesor}
                </div>
              </div>
            )}

            {/* MOTIVOS */}
            {(Array.isArray(cita.motivos) && cita.motivos.length > 0) || cita.motivo ? (
              <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                <div className="flex items-center gap-2 mb-3">
                  <CheckCircle size={18} className="text-indigo-600" />
                  <h3 className="font-semibold text-slate-900">
                    Motivo de visita
                  </h3>
                </div>
                {Array.isArray(cita.motivos) && cita.motivos.length > 0 ? (
                  <ul className="space-y-1.5 text-sm">
                    {cita.motivos.map((m, idx) => (
                      <li key={m.id || `${m.motivo_id}-${m.submotivo_id || "x"}`} className="flex gap-2">
                        <span className="text-indigo-600 font-bold">{idx + 1}.</span>
                        <div>
                          <span className="font-semibold text-slate-900">
                            {m.motivo || "--"}
                          </span>
                          {m.submotivo && (
                            <div className="text-xs text-slate-600 mt-0.5">
                              → {m.submotivo}
                            </div>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-sm font-medium text-slate-900">{cita.motivo}</div>
                )}
              </div>
            ) : null}

            {/* NOTAS CLIENTE */}
            {cita.nota_cliente && (
              <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={18} className="text-amber-600" />
                  <h3 className="font-semibold text-slate-900">
                    Notas para el cliente
                  </h3>
                </div>
                <p className="text-sm text-slate-900 whitespace-pre-wrap">
                  {cita.nota_cliente}
                </p>
              </div>
            )}

            {/* NOTAS INTERNAS */}
            {cita.nota_interna && (
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle size={18} className="text-red-600" />
                  <h3 className="font-semibold text-slate-900">
                    Notas internas
                  </h3>
                </div>
                <p className="text-sm text-slate-900 whitespace-pre-wrap">
                  {cita.nota_interna}
                </p>
              </div>
            )}

          </div>

          {/* ACCIONES */}
          <div className="pt-4 border-t space-y-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                  onClick={handleCrearOrden}
                >
                  <Wrench size={16} />
                  Crear orden de trabajo
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Crea una orden de trabajo basada en esta cita
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={handleClienteNoLlego}
                >
                  <AlertCircle size={16} />
                  Cliente no llegó
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Marca como no presentado
              </TooltipContent>
            </Tooltip>
          </div>

        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}