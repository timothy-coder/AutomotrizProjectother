"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";

import ClienteSelectCard from "@/app/components/citas/ClienteSelectCard";
import Paso3Horario from "@/app/components/citas/Paso3Horario";
import CitaDatosCard from "@/app/components/citas/CitaDatosCard";
import MotivosVisitaCard from "@/app/components/citas/MotivosVisitaCard";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useUserScope } from "@/hooks/useUserScope";
import { useAuth } from "@/context/AuthContext";

import {
  AlertCircle,
  CheckCircle,
  FileText,
  Info,
  Loader,
  Save,
  X,
  ChevronRight,
} from "lucide-react";

export default function EditarCitaPage() {
  const router = useRouter();
  const params = useParams();
  const citaId = params?.id;

  const { user } = useAuth();
  const {
    centros: allowedCentros,
    talleres: allowedTalleres,
    loading: scopeLoading,
  } = useUserScope();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // valores actuales editables
  const [clienteId, setClienteId] = useState(null);
  const [vehiculoId, setVehiculoId] = useState(null);

  // valores iniciales solo para precarga
  const [initialClienteId, setInitialClienteId] = useState(null);
  const [initialVehiculoId, setInitialVehiculoId] = useState(null);

  const [motivos, setMotivos] = useState([
    { motivo_id: null, submotivo_id: null, submotivos: [] },
  ]);

  const [horario, setHorario] = useState(null);
  const [initialHorario, setInitialHorario] = useState(null);

  const [datos, setDatos] = useState({
    origen_id: null,
    tipo_servicio: "TALLER",
    servicio_valet: false,
    fecha_promesa: "",
    hora_promesa: "",
    nota_cliente: "",
    nota_interna: "",
    files: [],
  });

  function handleClienteSelect(data) {
    setClienteId(data?.cliente?.id || null);
    setVehiculoId(data?.vehiculo?.id || null);
  }

  useEffect(() => {
    if (!citaId || scopeLoading) return;

    async function loadCita() {
      try {
        setLoading(true);

        const [citaRes, motivosRes] = await Promise.all([
          fetch(`/api/citas/${citaId}`, { cache: "no-store" }),
          fetch(`/api/citas/${citaId}/motivos`, { cache: "no-store" }),
        ]);

        const citaJson = await citaRes.json();
        const motivosJson = await motivosRes.json();

        console.log("CITA EDITAR JSON:", citaJson);

        if (!citaRes.ok) {
          throw new Error(citaJson?.message || "No se pudo cargar la cita");
        }

        if (
          allowedCentros.length > 0 &&
          !allowedCentros.includes(Number(citaJson.centro_id))
        ) {
          throw new Error("No tienes permiso para editar una cita de ese centro");
        }

        if (
          citaJson.taller_id &&
          allowedTalleres.length > 0 &&
          !allowedTalleres.includes(Number(citaJson.taller_id))
        ) {
          throw new Error("No tienes permiso para editar una cita de ese taller");
        }

        // iniciales
        setInitialClienteId(citaJson.cliente_id || null);
        setInitialVehiculoId(citaJson.vehiculo_id || null);

        // actuales
        setClienteId(citaJson.cliente_id || null);
        setVehiculoId(citaJson.vehiculo_id || null);

        const horarioInicial = {
          centro_id: citaJson.centro_id || null,
          taller_id: citaJson.taller_id || null,
          asesor_id: citaJson.asesor_id || null,
          start: citaJson.start_at || null,
          end: citaJson.end_at || null,
        };

        setInitialHorario(horarioInicial);
        setHorario(horarioInicial);

        setDatos({
          origen_id: citaJson.origen_id || null,
          tipo_servicio: citaJson.tipo_servicio || "TALLER",
          servicio_valet: !!citaJson.servicio_valet,
          fecha_promesa: citaJson.fecha_promesa || "",
          hora_promesa: citaJson.hora_promesa || "",
          nota_cliente: citaJson.nota_cliente || "",
          nota_interna: citaJson.nota_interna || "",
          files: [],
        });

        if (Array.isArray(motivosJson) && motivosJson.length > 0) {
          setMotivos(
            motivosJson.map((m) => ({
              motivo_id: m.motivo_id || null,
              submotivo_id: m.submotivo_id || null,
              submotivos: [],
            }))
          );
        } else {
          setMotivos([
            { motivo_id: null, submotivo_id: null, submotivos: [] },
          ]);
        }
      } catch (error) {
        console.error(error);
        toast.error(error.message || "Error cargando cita");
        router.push("/citas");
      } finally {
        setLoading(false);
      }
    }

    loadCita();
  }, [citaId, router, scopeLoading, allowedCentros, allowedTalleres]);

  const motivosValidos = motivos.filter((m) => !!m.motivo_id);

  const canSave =
    !!clienteId &&
    !!horario?.centro_id &&
    !!horario?.taller_id &&
    !!horario?.start &&
    !!horario?.end &&
    !saving &&
    !loading &&
    !scopeLoading;

  // Validaciones de completitud
  const isClienteComplete = !!clienteId;
  const isMotivosComplete = motivosValidos.length > 0;
  const isHorarioComplete = !!horario?.centro_id && !!horario?.taller_id && !!horario?.start && !!horario?.end;

  const completionPercentage = [isClienteComplete, isMotivosComplete, isHorarioComplete].filter(Boolean).length;

  async function handleSave() {
    if (!user?.id) {
      toast.error("No se encontró el usuario logueado");
      return;
    }

    if (!clienteId) {
      toast.warning("Seleccione cliente");
      return;
    }

    if (
      !horario?.centro_id ||
      !horario?.taller_id ||
      !horario?.start ||
      !horario?.end
    ) {
      toast.warning("Seleccione horario");
      return;
    }

    if (!allowedCentros.includes(Number(horario.centro_id))) {
      toast.error("No tienes permiso para usar ese centro");
      return;
    }

    if (!allowedTalleres.includes(Number(horario.taller_id))) {
      toast.error("No tienes permiso para usar ese taller");
      return;
    }

    if (motivosValidos.length === 0) {
      toast.warning("Seleccione al menos un motivo");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        cliente_id: clienteId,
        vehiculo_id: vehiculoId,
        centro_id: horario.centro_id,
        taller_id: horario.taller_id,
        asesor_id: horario.asesor_id,
        start_at: horario.start,
        end_at: horario.end,
        origen_id: datos.origen_id,
        tipo_servicio: datos.tipo_servicio || "TALLER",
        servicio_valet: !!datos.servicio_valet,
        fecha_promesa: datos.servicio_valet ? datos.fecha_promesa || null : null,
        hora_promesa: datos.servicio_valet ? datos.hora_promesa || null : null,
        nota_cliente: datos.nota_cliente || null,
        nota_interna: datos.nota_interna || null,
      };

      const citaRes = await fetch(`/api/citas/${citaId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const citaJson = await citaRes.json();

      if (!citaRes.ok) {
        throw new Error(citaJson?.message || "No se pudo actualizar la cita");
      }

      const motivosRes = await fetch(`/api/citas/${citaId}/motivos`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          motivosValidos.map((m) => ({
            motivo_id: m.motivo_id,
            submotivo_id: m.submotivo_id || null,
          }))
        ),
      });

      const motivosJson = await motivosRes.json();

      if (!motivosRes.ok) {
        throw new Error(
          motivosJson?.message || "No se pudieron actualizar los motivos"
        );
      }

      if (datos.files?.length) {
        for (const file of datos.files) {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("user_id", String(user.id));

          const fileRes = await fetch(`/api/citas/${citaId}/archivos`, {
            method: "POST",
            body: formData,
          });

          const fileJson = await fileRes.json();

          if (!fileRes.ok) {
            throw new Error(fileJson?.message || "Error subiendo archivos");
          }
        }
      }

      toast.success("¡Cita actualizada correctamente!");
      router.push("/citas");
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error actualizando cita");
    } finally {
      setSaving(false);
    }
  }

  if (scopeLoading || loading) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="text-center space-y-3">
          <Loader size={40} className="mx-auto text-blue-600 animate-spin" />
          <h1 className="text-2xl font-semibold text-slate-900">Editar cita</h1>
          <p className="text-sm text-muted-foreground">Cargando información...</p>
        </div>
      </div>
    );
  }

  if (allowedCentros.length === 0) {
    return (
      <div className="p-6 h-full flex items-center justify-center">
        <div className="max-w-md w-full">
          <div className="p-6 border border-amber-200 bg-amber-50 rounded-lg text-center space-y-3">
            <AlertCircle size={40} className="mx-auto text-amber-600" />
            <h1 className="text-2xl font-semibold text-slate-900">Editar cita</h1>
            <p className="text-sm text-amber-700">
              No tienes centros asignados para editar citas. Contacta con administración.
            </p>
            <Button 
              variant="outline" 
              onClick={() => router.push("/citas")}
              className="w-full mt-4"
            >
              Volver al calendario
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="p-6 h-full flex flex-col bg-gradient-to-b from-slate-50 to-white">
        
        {/* HEADER */}
        <div className="mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Editar cita #{citaId}</h1>
              <p className="text-sm text-muted-foreground mt-2">
                Actualice la información de la cita existente
              </p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => router.push("/citas")}
                  className="h-8 w-8"
                >
                  <X size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left">Cerrar sin guardar</TooltipContent>
            </Tooltip>
          </div>

          {/* PROGRESS BAR */}
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">
                Completitud del formulario
              </span>
              <span className="text-xs font-bold text-blue-600">
                {completionPercentage}/3
              </span>
            </div>
            <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-purple-600 transition-all duration-300"
                style={{ width: `${(completionPercentage / 3) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* CONTENIDO PRINCIPAL */}
        <div className="flex-1 overflow-y-auto pr-2 -mr-2">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-6">
            
            {/* COLUMNA PRINCIPAL */}
            <div className="space-y-6">
              
              {/* PASO 1: CLIENTE */}
              <div className="relative">
                <div className="absolute -left-8 top-6 w-6 h-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-bold">
                  1
                </div>
                {isClienteComplete && (
                  <div className="absolute -left-8 top-6 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center">
                    <CheckCircle size={16} />
                  </div>
                )}
                <ClienteSelectCard
                  key={`cliente-${citaId}-${initialClienteId}-${initialVehiculoId}`}
                  onSelect={handleClienteSelect}
                  initialClienteId={initialClienteId}
                  initialVehiculoId={initialVehiculoId}
                />
              </div>

              {/* PASO 2: MOTIVOS */}
              <div className="relative">
                <div className="absolute -left-8 top-6 w-6 h-6 rounded-full bg-purple-600 text-white text-xs flex items-center justify-center font-bold">
                  2
                </div>
                {isMotivosComplete && (
                  <div className="absolute -left-8 top-6 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center">
                    <CheckCircle size={16} />
                  </div>
                )}
                <MotivosVisitaCard
                  value={motivos}
                  onChange={setMotivos}
                />
              </div>

              {/* PASO 3: HORARIO */}
              <div className="relative">
                <div className="absolute -left-8 top-6 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs flex items-center justify-center font-bold">
                  3
                </div>
                {isHorarioComplete && (
                  <div className="absolute -left-8 top-6 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center">
                    <CheckCircle size={16} />
                  </div>
                )}
                <Paso3Horario
                  key={`horario-${citaId}-${initialHorario?.centro_id}-${initialHorario?.taller_id}-${initialHorario?.start}`}
                  onChange={setHorario}
                  initialValue={initialHorario}
                  allowedCentros={allowedCentros}
                  allowedTalleres={allowedTalleres}
                />
              </div>
            </div>

            {/* SIDEBAR */}
            <aside className="border rounded-xl p-4 bg-white shadow-sm h-fit sticky top-4 lg:top-6">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-4 border-b">
                  <FileText size={18} className="text-slate-600" />
                  <h3 className="font-semibold text-slate-900">Detalles adicionales</h3>
                </div>
                <CitaDatosCard
                  value={datos}
                  onChange={setDatos}
                />
              </div>
            </aside>
          </div>
        </div>

        {/* FOOTER - ACCIONES */}
        <div className="pt-4 flex justify-between items-center border-t mt-6">
          <div className="flex items-center gap-1">
            <Info size={14} className="text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {completionPercentage === 3 ? "Formulario listo para guardar" : `Completa ${3 - completionPercentage} paso${3 - completionPercentage !== 1 ? "s" : ""}`}
            </span>
          </div>

          <div className="flex gap-3">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  onClick={() => router.push("/citas")}
                  disabled={saving}
                  className="gap-2"
                >
                  <X size={16} />
                  Cancelar
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Vuelve al calendario sin guardar
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={handleSave} 
                  disabled={!canSave}
                  className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
                >
                  {saving ? (
                    <>
                      <Loader size={16} className="animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save size={16} />
                      Guardar cambios
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                {!canSave 
                  ? "Completa todos los pasos requeridos"
                  : "Guarda los cambios y vuelve al calendario"
                }
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* DEBUG INFO - SOLO EN DESARROLLO */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-4 p-3 bg-slate-100 rounded text-xs text-slate-600 font-mono max-h-20 overflow-y-auto">
            <div className="space-y-1">
              <div>userId: {String(user?.id)}</div>
              <div>citaId: {String(citaId)}</div>
              <div>clienteId: {String(clienteId)} | vehiculoId: {String(vehiculoId)}</div>
              <div>centro: {String(horario?.centro_id)} | taller: {String(horario?.taller_id)}</div>
              <div>start: {String(horario?.start?.slice(0, 16))} | end: {String(horario?.end?.slice(0, 16))}</div>
              <div>motivos válidos: {motivosValidos.length} | tipo_servicio: {String(datos?.tipo_servicio)}</div>
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}