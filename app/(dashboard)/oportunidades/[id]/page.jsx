"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Save, X, Edit2 } from "lucide-react";

export default function OportunidadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const oportunidadId = params?.id;

  const [oportunidad, setOportunidad] = useState(null);
  const [etapaActual, setEtapaActual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});

  // Etapas disponibles (sin "Reprogramado")
  const etapas = [
    { id: 2, nombre: "Nuevo", label: "Nuevo" },
    { id: 3, nombre: "Asignado", label: "Asignado" },
    { id: 4, nombre: "En Atención", label: "En Atención" },
    { id: 5, nombre: "Test Drive", label: "Test Drive" },
    { id: 6, nombre: "Cotización", label: "Cotización" },
    { id: 7, nombre: "Evaluación Crédito", label: "Evaluación Crédit..." },
    { id: 8, nombre: "Reserva", label: "Reserva" },
    { id: 9, nombre: "Venta Facturada", label: "Venta Facturada" },
    { id: 10, nombre: "Cerrada", label: "Cerrada" },
  ];

  const indiceEtapaActual = etapas.findIndex((e) => e.id === etapaActual);

  useEffect(() => {
    if (!oportunidadId) return;

    const cargarOportunidad = async () => {
      try {
        const res = await fetch(`/api/oportunidades/${oportunidadId}`, {
          cache: "no-store",
        });
        const data = await res.json();
        setOportunidad(data);
        setFormData(data);

        // Cambiar a "En Atención" automáticamente (id: 4)
        setEtapaActual(4);
      } catch (error) {
        console.error("Error cargando oportunidad:", error);
      } finally {
        setLoading(false);
      }
    };

    cargarOportunidad();
  }, [oportunidadId]);

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const etapaSeleccionada = etapas.find((e) => e.id === etapaActual);
      const res = await fetch(`/api/oportunidades/${oportunidadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          etapasconversion_id: etapaActual,
          etapa_name: etapaSeleccionada?.nombre,
        }),
      });

      if (res.ok) {
        alert("Cambios guardados exitosamente");
      }
    } catch (error) {
      console.error("Error guardando:", error);
      alert("Error al guardar los cambios");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelar = () => {
    router.back();
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
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Cargando...</p>
      </div>
    );
  }

  if (!oportunidad) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Oportunidad no encontrada</p>
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
            <h1 className="text-2xl font-bold">{oportunidad.cliente_name}</h1>
            <p className="text-gray-600">{oportunidad.oportunidad_id}</p>
          </div>
          <button
            onClick={handleCancelar}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Etapas Navigator */}
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
                {etapa.label}
              </button>

              {index < etapas.length - 1 && (
                <div className="w-8 h-0.5 bg-gray-300" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-3 gap-6">
          {/* Left: Información de la Oportunidad */}
          <div className="col-span-2 space-y-6">
            {/* Información General */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Información General</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-600">Cliente</label>
                    <p className="text-gray-900 font-medium">{oportunidad.cliente_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Código</label>
                    <p className="text-gray-900 font-medium">{oportunidad.oportunidad_id}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Vehículo</label>
                    <p className="text-gray-900">
                      {oportunidad.modelo_name} - {oportunidad.marca_name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Origen</label>
                    <p className="text-gray-900">{oportunidad.origen_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Suborigen</label>
                    <p className="text-gray-900">{oportunidad.suborigen_name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-600">Asignado a</label>
                    <p className="text-gray-900">{oportunidad.asignado_a_name}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Información de la Etapa */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">
                  Información de {etapaActualObj?.nombre}
                </h2>
                <Edit2 className="w-5 h-5 text-gray-400" />
              </div>

              <div className="space-y-4">
                {/* Campos editable por etapa */}
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

                <div>
                  <label className="text-sm font-medium text-gray-600">Temperatura</label>
                  <input
                    type="number"
                    name="temperatura"
                    value={formData.temperatura || 0}
                    onChange={handleInputChange}
                    className="w-full mt-1 p-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                {/* Aquí irán campos específicos por etapa que puedas agregar */}
                <div className="p-4 bg-blue-50 rounded text-blue-700 text-sm">
                  Puedes editar los campos anteriores y guardar los cambios de la etapa actual.
                </div>
              </div>
            </div>

            {/* Información Adicional */}
            <div className="bg-white rounded-lg border p-6">
              <h2 className="text-lg font-semibold mb-4">Información Adicional</h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Correo Electrónico</p>
                  <p className="font-medium">{oportunidad.email || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-600">Teléfono</p>
                  <p className="font-medium">{oportunidad.telefono || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-600">Celular</p>
                  <p className="font-medium">{oportunidad.celular || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-600">DNI</p>
                  <p className="font-medium">{oportunidad.documento || "-"}</p>
                </div>
                <div>
                  <p className="text-gray-600">Fecha de Creación</p>
                  <p className="font-medium">
                    {oportunidad.created_at
                      ? new Date(oportunidad.created_at).toLocaleDateString("es-ES")
                      : "-"}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Última Actualización</p>
                  <p className="font-medium">
                    {oportunidad.updated_at
                      ? new Date(oportunidad.updated_at).toLocaleDateString("es-ES")
                      : "-"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Panel de Acciones */}
          <div className="space-y-4">
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Etapa Actual</h3>
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded">
                <p className="text-lg font-bold text-blue-900">
                  {etapaActualObj?.nombre}
                </p>
              </div>

              {/* Botones de navegación */}
              <div className="space-y-3">
                <div className="flex gap-2">
                  <Button
                    onClick={handleRetroceder}
                    disabled={indiceEtapaActual === 0}
                    variant="outline"
                    className="flex-1"
                  >
                    <ChevronLeft className="w-4 h-4 mr-1" />
                    Atrás
                  </Button>
                  <Button
                    onClick={handleAvanzar}
                    disabled={indiceEtapaActual === etapas.length - 1}
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

                <Button
                  onClick={handleCancelar}
                  variant="outline"
                  className="w-full"
                >
                  Cancelar
                </Button>
              </div>
            </div>

            {/* Resumen de Etapas */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Progreso</h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Etapa</span>
                  <span className="font-medium">
                    {indiceEtapaActual + 1} de {etapas.length}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${((indiceEtapaActual + 1) / etapas.length) * 100}%`,
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Status Card */}
            <div className="bg-white rounded-lg border p-6">
              <h3 className="font-semibold mb-4">Estado</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Etapa Actual:</span>
                  <span className="font-medium text-blue-600">
                    {etapaActualObj?.nombre}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha Agenda:</span>
                  <span className="font-medium">
                    {oportunidad.fecha_agenda
                      ? new Date(oportunidad.fecha_agenda).toLocaleDateString("es-ES")
                      : "-"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Hora:</span>
                  <span className="font-medium">
                    {oportunidad.hora_agenda
                      ? String(oportunidad.hora_agenda).slice(0, 5)
                      : "-"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}