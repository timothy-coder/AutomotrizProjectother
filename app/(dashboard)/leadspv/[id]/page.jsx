"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Save, X, Edit2, ArrowUpRight, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function LeadPVDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params?.id;

  const [lead, setLead] = useState(null);
  const [etapas, setEtapas] = useState([]);
  const [etapaActual, setEtapaActual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [promoting, setPromoting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [oportunidadId, setOportunidadId] = useState(null);
  const [formData, setFormData] = useState({});

  // Cargar etapas desde la API
  useEffect(() => {
    fetch("/api/etapasconversionpv", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => {
        const lista = Array.isArray(data) ? data : [];
        // Excluir etapas de tipo "Reprogramado" si existieran
        setEtapas(lista.filter((e) => e.id && e.nombre));
      })
      .catch(() => setEtapas([]));
  }, []);

  useEffect(() => {
    if (!leadId) return;

    const cargarLead = async () => {
      try {
        const res = await fetch(`/api/leadspv/${leadId}`, { cache: "no-store" });
        const data = await res.json();
        setLead(data);
        setFormData(data);
        setEtapaActual(data.etapasconversionpv_id || null);

        // Verificar si ya fue promovido
        if (data.oportunidad_padre_id) {
          // Este registro ya es hijo (no debería pasar llegando por LD-)
        }
        // Buscar si tiene un OP- hijo (ya promovido)
        checkIfPromoted(leadId);
      } catch (error) {
        console.error("Error cargando lead:", error);
        toast.error("Error al cargar el lead");
      } finally {
        setLoading(false);
      }
    };

    cargarLead();
  }, [leadId]);

  async function checkIfPromoted(id) {
    try {
      const res = await fetch(`/api/leadspv/${id}/promover`, { method: "GET" }).catch(() => null);
      // No tenemos GET en promover, lo inferimos: si al promover devuelve already_promoted lo mostramos
    } catch {
      // silencioso
    }
  }

  const indiceEtapaActual = etapas.findIndex((e) => e.id === etapaActual);

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/leadspv/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          etapasconversionpv_id: etapaActual,
        }),
      });

      if (res.ok) {
        toast.success("Cambios guardados");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || "Error al guardar los cambios");
      }
    } catch (error) {
      console.error("Error guardando:", error);
      toast.error("Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  const handlePromover = async () => {
    setPromoting(true);
    try {
      const res = await fetch(`/api/leadspv/${leadId}/promover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await res.json();

      if (res.ok) {
        if (data.already_promoted) {
          toast.info(`Ya fue promovido: ${data.oportunidad_id}`);
        } else {
          toast.success(`Enviado a Oportunidades: ${data.oportunidad_id}`);
        }
        setOportunidadId(data.oportunidad_id);
      } else {
        toast.error(data.message || "Error al promover");
      }
    } catch (error) {
      console.error("Error promoviendo:", error);
      toast.error("Error al enviar a oportunidades");
    } finally {
      setPromoting(false);
    }
  };

  const handleEliminar = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/leadspv/${leadId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Lead eliminado");
        router.push("/leadspv");
      } else {
        const data = await res.json().catch(() => ({}));
        toast.error(data.message || "Error al eliminar");
      }
    } catch {
      toast.error("Error al eliminar el lead");
    } finally {
      setDeleting(false);
    }
  };

  const handleAvanzar = () => {
    if (indiceEtapaActual < etapas.length - 1) {
      setEtapaActual(etapas[indiceEtapaActual + 1].id);
    }
  };

  const handleRetroceder = () => {
    if (indiceEtapaActual > 0) {
      setEtapaActual(etapas[indiceEtapaActual - 1].id);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Lead no encontrado</p>
      </div>
    );
  }

  const etapaActualObj = etapas.find((e) => e.id === etapaActual);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-6 sticky top-0 z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">{lead.cliente_name}</h1>
            <p className="text-gray-600">{lead.oportunidad_id}</p>
          </div>
          <button
            onClick={() => router.push("/leadspv")}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Navegador de etapas */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4">
          {etapas.map((etapa, index) => (
            <div key={etapa.id} className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={() => setEtapaActual(etapa.id)}
                className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${
                  etapaActual === etapa.id
                    ? "bg-blue-600 text-white"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {etapa.nombre}
              </button>
              {index < etapas.length - 1 && (
                <div className="w-8 h-0.5 bg-gray-300" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contenido */}
      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-3 gap-6">
          {/* Izquierda */}
          <div className="col-span-2 space-y-6">
            {/* Información General */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Información General</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-600">Cliente</p>
                  <p className="text-gray-900 font-medium">{lead.cliente_name || "-"}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Código</p>
                  <p className="text-gray-900 font-medium">{lead.oportunidad_id}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Origen</p>
                  <p className="text-gray-900">{lead.origen_name || "-"}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Suborigen</p>
                  <p className="text-gray-900">{lead.suborigen_name || "-"}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Asignado a</p>
                  <p className="text-gray-900">{lead.asignado_a_name || "Sin asignar"}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Creado por</p>
                  <p className="text-gray-900">{lead.created_by_name || "-"}</p>
                </div>
              </div>
            </div>

            {/* Vehículo */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Vehículo</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-600">Marca / Modelo</p>
                  <p className="text-gray-900">
                    {[lead.marca_name, lead.modelo_name].filter(Boolean).join(" - ") || "-"}
                  </p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Placas</p>
                  <p className="text-gray-900">{lead.placas || "-"}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">VIN</p>
                  <p className="text-gray-900">{lead.vin || "-"}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Año</p>
                  <p className="text-gray-900">{lead.anio || "-"}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Color</p>
                  <p className="text-gray-900">{lead.color_vehiculo || "-"}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Kilometraje</p>
                  <p className="text-gray-900">
                    {lead.kilometraje != null ? `${lead.kilometraje} km` : "-"}
                  </p>
                </div>
              </div>
            </div>

            {/* Información de Contacto */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Información de Contacto</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-medium text-gray-600">Email</p>
                  <p className="text-gray-900">{lead.email || "-"}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">Celular</p>
                  <p className="text-gray-900">{lead.celular || "-"}</p>
                </div>
                <div>
                  <p className="font-medium text-gray-600">DNI / RUC</p>
                  <p className="text-gray-900">{lead.dni || "-"}</p>
                </div>
              </div>
            </div>

            {/* Notas / Etapa actual */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Información de {etapaActualObj?.nombre || "Etapa"}
                </h2>
                <Edit2 className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-600">Notas</label>
                  <textarea
                    name="detalle"
                    value={formData.detalle || ""}
                    onChange={handleInputChange}
                    placeholder="Añade notas sobre esta etapa"
                    className="w-full mt-1 p-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    rows="4"
                  />
                </div>
                <div className="p-4 bg-blue-50 rounded text-blue-700 text-sm">
                  Puedes editar las notas y cambiar la etapa, luego guarda los cambios.
                </div>
              </div>
            </div>

            {/* Información Adicional */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Información Adicional</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Fecha de Creación</p>
                  <p className="font-medium">
                    {lead.created_at
                      ? new Date(lead.created_at).toLocaleDateString("es-ES")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Última Actualización</p>
                  <p className="font-medium">
                    {lead.updated_at
                      ? new Date(lead.updated_at).toLocaleDateString("es-ES")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Fecha Agenda</p>
                  <p className="font-medium">
                    {lead.fecha_agenda
                      ? new Date(lead.fecha_agenda).toLocaleDateString("es-ES")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Hora Agenda</p>
                  <p className="font-medium">
                    {lead.hora_agenda
                      ? String(lead.hora_agenda).slice(0, 5)
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Derecha: Panel de acciones */}
          <div className="space-y-4">
            {/* Etapa actual */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Etapa Actual</h3>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-lg font-bold text-blue-900">
                  {etapaActualObj?.nombre || "Sin etapa"}
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    onClick={handleRetroceder}
                    disabled={indiceEtapaActual <= 0}
                    variant="outline"
                    className="flex-1"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Atrás
                  </Button>
                  <Button
                    onClick={handleAvanzar}
                    disabled={indiceEtapaActual >= etapas.length - 1}
                    variant="outline"
                    className="flex-1"
                  >
                    Adelante
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </div>

                <Button
                  onClick={handleGuardar}
                  disabled={saving}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? "Guardando..." : "Guardar"}
                </Button>
              </div>
            </div>

            {/* Progreso */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Progreso</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Etapa</span>
                  <span className="font-medium">
                    {indiceEtapaActual >= 0 ? indiceEtapaActual + 1 : "-"} de {etapas.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width:
                        etapas.length > 0 && indiceEtapaActual >= 0
                          ? `${((indiceEtapaActual + 1) / etapas.length) * 100}%`
                          : "0%",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Acciones */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Acciones</h3>
              <div className="space-y-2">
                <button
                  onClick={handlePromover}
                  disabled={promoting || !!oportunidadId}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    oportunidadId
                      ? "bg-green-50 text-green-700 border border-green-200 cursor-default"
                      : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  {oportunidadId
                    ? `Enviado: ${oportunidadId}`
                    : promoting
                    ? "Enviando..."
                    : "Enviar a Oportunidades"}
                </button>

                <button
                  onClick={handleEliminar}
                  disabled={deleting}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  {deleting ? "Eliminando..." : "Eliminar lead"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
