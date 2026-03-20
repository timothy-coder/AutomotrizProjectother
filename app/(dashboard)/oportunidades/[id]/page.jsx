"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Save, X, Edit2, Loader2, Plus, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import CotizacionAgendaSection from "@/app/components/agenda/CotizacionAgendaSection";

export default function OportunidadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const oportunidadId = params?.id;

  const [oportunidad, setOportunidad] = useState(null);
  const [etapaActual, setEtapaActual] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});

  // Vehículos de interés
  const [vehiculosInteres, setVehiculosInteres] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [dialogVehiculoOpen, setDialogVehiculoOpen] = useState(false);
  const [deleteVehiculoDialog, setDeleteVehiculoDialog] = useState(false);
  const [editingVehiculo, setEditingVehiculo] = useState(null);
  const [deleteVehiculoTarget, setDeleteVehiculoTarget] = useState(null);
  const [vehiculoFormData, setVehiculoFormData] = useState({
    marca_id: "",
    modelo_id: "",
    anio_interes: new Date().getFullYear(),
    source: "manual",
  });

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

    const cargarDatos = async () => {
      try {
        // Cargar oportunidad
        const resOp = await fetch(`/api/oportunidades/${oportunidadId}`, {
          cache: "no-store",
        });
        const dataOp = await resOp.json();
        setOportunidad(dataOp);
        setFormData(dataOp);

        // Cargar preguntas
        const resPreg = await fetch("/api/preguntas-atencion?activa=true", {
          cache: "no-store",
        });
        const dataPreg = await resPreg.json();
        setPreguntas(Array.isArray(dataPreg) ? dataPreg : []);

        // Cargar respuestas existentes
        const resResp = await fetch(
          `/api/respuestas-atencion?oportunidad_id=${oportunidadId}`,
          { cache: "no-store" }
        );
        const dataResp = await resResp.json();

        if (Array.isArray(dataResp)) {
          const respuestasMap = {};
          dataResp.forEach((r) => {
            respuestasMap[r.pregunta_id] = r.respuesta;
          });
          setRespuestas(respuestasMap);
        }

        // Cargar vehículos de interés
        const resVeh = await fetch(
          `/api/client-interest-vehicles?client_id=${dataOp.cliente_id}`,
          { cache: "no-store" }
        );
        const dataVeh = await resVeh.json();
        setVehiculosInteres(Array.isArray(dataVeh) ? dataVeh : []);

        // Cargar marcas y modelos
        const [m, mo] = await Promise.all([
          fetch("/api/marcas", { cache: "no-store" }).then((r) => r.json()),
          fetch("/api/modelos", { cache: "no-store" }).then((r) => r.json()),
        ]);

        setMarcas(Array.isArray(m) ? m : []);
        setModelos(Array.isArray(mo) ? mo : []);

        // Cambiar a "En Atención" automáticamente (id: 4)
        setEtapaActual(4);
      } catch (error) {
        console.error("Error cargando datos:", error);
        toast.error("Error cargando datos");
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [oportunidadId]);

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const etapaSeleccionada = etapas.find((e) => e.id === etapaActual);

      // Guardar cambios de la oportunidad
      await fetch(`/api/oportunidades/${oportunidadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          etapasconversion_id: etapaActual,
          etapa_name: etapaSeleccionada?.nombre,
        }),
      });

      // Guardar respuestas de preguntas
      const usuarioId = localStorage.getItem("usuario_id");

      for (const pregunta of preguntas) {
        if (respuestas[pregunta.id] !== undefined) {
          await fetch("/api/respuestas-atencion", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              oportunidad_id: oportunidadId,
              pregunta_id: pregunta.id,
              respuesta: respuestas[pregunta.id],
              created_by: usuarioId,
            }),
          });
        }
      }

      toast.success("Cambios guardados exitosamente");
    } catch (error) {
      console.error("Error guardando:", error);
      toast.error("Error al guardar los cambios");
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

  const handleRespuestaChange = (preguntaId, valor) => {
    setRespuestas((prev) => ({
      ...prev,
      [preguntaId]: valor,
    }));
  };

  // Vehículos de Interés
  function openCreateVehiculo() {
    setEditingVehiculo(null);
    setVehiculoFormData({
      marca_id: "",
      modelo_id: "",
      anio_interes: new Date().getFullYear(),
      source: "manual",
    });
    setDialogVehiculoOpen(true);
  }

  function openEditVehiculo(vehiculo) {
    setEditingVehiculo(vehiculo);
    setVehiculoFormData({
      marca_id: vehiculo.marca_id || "",
      modelo_id: vehiculo.modelo_id || "",
      anio_interes: vehiculo.anio_interes || new Date().getFullYear(),
      source: vehiculo.source || "manual",
    });
    setDialogVehiculoOpen(true);
  }

  async function saveVehiculo() {
    if (!vehiculoFormData.marca_id && !vehiculoFormData.modelo_id) {
      return toast.warning("Selecciona al menos una marca o modelo");
    }

    try {
      const url = editingVehiculo
        ? `/api/client-interest-vehicles/${editingVehiculo.id}`
        : "/api/client-interest-vehicles";

      const method = editingVehiculo ? "PUT" : "POST";

      const body = editingVehiculo
        ? vehiculoFormData
        : {
          ...vehiculoFormData,
          client_id: oportunidad.cliente_id,
        };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(
          editingVehiculo ? "Vehículo actualizado" : "Vehículo añadido"
        );
        setDialogVehiculoOpen(false);

        // Recargar vehículos
        const resVeh = await fetch(
          `/api/client-interest-vehicles?client_id=${oportunidad.cliente_id}`,
          { cache: "no-store" }
        );
        const dataVeh = await resVeh.json();
        setVehiculosInteres(Array.isArray(dataVeh) ? dataVeh : []);
      } else {
        const data = await response.json();
        toast.error(data.message);
      }
    } catch (error) {
      console.error(error);
      toast.error("Error guardando vehículo");
    }
  }

  function openDeleteVehiculo(vehiculo) {
    setDeleteVehiculoTarget(vehiculo);
    setDeleteVehiculoDialog(true);
  }

  async function confirmDeleteVehiculo() {
    try {
      const response = await fetch(
        `/api/client-interest-vehicles/${deleteVehiculoTarget.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Vehículo eliminado");
        setDeleteVehiculoDialog(false);

        // Recargar vehículos
        const resVeh = await fetch(
          `/api/client-interest-vehicles?client_id=${oportunidad.cliente_id}`,
          { cache: "no-store" }
        );
        const dataVeh = await resVeh.json();
        setVehiculosInteres(Array.isArray(dataVeh) ? dataVeh : []);
      } else {
        toast.error("Error eliminando vehículo");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error eliminando vehículo");
    }
  }

  const renderCampoPregunta = (pregunta) => {
    const valor = respuestas[pregunta.id] || "";

    switch (pregunta.tipo_respuesta) {
      case "texto":
        return (
          <textarea
            value={valor}
            onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}
            placeholder="Ingresa tu respuesta"
            className="w-full mt-1 p-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
            rows="3"
          />
        );

      case "numero":
        return (
          <input
            type="number"
            value={valor}
            onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}
            placeholder="Ingresa un número"
            className="w-full mt-1 p-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case "si_no":
        return (
          <div className="flex gap-4 mt-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`pregunta_${pregunta.id}`}
                value="si"
                checked={valor === "si"}
                onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-sm">Sí</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name={`pregunta_${pregunta.id}`}
                value="no"
                checked={valor === "no"}
                onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-sm">No</span>
            </label>
          </div>
        );

      case "opcion_multiple":
        return (
          <select
            value={valor}
            onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}
            className="w-full mt-1 p-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Selecciona una opción</option>
            {pregunta.opciones &&
              pregunta.opciones.map((opcion, idx) => (
                <option key={idx} value={opcion}>
                  {opcion}
                </option>
              ))}
          </select>
        );

      case "fecha":
        return (
          <input
            type="date"
            value={valor}
            onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}
            className="w-full mt-1 p-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        );

      case "hora":
        return (
          <input
            type="time"
            value={valor}
            onChange={(e) => handleRespuestaChange(pregunta.id, e.target.value)}
            className="w-full mt-1 p-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
          />
        );

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
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
  const modelosFiltrados = vehiculoFormData.marca_id
    ? modelos.filter((m) => m.marca_id === parseInt(vehiculoFormData.marca_id))
    : [];

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
                className={`px-4 py-2 rounded-full font-medium text-sm whitespace-nowrap transition-all ${etapaActual === etapa.id
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
            {/* Vehículos de Interés */}
            <div className="bg-white rounded-lg border p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-semibold">Vehículos de Interés</h2>
                <Button onClick={openCreateVehiculo} size="sm">
                  <Plus className="h-4 w-4 mr-2" /> Agregar
                </Button>
              </div>

              {vehiculosInteres.length === 0 ? (
                <p className="text-gray-500 text-sm py-4">No hay vehículos de interés registrados</p>
              ) : (
                <div className="space-y-2">
                  {vehiculosInteres.map((vehiculo) => (
                    <div
                      key={vehiculo.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded border"
                    >
                      <div>
                        <p className="font-medium">
                          {vehiculo.marca || "Sin marca"} {vehiculo.modelo || ""}
                        </p>
                        <p className="text-sm text-gray-600">
                          {vehiculo.anio_interes || "Sin año"} • {vehiculo.source}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="outline"
                          onClick={() => openEditVehiculo(vehiculo)}
                        >
                          <Pencil size={16} />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => openDeleteVehiculo(vehiculo)}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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
                {/* Notas */}
                <div>
                  <label className="text-sm font-medium text-gray-600">Notas</label>
                  <textarea
                    name="detalle"
                    value={formData.detalle || ""}
                    onChange={handleInputChange}
                    placeholder="Añade notas sobre esta etapa"
                    className="w-full mt-1 p-2 border rounded-md text-sm focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                  />
                </div>

                {/* Preguntas del Formulario */}
                {preguntas.length > 0 && (
                  <div className="space-y-4 mt-6 pt-6 border-t">
                    <h3 className="font-semibold text-gray-900">
                      Preguntas de Atención
                    </h3>

                    {preguntas.map((pregunta) => (
                      <div key={pregunta.id}>
                        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
                          {pregunta.pregunta}
                          {pregunta.es_obligatoria && (
                            <span className="text-red-500">*</span>
                          )}
                        </label>
                        {renderCampoPregunta(pregunta)}
                      </div>
                    ))}
                  </div>
                )}

                {preguntas.length === 0 && (
                  <div className="p-4 bg-yellow-50 rounded text-yellow-700 text-sm">
                    No hay preguntas configuradas para esta etapa.
                  </div>
                )}
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
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Guardar
                    </>
                  )}
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

      {/* DIALOG VEHÍCULO */}
      <Dialog open={dialogVehiculoOpen} onOpenChange={setDialogVehiculoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingVehiculo ? "Editar Vehículo" : "Agregar Vehículo de Interés"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Marca */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Marca
              </label>
              <Select
                value={vehiculoFormData.marca_id.toString()}
                onValueChange={(value) =>
                  setVehiculoFormData((prev) => ({
                    ...prev,
                    marca_id: value,
                    modelo_id: "",
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona una marca" />
                </SelectTrigger>
                <SelectContent>
                  {marcas.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Modelo */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Modelo
              </label>
              <Select
                value={vehiculoFormData.modelo_id.toString()}
                onValueChange={(value) =>
                  setVehiculoFormData((prev) => ({
                    ...prev,
                    modelo_id: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un modelo" />
                </SelectTrigger>
                <SelectContent>
                  {modelosFiltrados.map((m) => (
                    <SelectItem key={m.id} value={m.id.toString()}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Año */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Año de Interés
              </label>
              <Input
                type="number"
                value={vehiculoFormData.anio_interes}
                onChange={(e) =>
                  setVehiculoFormData((prev) => ({
                    ...prev,
                    anio_interes: parseInt(e.target.value),
                  }))
                }
                placeholder="Ej: 2024"
                min={2000}
                max={new Date().getFullYear() + 1}
              />
            </div>

            {/* Origen */}
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">
                Origen
              </label>
              <Select
                value={vehiculoFormData.source}
                onValueChange={(value) =>
                  setVehiculoFormData((prev) => ({
                    ...prev,
                    source: value,
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="lead">Lead</SelectItem>
                  <SelectItem value="oportunidad">Oportunidad</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogVehiculoOpen(false)}
            >
              Cancelar
            </Button>
            <Button onClick={saveVehiculo}>
              {editingVehiculo ? "Actualizar" : "Agregar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE VEHÍCULO DIALOG */}
      <Dialog open={deleteVehiculoDialog} onOpenChange={setDeleteVehiculoDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar eliminación</DialogTitle>
          </DialogHeader>

          <p>
            ¿Eliminar el interés en{" "}
            <b>
              {deleteVehiculoTarget?.marca} {deleteVehiculoTarget?.modelo}
            </b>
            ?
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteVehiculoDialog(false)}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={confirmDeleteVehiculo}>
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="bg-white rounded-lg border p-6">
        <CotizacionAgendaSection
          oportunidadId={oportunidadId}
          clienteId={oportunidad.cliente_id}
          oportunidadData={oportunidad}
        />
      </div>
    </div>

  );
}