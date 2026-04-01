"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Save, X, Edit2, Loader2, Plus, Trash2, Pencil, MessageSquare, Check, Calendar, FileText, Lock, History, ShoppingCart, Package, Eye } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useUserScope } from "@/hooks/useUserScope";
import CotizacionDialog from "@/app/components/agenda/CotizacionDialog";
import CotizacionesTable from "@/app/components/agenda/CotizacionesTable";
import HistorialDialog from "@/app/components/agenda/HistorialDialog";
import AgregarAccesoriosDialog from "@/app/components/agenda/AgregarAccesoriosDialog";
import PreviewCotizacionDialog from "@/app/components/agenda/PreviewCotizacionDialog";

export default function LeadDetailPage() {
  const router = useRouter();
  const params = useParams();
  const leadId = params?.id;
  const { userId, loading: loadingUserScope } = useUserScope();

  const [lead, setLead] = useState(null);
  const [etapaActual, setEtapaActual] = useState(null);
  const [preguntas, setPreguntas] = useState([]);
  const [respuestas, setRespuestas] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({});
  const [actividades, setActividades] = useState([]);
  const [loadingActividades, setLoadingActividades] = useState(false);
  const [guardandoActividad, setGuardandoActividad] = useState(false);
  const [detalleAccion, setDetalleAccion] = useState("");
  const [etapaProxima, setEtapaProxima] = useState("sin-cambio");
  const [detalles, setDetalles] = useState([]);
  const [guardandoPregunta, setGuardandoPregunta] = useState(null);

  // Historial Dialog
  const [historialDialog, setHistorialDialog] = useState(false);
  const [selectedHistorial, setSelectedHistorial] = useState(null);
  const [historialLoading, setHistorialLoading] = useState(false);

  // Cotizaciones
  const [cotizaciones, setCotizaciones] = useState([]);
  const [dialogCotizacionOpen, setDialogCotizacionOpen] = useState(false);
  const [editingCotizacion, setEditingCotizacion] = useState(null);
  const [deleteCotizacionDialog, setDeleteCotizacionDialog] = useState(false);
  const [deleteCotizacionTarget, setDeleteCotizacionTarget] = useState(null);

  // ✅ ACCESORIOS Y PREVIEW
  const [dialogAccesoriosOpen, setDialogAccesoriosOpen] = useState(false);
  const [previewCotizacionOpen, setPreviewCotizacionOpen] = useState(false);
  const [selectedCotizacionForAccesorios, setSelectedCotizacionForAccesorios] = useState(null);
  const [selectedCotizacionPreview, setSelectedCotizacionPreview] = useState(null);

  // Test Drives
  const [testDrives, setTestDrives] = useState([]);
  const [dialogTestDriveOpen, setDialogTestDriveOpen] = useState(false);
  const [editingTestDrive, setEditingTestDrive] = useState(null);
  const [deleteTestDriveDialog, setDeleteTestDriveDialog] = useState(false);
  const [deleteTestDriveTarget, setDeleteTestDriveTarget] = useState(null);
  const [testDriveFormData, setTestDriveFormData] = useState({
    fecha_testdrive: "",
    hora_inicio: "",
    hora_fin: "",
    modelo_id: "",
    vin: "",
    placa: "",
    descripcion: "",
    estado: "programado",
  });

  // Reservas
  const [reservas, setReservas] = useState([]);
  const [deleteReservaDialog, setDeleteReservaDialog] = useState(false);
  const [deleteReservaTarget, setDeleteReservaTarget] = useState(null);

  // Cierres
  const [cierres, setCierres] = useState([]);
  const [dialogCierreOpen, setDialogCierreOpen] = useState(false);
  const [editingCierre, setEditingCierre] = useState(null);
  const [deleteCierreDialog, setDeleteCierreDialog] = useState(false);
  const [deleteCierreTarget, setDeleteCierreTarget] = useState(null);
  const [cierreFormData, setCierreFormData] = useState({
    detalle: "",
  });

  // Vehículos de interés
  const [vehiculosInteres, setVehiculosInteres] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [versiones, setVersiones] = useState([]);
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

  // Cotización desde vehículo
  const [cotizacionVehiculoMarcaId, setCotizacionVehiculoMarcaId] = useState(null);
  const [cotizacionVehiculoModeloId, setCotizacionVehiculoModeloId] = useState(null);

  // Etapas
  const [etapasData, setEtapasData] = useState([]);

  // Etapas locales para mapeo
  const etapas = [
    { id: 1, nombre: "Nuevo", label: "Nuevo" },
    { id: 2, nombre: "Asignado", label: "Asignado" },
    { id: 4, nombre: "En Atención", label: "En Atención" },
    { id: 5, nombre: "Test drive", label: "Test drive" },
    { id: 6, nombre: "Cotización", label: "Cotización" },
    { id: 7, nombre: "Evaluación crediticia", label: "Eval. crediticia" },
    { id: 8, nombre: "Reserva", label: "Reserva" },
    { id: 9, nombre: "Venta facturada", label: "Venta" },
    { id: 10, nombre: "Cerrada", label: "Cerrada" },
  ];

  const indiceEtapaActual = etapas.findIndex((e) => e.id === etapaActual);

  const getLabel = (etapa) => etapa.label || etapa.nombre;

  // ✅ CAMBIAR API A /api/leads
  const cambiarEtapa = async (nuevoEtapaId, detalle) => {
    try {
      if (!userId) return false;

      const response = await fetch(`/api/leads/${leadId}/etapa`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          etapasconversion_id: nuevoEtapaId,
          created_by: userId,
        }),
      });

      if (response.ok) {
        setEtapaActual(nuevoEtapaId);
        await cargarActividades(leadId);
        return true;
      }
      return false;
    } catch (error) {
      console.error("Error cambiando etapa:", error);
      return false;
    }
  };

  // ✅ CAMBIAR API A /api/leads
  const cargarDetalles = async (lId) => {
    try {
      const resDetalles = await fetch(
        `/api/leads/${lId}/detalles`,
        { cache: "no-store" }
      );
      if (resDetalles.ok) {
        const dataDetalles = await resDetalles.json();
        const detallesList = Array.isArray(dataDetalles)
          ? dataDetalles
          : dataDetalles?.data || [];
        setDetalles(detallesList);
      }
    } catch (error) {
      console.error("Error cargando detalles:", error);
    }
  };

  // ✅ Cargar cotizaciones - CAMBIAR A oportunidad_id
  const cargarCotizaciones = async (lId) => {
    try {
      const response = await fetch(`/api/cotizacionesagenda?oportunidad_id=${lId}`, {
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        setCotizaciones(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error cargando cotizaciones:", error);
    }
  };

  // Cargar etapas desde API
  const cargarEtapas = async () => {
    try {
      const response = await fetch("/api/etapasconversion", {
        cache: "no-store",
      });
      if (response.ok) {
        const data = await response.json();
        setEtapasData(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error cargando etapas:", error);
    }
  };

  // ✅ CALCULAR TEMPERATURA
  const calcularTemperatura = () => {
    if (!etapaActual || etapasData.length === 0) return "0%";

    const etapaActualData = etapasData.find((e) => e.id === etapaActual);
    if (!etapaActualData) return "0%";

    const sortOrderActual = etapaActualData.sort_order;

    let temperaturaCalculada = 0;
    etapasData.forEach((etapa) => {
      if (etapa.sort_order <= sortOrderActual && etapa.is_active === 1) {
        temperaturaCalculada += etapa.descripcion;
      }
    });

    return `${temperaturaCalculada}%`;
  };

  // ✅ GUARDAR RESPUESTA DE PREGUNTA INDIVIDUAL - CAMBIAR A oportunidad_id
  const handleGuardarRespuestaPregunta = async (preguntaId) => {
    if (!userId) {
      toast.error("Usuario no identificado");
      return;
    }

    if (respuestas[preguntaId] === undefined) {
      toast.warning("Completa la respuesta primero");
      return;
    }

    setGuardandoPregunta(preguntaId);
    try {
      const response = await fetch("/api/respuestas-atencion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oportunidad_id: Number(leadId),
          pregunta_id: preguntaId,
          respuesta: respuestas[preguntaId],
          created_by: userId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Error al guardar");
      }

      toast.success("Respuesta guardada");
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.message || "Error al guardar la respuesta");
    } finally {
      setGuardandoPregunta(null);
    }
  };

  useEffect(() => {
    cargarEtapas();
  }, []);

  useEffect(() => {
    if (!leadId || loadingUserScope) return;

    const cargarDatos = async () => {
      try {
        // ✅ CAMBIAR API A /api/leads
        const resLead = await fetch(`/api/leads/${leadId}`, {
          cache: "no-store",
        });
        if (!resLead.ok) throw new Error("Error cargando lead");
        const dataLead = await resLead.json();
        setLead(dataLead);
        setFormData(dataLead);
        setEtapaActual(dataLead.etapasconversion_id);

        const resPreg = await fetch("/api/preguntas-atencion?activa=true", {
          cache: "no-store",
        });
        if (resPreg.ok) {
          const dataPreg = await resPreg.json();
          setPreguntas(Array.isArray(dataPreg) ? dataPreg : []);
        }

        // ✅ CAMBIAR API A oportunidad_id
        const resResp = await fetch(
          `/api/respuestas-atencion?oportunidad_id=${leadId}`,
          { cache: "no-store" }
        );
        if (resResp.ok) {
          const dataResp = await resResp.json();
          if (Array.isArray(dataResp)) {
            const respuestasMap = {};
            dataResp.forEach((r) => {
              respuestasMap[r.pregunta_id] = r.respuesta;
            });
            setRespuestas(respuestasMap);
          }
        }

        // ✅ CAMBIAR API A lead
        const resVeh = await fetch(
          `/api/client-interest-vehicles?client_id=${dataLead.cliente_id}`,
          { cache: "no-store" }
        );
        if (resVeh.ok) {
          const dataVeh = await resVeh.json();
          setVehiculosInteres(Array.isArray(dataVeh) ? dataVeh : []);
        }

        await cargarDetalles(leadId);
        await cargarActividades(leadId);
        await cargarCotizaciones(leadId);

        // ✅ CAMBIAR API A oportunidad_id
        const resTestDrives = await fetch(
          `/api/test-drives?oportunidad_id=${leadId}`,
          { cache: "no-store" }
        );
        if (resTestDrives.ok) {
          const dataTestDrives = await resTestDrives.json();
          setTestDrives(Array.isArray(dataTestDrives) ? dataTestDrives : []);
        }

        // ✅ CAMBIAR API A oportunidad_id
        const resReservas = await fetch(
          `/api/reservas?oportunidad_id=${leadId}`,
          { cache: "no-store" }
        );
        if (resReservas.ok) {
          const dataReservas = await resReservas.json();
          setReservas(Array.isArray(dataReservas) ? dataReservas : []);
        }

        // ✅ CAMBIAR API A oportunidad_id
        const resCierres = await fetch(
          `/api/cierres?oportunidad_id=${leadId}`,
          { cache: "no-store" }
        );
        if (resCierres.ok) {
          const dataCierres = await resCierres.json();
          setCierres(Array.isArray(dataCierres) ? dataCierres : []);
        }

        const [m, mo, v] = await Promise.all([
          fetch("/api/marcas", { cache: "no-store" }).then((r) => r.ok ? r.json() : []),
          fetch("/api/modelos", { cache: "no-store" }).then((r) => r.ok ? r.json() : []),
          fetch("/api/versiones?limit=1000", { cache: "no-store" }).then((r) => r.ok ? r.json() : []),
        ]);

        setMarcas(Array.isArray(m) ? m : []);
        setModelos(Array.isArray(mo) ? mo : []);

        let versionesData = [];
        if (v.data && Array.isArray(v.data)) {
          versionesData = v.data;
        } else if (Array.isArray(v)) {
          versionesData = v;
        }
        setVersiones(versionesData);
      } catch (error) {
        console.error("Error cargando datos:", error);
        toast.error("Error cargando datos: " + error.message);
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [leadId, loadingUserScope]);

  const cargarActividades = async (lId) => {
    try {
      setLoadingActividades(true);
      // ✅ CAMBIAR API A lead_id
      const resActividades = await fetch(
        `/api/actividades-oportunidades?oportunidad_id=${lId}`,
        { cache: "no-store" }
      );
      if (resActividades.ok) {
        const dataActividades = await resActividades.json();
        setActividades(Array.isArray(dataActividades) ? dataActividades : []);
      }
    } catch (error) {
      console.error("Error cargando actividades:", error);
    } finally {
      setLoadingActividades(false);
    }
  };

  const handleGuardarActividad = async () => {
    if (!detalleAccion.trim()) {
      toast.warning("El detalle es requerido");
      return;
    }

    if (!userId) {
      toast.error("Usuario no identificado");
      return;
    }

    setGuardandoActividad(true);
    try {
      const etapaParaActividad = etapaProxima !== "sin-cambio"
        ? Number(etapaProxima)
        : etapaActual;

      // ✅ CAMBIAR API A /api/actividades-oportunidades
      const resActividad = await fetch("/api/actividades-oportunidades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oportunidad_id: Number(leadId),
          etapasconversion_id: etapaParaActividad,
          detalle: detalleAccion,
          created_by: userId,
        }),
      });

      if (!resActividad.ok) {
        const data = await resActividad.json();
        throw new Error(data.message);
      }

      toast.success("Actividad guardada");
      setDetalleAccion("");
      setEtapaProxima("sin-cambio");

      await cargarActividades(leadId);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error: " + error.message);
    } finally {
      setGuardandoActividad(false);
    }
  };

  const handleGuardar = async () => {
    setSaving(true);
    try {
      const etapaSeleccionada = etapas.find((e) => e.id === etapaActual);

      if (!userId) {
        toast.error("Usuario no identificado");
        setSaving(false);
        return;
      }

      // ✅ CAMBIAR API A /api/leads
      await fetch(`/api/leads/${leadId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          etapasconversion_id: etapaActual,
          etapa_name: etapaSeleccionada?.nombre,
        }),
      });

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
      const nuevaEtapa = etapas[indiceEtapaActual + 1];
      setEtapaActual(nuevaEtapa.id);
      setFormData((prev) => ({ ...prev, detalle: "" }));
    }
  };

  const handleRetroceder = () => {
    if (indiceEtapaActual > 0) {
      const nuevaEtapa = etapas[indiceEtapaActual - 1];
      setEtapaActual(nuevaEtapa.id);
      setFormData((prev) => ({ ...prev, detalle: "" }));
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

  // TEST DRIVE FUNCTIONS
  function openCreateTestDrive() {
    setEditingTestDrive(null);
    setTestDriveFormData({
      fecha_testdrive: "",
      hora_inicio: "",
      hora_fin: "",
      modelo_id: "",
      vin: "",
      placa: "",
      descripcion: "",
      estado: "programado",
    });
    setDialogTestDriveOpen(true);
  }

  function openEditTestDrive(testDrive) {
    setEditingTestDrive(testDrive);
    setTestDriveFormData({
      fecha_testdrive: testDrive.fecha_testdrive || "",
      hora_inicio: testDrive.hora_inicio || "",
      hora_fin: testDrive.hora_fin || "",
      modelo_id: testDrive.modelo_id || "",
      vin: testDrive.vin || "",
      placa: testDrive.placa || "",
      descripcion: testDrive.descripcion || "",
      estado: testDrive.estado || "programado",
    });
    setDialogTestDriveOpen(true);
  }

  async function saveTestDrive() {
    if (!testDriveFormData.fecha_testdrive) {
      return toast.warning("Fecha es requerida");
    }
    if (!testDriveFormData.hora_inicio) {
      return toast.warning("Hora de inicio es requerida");
    }
    if (!userId) {
      return toast.error("Usuario no identificado");
    }
    if (!lead?.cliente_id) {
      return toast.error("Cliente no identificado");
    }

    try {
      const url = editingTestDrive
        ? `/api/test-drives/${editingTestDrive.id}`
        : "/api/test-drives";

      const method = editingTestDrive ? "PUT" : "POST";

      const body = editingTestDrive
        ? {
          hora_inicio: testDriveFormData.hora_inicio,
          hora_fin: testDriveFormData.hora_fin || null,
          vin: testDriveFormData.vin || null,
          placa: testDriveFormData.placa || null,
          descripcion: testDriveFormData.descripcion || null,
          estado: testDriveFormData.estado || "programado",
        }
        : {
          oportunidad_id: Number(leadId),
          cliente_id: Number(lead.cliente_id),
          fecha_testdrive: testDriveFormData.fecha_testdrive,
          hora_inicio: testDriveFormData.hora_inicio,
          hora_fin: testDriveFormData.hora_fin || null,
          modelo_id: testDriveFormData.modelo_id ? Number(testDriveFormData.modelo_id) : null,
          vin: testDriveFormData.vin || null,
          placa: testDriveFormData.placa || null,
          descripcion: testDriveFormData.descripcion || null,
          estado: testDriveFormData.estado || "programado",
          created_by: userId,
        };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingTestDrive ? "Test Drive actualizado" : "Test Drive creado");
        setDialogTestDriveOpen(false);

        if (!editingTestDrive) {
          const cambioExitoso = await cambiarEtapa(5, "Test drive programado");
          if (cambioExitoso) {
            toast.success("Etapa cambiada a Test Drive");
          }
        }

        // ✅ CAMBIAR API A oportunidad_id
        const resTestDrives = await fetch(
          `/api/test-drives?oportunidad_id=${leadId}`,
          { cache: "no-store" }
        );
        if (resTestDrives.ok) {
          const dataTestDrives = await resTestDrives.json();
          setTestDrives(Array.isArray(dataTestDrives) ? dataTestDrives : []);
        }
      } else {
        const data = await response.json();
        toast.error(data.message || "Error guardando test drive");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error guardando test drive: " + error.message);
    }
  }

  async function deleteTestDrive() {
    try {
      const response = await fetch(
        `/api/test-drives/${deleteTestDriveTarget.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Test Drive eliminado");
        setDeleteTestDriveDialog(false);

        // ✅ CAMBIAR API A oportunidad_id
        const resTestDrives = await fetch(
          `/api/test-drives?oportunidad_id=${leadId}`,
          { cache: "no-store" }
        );
        if (resTestDrives.ok) {
          const dataTestDrives = await resTestDrives.json();
          setTestDrives(Array.isArray(dataTestDrives) ? dataTestDrives : []);
        }
      } else {
        toast.error("Error eliminando test drive");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error eliminando test drive: " + error.message);
    }
  }

  // RESERVA FUNCTIONS
  async function createReserva() {
    if (!userId) {
      return toast.error("Usuario no identificado");
    }

    try {
      // ✅ CAMBIAR API A oportunidad_id
      const response = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oportunidad_id: Number(leadId),
          created_by: userId,
        }),
      });

      if (response.ok) {
        toast.success("Reserva creada");

        const cambioExitoso = await cambiarEtapa(8, "Reserva creada");
        if (cambioExitoso) {
          toast.success("Etapa cambiada a Reserva");
        }

        // ✅ CAMBIAR API A oportunidad_id
        const resReservas = await fetch(
          `/api/reservas?oportunidad_id=${leadId}`,
          { cache: "no-store" }
        );
        if (resReservas.ok) {
          const dataReservas = await resReservas.json();
          setReservas(Array.isArray(dataReservas) ? dataReservas : []);
        }
      } else {
        const data = await response.json();
        toast.error(data.message || "Error creando reserva");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error creando reserva: " + error.message);
    }
  }

  async function deleteReserva() {
    try {
      const response = await fetch(
        `/api/reservas/${deleteReservaTarget.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Reserva eliminada");
        setDeleteReservaDialog(false);

        // ✅ CAMBIAR API A oportunidad_id
        const resReservas = await fetch(
          `/api/reservas?oportunidad_id=${leadId}`,
          { cache: "no-store" }
        );
        if (resReservas.ok) {
          const dataReservas = await resReservas.json();
          setReservas(Array.isArray(dataReservas) ? dataReservas : []);
        }
      } else {
        toast.error("Error eliminando reserva");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error eliminando reserva: " + error.message);
    }
  }

  // CIERRE FUNCTIONS
  function openCreateCierre() {
    setEditingCierre(null);
    setCierreFormData({ detalle: "" });
    setDialogCierreOpen(true);
  }

  function openEditCierre(cierre) {
    setEditingCierre(cierre);
    setCierreFormData({ detalle: cierre.detalle });
    setDialogCierreOpen(true);
  }

  async function saveCierre() {
    if (!cierreFormData.detalle.trim()) {
      return toast.warning("Detalle del cierre es requerido");
    }

    if (!userId) {
      return toast.error("Usuario no identificado");
    }

    try {
      const url = editingCierre
        ? `/api/cierres/${editingCierre.id}`
        : "/api/cierres";

      const method = editingCierre ? "PUT" : "POST";

      const body = editingCierre
        ? { detalle: cierreFormData.detalle }
        : {
          oportunidad_id: Number(leadId),
          detalle: cierreFormData.detalle,
          created_by: userId,
        };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingCierre ? "Cierre actualizado" : "Cierre creado");
        setDialogCierreOpen(false);
        setCierreFormData({ detalle: "" });

        if (!editingCierre) {
          const cambioExitoso = await cambiarEtapa(10, "Oportunidad cerrada: " + cierreFormData.detalle);
          if (cambioExitoso) {
            toast.success("Etapa cambiada a Cerrada");
          }
        }

        // ✅ CAMBIAR API A oportunidad_id
        const resCierres = await fetch(
          `/api/cierres?oportunidad_id=${leadId}`,
          { cache: "no-store" }
        );
        if (resCierres.ok) {
          const dataCierres = await resCierres.json();
          setCierres(Array.isArray(dataCierres) ? dataCierres : []);
        }
      } else {
        const data = await response.json();
        toast.error(data.message || "Error guardando cierre");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error guardando cierre: " + error.message);
    }
  }

  async function deleteCierre() {
    try {
      const response = await fetch(
        `/api/cierres/${deleteCierreTarget.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Cierre eliminado");
        setDeleteCierreDialog(false);

        // ✅ CAMBIAR API A oportunidad_id
        const resCierres = await fetch(
          `/api/cierres?oportunidad_id=${leadId}`,
          { cache: "no-store" }
        );
        if (resCierres.ok) {
          const dataCierres = await resCierres.json();
          setCierres(Array.isArray(dataCierres) ? dataCierres : []);
        }
      } else {
        toast.error("Error eliminando cierre");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error eliminando cierre: " + error.message);
    }
  }

  // VEHÍCULOS FUNCTIONS
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

  function openCotizacionVehiculo(vehiculo) {
    setCotizacionVehiculoMarcaId(vehiculo.marca_id);
    setCotizacionVehiculoModeloId(vehiculo.modelo_id);
    setDialogCotizacionOpen(true);
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
          client_id: lead.cliente_id,
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

        const resVeh = await fetch(
          `/api/client-interest-vehicles?client_id=${lead.cliente_id}`,
          { cache: "no-store" }
        );
        if (resVeh.ok) {
          const dataVeh = await resVeh.json();
          setVehiculosInteres(Array.isArray(dataVeh) ? dataVeh : []);
        }
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

        const resVeh = await fetch(
          `/api/client-interest-vehicles?client_id=${lead.cliente_id}`,
          { cache: "no-store" }
        );
        if (resVeh.ok) {
          const dataVeh = await resVeh.json();
          setVehiculosInteres(Array.isArray(dataVeh) ? dataVeh : []);
        }
      } else {
        toast.error("Error eliminando vehículo");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error eliminando vehículo");
    }
  }

  // COTIZACIONES FUNCTIONS
  function openCreateCotizacion() {
    setEditingCotizacion(null);
    setCotizacionVehiculoMarcaId(null);
    setCotizacionVehiculoModeloId(null);
    setDialogCotizacionOpen(true);
  }

  function openEditCotizacion(cotizacion) {
    setEditingCotizacion(cotizacion);
    setCotizacionVehiculoMarcaId(null);
    setCotizacionVehiculoModeloId(null);
    setDialogCotizacionOpen(true);
  }

  function openDeleteCotizacion(cotizacion) {
    setDeleteCotizacionTarget(cotizacion);
    setDeleteCotizacionDialog(true);
  }

  async function confirmDeleteCotizacion() {
    try {
      const response = await fetch(
        `/api/cotizacionesagenda/${deleteCotizacionTarget.id}`,
        { method: "DELETE" }
      );

      if (response.ok) {
        toast.success("Cotización eliminada");
        setDeleteCotizacionDialog(false);
        await cargarCotizaciones(leadId);
      } else {
        toast.error("Error eliminando cotización");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error eliminando cotización");
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

  if (loading || loadingUserScope) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <p className="text-slate-600">Lead no encontrado</p>
      </div>
    );
  }

  const etapaActualObj = etapas.find((e) => e.id === etapaActual);
  const modelosFiltrados = vehiculoFormData.marca_id
    ? modelos.filter((m) => m.marca_id === parseInt(vehiculoFormData.marca_id))
    : [];

  const temperaturaNum = calcularTemperatura();
  const temperaturaNumericValue = parseInt(temperaturaNum.replace("%", ""));

  let temperaturaColor = "bg-slate-400";
  let temperaturaLabel = "Fría";

  if (temperaturaNumericValue >= 75) {
    temperaturaColor = "bg-red-500";
    temperaturaLabel = "Muy caliente";
  } else if (temperaturaNumericValue >= 50) {
    temperaturaColor = "bg-orange-500";
    temperaturaLabel = "Caliente";
  } else if (temperaturaNumericValue >= 25) {
    temperaturaColor = "bg-yellow-500";
    temperaturaLabel = "Templada";
  }

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        {/* HEADER */}
        <div className="bg-white border-b border-slate-200 p-6 sticky top-0 z-20 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">{lead.cliente_nombre}</h1>
              <p className="text-slate-600 text-sm mt-1">{lead.oportunidad_id || `LD-${lead.id}`}</p>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleCancelar}
                  className="text-slate-500 hover:text-slate-700 p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">Cerrar</TooltipContent>
            </Tooltip>
          </div>

          {/* ETAPAS NAVIGATOR */}
          <div className="overflow-x-auto pb-2">
            <div className="flex items-center gap-1 min-w-min">
              {etapas.map((etapa, index) => {
                const isCompleted = indiceEtapaActual > index;
                const isActive = etapaActual === etapa.id;

                return (
                  <div key={etapa.id} className="flex items-center gap-1 flex-shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setEtapaActual(etapa.id)}
                          className={`px-3 py-2 rounded-lg font-medium text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${isActive
                            ? "bg-blue-600 text-white shadow-lg"
                            : isCompleted
                              ? "bg-green-100 text-green-700 hover:bg-green-200"
                              : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                            }`}
                        >
                          {isCompleted && <Check size={14} />}
                          {etapa.label}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top">{etapa.nombre}</TooltipContent>
                    </Tooltip>

                    {index < etapas.length - 1 && (
                      <div className={`w-6 h-0.5 ${isCompleted ? "bg-green-400" : "bg-slate-300"}`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-6 max-w-7xl mx-auto">
          <div className="grid grid-cols-3 gap-6">
            {/* LEFT COLUMN */}
            <div className="col-span-2 space-y-6">
              {/* INFORMACIÓN GENERAL */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información General</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-600 font-semibold uppercase">Cliente</p>
                      <p className="text-slate-900 font-medium">{lead.cliente_nombre}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-semibold uppercase">Código</p>
                      <p className="text-slate-900 font-mono font-medium">{lead.oportunidad_id || `LD-${lead.id}`}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-semibold uppercase">Origen</p>
                      <p className="text-slate-900">{lead.origen_nombre}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-semibold uppercase">Suborigen</p>
                      <p className="text-slate-900">{lead.suborigen_nombre}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-semibold uppercase">Asignado a</p>
                      <p className="text-slate-900">{lead.asignado_a_nombre || "Sin asignar"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* INFORMACIÓN ADICIONAL */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Información Adicional</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs text-slate-600 font-semibold uppercase">Correo</p>
                      <p className="text-slate-900">{lead.cliente_email || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-semibold uppercase">Teléfono</p>
                      <p className="text-slate-900">{lead.cliente_telefono || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-semibold uppercase">Celular</p>
                      <p className="text-slate-900">{lead.celular || "-"}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600 font-semibold uppercase">DNI</p>
                      <p className="text-slate-900">{lead.cliente_dni || "-"}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* DETALLES DE AGENDA */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar size={18} />
                    Detalles de Agenda
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {detalles.length === 0 ? (
                    <p className="text-slate-500 text-sm py-4">Sin detalles de agenda</p>
                  ) : (
                    <div className="space-y-3">
                      {detalles.map((detalle) => (
                        <div
                          key={detalle.id}
                          className="flex items-start justify-between p-3 bg-blue-50 rounded-lg border border-blue-200 hover:border-blue-300 transition-colors"
                        >
                          <div>
                            <p className="font-medium text-slate-900">
                              📅 {new Date(detalle.fecha_agenda).toLocaleDateString("es-ES")}
                            </p>
                            <p className="text-sm text-slate-700 mt-1">
                              🕐 {String(detalle.hora_agenda).substring(0, 5)}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                              {new Date(detalle.created_at).toLocaleString("es-ES")}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* VEHÍCULOS DE INTERÉS */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg">Vehículos de Interés</CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={openCreateVehiculo} size="sm" className="gap-2">
                        <Plus className="h-4 w-4" /> Agregar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Agregar vehículo de interés</TooltipContent>
                  </Tooltip>
                </CardHeader>
                <CardContent>
                  {vehiculosInteres.length === 0 ? (
                    <p className="text-slate-500 text-sm py-4">Sin vehículos de interés</p>
                  ) : (
                    <div className="space-y-2">
                      {vehiculosInteres.map((vehiculo) => (
                        <div
                          key={vehiculo.id}
                          className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                        >
                          <div>
                            <p className="font-medium text-slate-900">
                              {vehiculo.marca || "Sin marca"} {vehiculo.modelo || ""}
                            </p>
                            <p className="text-xs text-slate-600">
                              {vehiculo.anio_interes || "Sin año"} • {vehiculo.source}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => openCotizacionVehiculo(vehiculo)}
                                  className="h-8 w-8"
                                >
                                  <ShoppingCart size={14} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Crear cotización</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => openEditVehiculo(vehiculo)}
                                  className="h-8 w-8"
                                >
                                  <Pencil size={14} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Editar</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  onClick={() => openDeleteVehiculo(vehiculo)}
                                  className="h-8 w-8"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Eliminar</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* INFORMACIÓN DE ETAPA - CON BOTONES PARA GUARDAR PREGUNTAS */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    Información de {etapaActualObj?.nombre}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  

                  {preguntas.length > 0 && (
                    <div className="space-y-4 pt-4 border-t border-slate-200">
                      <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                        <MessageSquare size={18} />
                        Preguntas de Atención
                      </h3>

                      {preguntas.map((pregunta) => (
                        <div key={pregunta.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                          <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-slate-700 flex items-center gap-1 flex-1">
                              {pregunta.pregunta}
                              {pregunta.es_obligatoria && (
                                <span className="text-red-500">*</span>
                              )}
                            </label>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  onClick={() => handleGuardarRespuestaPregunta(pregunta.id)}
                                  disabled={guardandoPregunta === pregunta.id}
                                  size="sm"
                                  className="gap-2 ml-2"
                                >
                                  {guardandoPregunta === pregunta.id ? (
                                    <>
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                      Guardando...
                                    </>
                                  ) : (
                                    <>
                                      <Save className="h-4 w-4" />
                                      Guardar
                                    </>
                                  )}
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Guardar respuesta</TooltipContent>
                            </Tooltip>
                          </div>
                          {renderCampoPregunta(pregunta)}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* REGISTRAR ACTIVIDAD Y HISTORIAL */}
              <div className="md:col-span-2 space-y-4 pt-6 border-t-2 border-slate-200">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-4 space-y-3 border border-blue-200">
                  <div className="flex items-center gap-2">
                    <MessageSquare size={18} className="text-blue-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Registrar nueva actividad
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-slate-700 block mb-2">
                        Etapa donde registrar (opcional)
                      </label>
                      <Select
                        value={etapaProxima}
                        onValueChange={setEtapaProxima}
                        disabled={guardandoActividad}
                      >
                        <SelectTrigger className="h-9">
                          <SelectValue placeholder="Seleccionar etapa" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sin-cambio">
                            Etapa actual
                          </SelectItem>
                          {etapas.map((item) => (
                            <SelectItem key={item.id} value={String(item.id)}>
                              {getLabel(item)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-slate-700 block mb-2">
                      Detalle *
                    </label>
                    <textarea
                      className="w-full h-20 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                      value={detalleAccion}
                      onChange={(e) => setDetalleAccion(e.target.value)}
                      placeholder="Describe qué acción se realizó, qué se comentó, etc."
                      disabled={guardandoActividad}
                    />
                  </div>

                  <Button
                    onClick={handleGuardarActividad}
                    disabled={guardandoActividad || !detalleAccion.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="sm"
                  >
                    {guardandoActividad
                      ? "Guardando..."
                      : "Guardar actividad"}
                  </Button>
                </div>

                {/* HISTORIAL */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <History size={18} className="text-slate-600" />
                    <h3 className="text-sm font-semibold text-slate-900">
                      Historial ({actividades.length})
                    </h3>
                  </div>

                  {loadingActividades ? (
                    <div className="text-center text-muted-foreground text-sm py-4 bg-slate-50 rounded">
                      Cargando...
                    </div>
                  ) : actividades.length === 0 ? (
                    <div className="text-center text-muted-foreground text-sm py-4 bg-slate-50 rounded border border-dashed border-slate-300">
                      No hay actividades
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-[250px] overflow-y-auto pr-2">
                      {actividades.map((actividad) => {
                        const etapaActividad = actividad.etapasconversion_id
                          ? etapas.find(
                            (e) => e.id === actividad.etapasconversion_id
                          )
                          : null;

                        return (
                          <div
                            key={actividad.id}
                            className="border border-slate-200 rounded p-3 bg-white text-xs space-y-2 hover:shadow-md hover:border-blue-300 transition-all"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <p className="font-semibold text-slate-800">
                                  {actividad.created_by_name ||
                                    `ID ${actividad.created_by}`}
                                </p>
                              </div>
                              <div className="text-right flex-shrink-0">
                                <p className="text-slate-500">
                                  {format(
                                    new Date(actividad.created_at),
                                    "dd/MM HH:mm",
                                    { locale: es }
                                  )}
                                </p>
                              </div>
                            </div>

                            {etapaActividad && (
                              <div>
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 rounded-full text-xs font-semibold border border-blue-200">
                                  {getLabel(etapaActividad)}
                                </span>
                              </div>
                            )}

                            <p className="text-slate-700 line-clamp-3 leading-relaxed">
                              {actividad.detalle}
                            </p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* COTIZACIONES */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText size={18} />
                    Cotizaciones
                  </CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={openCreateCotizacion} size="sm" className="gap-2">
                        <Plus className="h-4 w-4" /> Agregar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Crear nueva cotización</TooltipContent>
                  </Tooltip>
                </CardHeader>
                <CardContent>
                  <CotizacionesTable
                    cotizaciones={cotizaciones}
                    sortConfig={{ key: "id", direction: "asc" }}
                    onSort={() => { }}
                    onEdit={openEditCotizacion}
                    onDelete={openDeleteCotizacion}
                    onChangeStatus={async (cot, estado) => {
                      const res = await fetch(`/api/cotizacionesagenda/${cot.id}`, {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          sku: cot.sku,
                          color_externo: cot.color_externo,
                          color_interno: cot.color_interno,
                          version_id: cot.version_id,
                          anio: cot.anio,
                          marca_id: cot.marca_id,
                          modelo_id: cot.modelo_id,
                          estado,
                        }),
                      });
                      if (res.ok) {
                        toast.success(`Estado cambiado a ${estado}`);
                        if (estado === "enviada") {
                          await cambiarEtapa(6, "Cotización enviada");
                        }
                        await cargarCotizaciones(leadId);
                      }
                    }}
                    onDuplicate={async (cot) => {
                      const res = await fetch("/api/cotizacionesagenda", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          oportunidad_id: Number(leadId),
                          marca_id: cot.marca_id,
                          modelo_id: cot.modelo_id,
                          version_id: cot.version_id,
                          anio: cot.anio,
                          sku: cot.sku,
                          color_externo: cot.color_externo,
                          color_interno: cot.color_interno,
                          estado: "borrador",
                          created_by: userId,
                        }),
                      });
                      if (res.ok) {
                        toast.success("Cotización duplicada");
                        await cargarCotizaciones(leadId);
                      }
                    }}
                    onLoadHistorial={() => { }}
                    saving={false}
                    userId={userId}
                    onOpenHistorialDialog={(historialData) => {
                      setSelectedHistorial(historialData);
                      setHistorialDialog(true);
                    }}
                    // ✅ NUEVOS PROPS PARA ACCESORIOS Y PREVIEW
                    onAddAccesorios={(cot) => {
                      setSelectedCotizacionForAccesorios(cot);
                      setDialogAccesoriosOpen(true);
                    }}
                    onPreview={(cot) => {
                      setSelectedCotizacionPreview(cot);
                      setPreviewCotizacionOpen(true);
                    }}
                  />
                </CardContent>
              </Card>

              {/* TEST DRIVES */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Calendar size={18} />
                    Test Drive
                  </CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={openCreateTestDrive} size="sm" className="gap-2">
                        <Plus className="h-4 w-4" /> Agregar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Programar nuevo test drive</TooltipContent>
                  </Tooltip>
                </CardHeader>
                <CardContent>
                  {testDrives.length === 0 ? (
                    <p className="text-slate-500 text-sm py-4">Sin test drives registrados</p>
                  ) : (
                    <div className="space-y-2">
                      {testDrives.map((testDrive) => (
                        <div
                          key={testDrive.id}
                          className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                        >
                          <div className="flex-1">
                            <p className="font-medium text-slate-900">
                              {new Date(testDrive.fecha_testdrive).toLocaleDateString("es-ES")} a las {testDrive.hora_inicio}
                            </p>
                            <p className="text-xs text-slate-600 mt-1">
                              {testDrive.placa && `Placa: ${testDrive.placa}`}
                              {testDrive.vin && ` • VIN: ${testDrive.vin}`}
                            </p>
                            {testDrive.descripcion && (
                              <p className="text-xs text-slate-700 mt-1">{testDrive.descripcion}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-semibold ${testDrive.estado === 'realizado' ? 'bg-green-100 text-green-700' :
                              testDrive.estado === 'cancelado' ? 'bg-red-100 text-red-700' :
                                'bg-blue-100 text-blue-700'
                              }`}>
                              {testDrive.estado}
                            </span>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => openEditTestDrive(testDrive)}
                                  className="h-8 w-8"
                                >
                                  <Pencil size={14} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Editar</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  onClick={() => {
                                    setDeleteTestDriveTarget(testDrive);
                                    setDeleteTestDriveDialog(true);
                                  }}
                                  className="h-8 w-8"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Eliminar</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* RESERVAS */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText size={18} />
                    Reservas
                  </CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={createReserva}
                        size="sm"
                        className="gap-2"
                        disabled={reservas.length > 0}
                      >
                        <Plus className="h-4 w-4" /> Agregar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      {reservas.length > 0 ? "Ya existe una reserva" : "Crear nueva reserva"}
                    </TooltipContent>
                  </Tooltip>
                </CardHeader>
                <CardContent>
                  {reservas.length === 0 ? (
                    <p className="text-slate-500 text-sm py-4">Sin reservas registradas</p>
                  ) : (
                    <div className="space-y-2">
                      {reservas.map((reserva) => (
                        <div
                          key={reserva.id}
                          className="flex items-start justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                        >
                          <div>
                            <p className="font-medium text-green-900">
                              Reserva creada el {new Date(reserva.created_at).toLocaleDateString("es-ES")}
                            </p>
                            <p className="text-xs text-green-700 mt-1">
                              ID: {reserva.id}
                            </p>
                          </div>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="icon"
                                variant="destructive"
                                onClick={() => {
                                  setDeleteReservaTarget(reserva);
                                  setDeleteReservaDialog(true);
                                }}
                                className="h-8 w-8"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="top">Eliminar</TooltipContent>
                          </Tooltip>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CIERRES */}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Lock size={18} />
                    Cierres
                  </CardTitle>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button onClick={openCreateCierre} size="sm" className="gap-2">
                        <Plus className="h-4 w-4" /> Agregar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Registrar cierre de lead</TooltipContent>
                  </Tooltip>
                </CardHeader>
                <CardContent>
                  {cierres.length === 0 ? (
                    <p className="text-slate-500 text-sm py-4">Sin cierres registrados</p>
                  ) : (
                    <div className="space-y-2">
                      {cierres.map((cierre) => (
                        <div
                          key={cierre.id}
                          className="flex items-start justify-between p-3 bg-slate-50 rounded-lg border border-slate-200"
                        >
                          <div className="flex-1">
                            <p className="text-xs font-semibold text-slate-600 uppercase mb-1">
                              {new Date(cierre.created_at).toLocaleString("es-ES")}
                            </p>
                            <p className="text-sm text-slate-900">{cierre.detalle}</p>
                          </div>
                          <div className="flex gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="outline"
                                  onClick={() => openEditCierre(cierre)}
                                  className="h-8 w-8"
                                >
                                  <Pencil size={14} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Editar</TooltipContent>
                            </Tooltip>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  size="icon"
                                  variant="destructive"
                                  onClick={() => {
                                    setDeleteCierreTarget(cierre);
                                    setDeleteCierreDialog(true);
                                  }}
                                  className="h-8 w-8"
                                >
                                  <Trash2 size={14} />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">Eliminar</TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>


            </div>

            {/* RIGHT COLUMN */}
            <div className="space-y-4">
              {/* ETAPA ACTUAL */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Estado Actual</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 border border-blue-200 rounded-lg">
                    <p className="text-2xl font-bold text-blue-900">
                      {etapaActualObj?.nombre}
                    </p>
                    <p className="text-xs text-blue-700 mt-2">
                      Etapa {indiceEtapaActual + 1} de {etapas.length}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* TEMPERATURA */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Temperatura</CardTitle>
                </CardHeader>
                <CardContent>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="cursor-help">
                        <div className="text-4xl font-bold text-slate-900 mb-2">
                          {temperaturaNum}
                        </div>
                        <div className={`text-sm font-semibold text-white p-2 rounded-lg text-center ${temperaturaColor
                          }`}>
                          {temperaturaLabel}
                        </div>
                        <div className="mt-3 w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                          <div
                            className={temperaturaColor}
                            style={{ width: `${(temperaturaNumericValue / 200) * 100}%` }}
                          />
                        </div>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <div className="text-xs">
                        <div>Temperatura = Suma de etapas anteriores + actual</div>
                        <div className="mt-1">Ejemplo: Etapa 1 (10%) + Etapa 2 (10%) + Etapa 4 (10%) = 30%</div>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>

              {/* PROGRESO */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Progreso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-slate-600">Avance</span>
                      <span className="font-semibold text-slate-900">
                        {Math.round(((indiceEtapaActual + 1) / etapas.length) * 100)}%
                      </span>
                    </div>
                    <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-blue-600 h-3 rounded-full transition-all"
                        style={{
                          width: `${((indiceEtapaActual + 1) / etapas.length) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ACCIONES */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Acciones</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleRetroceder}
                          disabled={indiceEtapaActual === 0}
                          variant="outline"
                          className="flex-1 gap-2"
                        >
                          <ChevronLeft className="h-4 w-4" />
                          Atrás
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Ir a etapa anterior</TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleAvanzar}
                          disabled={indiceEtapaActual === etapas.length - 1}
                          variant="outline"
                          className="flex-1 gap-2"
                        >
                          Adelante
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="top">Ir a etapa siguiente</TooltipContent>
                    </Tooltip>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleGuardar}
                        disabled={saving}
                        className="w-full bg-green-600 hover:bg-green-700 text-white gap-2"
                      >
                        {saving ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            Guardando...
                          </>
                        ) : (
                          <>
                            <Save className="h-4 w-4" />
                            Guardar
                          </>
                        )}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Guardar cambios</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleCancelar}
                        variant="outline"
                        className="w-full"
                      >
                        Cancelar
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">Volver atrás sin guardar</TooltipContent>
                  </Tooltip>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* DIALOGS - IGUAL QUE ANTES */}

        {/* VEHÍCULO DIALOG */}
        <Dialog open={dialogVehiculoOpen} onOpenChange={setDialogVehiculoOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingVehiculo ? "Editar Vehículo" : "Agregar Vehículo de Interés"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
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

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
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
                    {vehiculoFormData.marca_id && modelos
                      .filter((m) => m.marca_id === parseInt(vehiculoFormData.marca_id))
                      .map((m) => (
                        <SelectItem key={m.id} value={m.id.toString()}>
                          {m.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
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

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
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

        <AlertDialog open={deleteVehiculoDialog} onOpenChange={setDeleteVehiculoDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Eliminar el interés en {deleteVehiculoTarget?.marca} {deleteVehiculoTarget?.modelo}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteVehiculo}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* TEST DRIVE DIALOG */}
        <Dialog open={dialogTestDriveOpen} onOpenChange={setDialogTestDriveOpen}>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTestDrive ? "Editar Test Drive" : "Programar Test Drive"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Fecha *
                </label>
                <Input
                  type="date"
                  value={testDriveFormData.fecha_testdrive}
                  onChange={(e) =>
                    setTestDriveFormData((prev) => ({
                      ...prev,
                      fecha_testdrive: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Hora Inicio *
                  </label>
                  <Input
                    type="time"
                    value={testDriveFormData.hora_inicio}
                    onChange={(e) =>
                      setTestDriveFormData((prev) => ({
                        ...prev,
                        hora_inicio: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-slate-700 block mb-2">
                    Hora Fin
                  </label>
                  <Input
                    type="time"
                    value={testDriveFormData.hora_fin}
                    onChange={(e) =>
                      setTestDriveFormData((prev) => ({
                        ...prev,
                        hora_fin: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Modelo
                </label>
                <Select
                  value={testDriveFormData.modelo_id.toString()}
                  onValueChange={(value) =>
                    setTestDriveFormData((prev) => ({
                      ...prev,
                      modelo_id: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un modelo" />
                  </SelectTrigger>
                  <SelectContent>
                    {modelos.map((m) => (
                      <SelectItem key={m.id} value={m.id.toString()}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Placa
                </label>
                <Input
                  value={testDriveFormData.placa}
                  onChange={(e) =>
                    setTestDriveFormData((prev) => ({
                      ...prev,
                      placa: e.target.value,
                    }))
                  }
                  placeholder="Ej: ABC-123"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  VIN
                </label>
                <Input
                  value={testDriveFormData.vin}
                  onChange={(e) =>
                    setTestDriveFormData((prev) => ({
                      ...prev,
                      vin: e.target.value,
                    }))
                  }
                  placeholder="Número de identificación del vehículo"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Descripción
                </label>
                <textarea
                  value={testDriveFormData.descripcion}
                  onChange={(e) =>
                    setTestDriveFormData((prev) => ({
                      ...prev,
                      descripcion: e.target.value,
                    }))
                  }
                  placeholder="Notas adicionales"
                  rows="3"
                  className="w-full p-2 border rounded-md text-sm"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Estado
                </label>
                <Select
                  value={testDriveFormData.estado}
                  onValueChange={(value) =>
                    setTestDriveFormData((prev) => ({
                      ...prev,
                      estado: value,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="programado">Programado</SelectItem>
                    <SelectItem value="realizado">Realizado</SelectItem>
                    <SelectItem value="cancelado">Cancelado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogTestDriveOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={saveTestDrive}>
                {editingTestDrive ? "Actualizar" : "Guardar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteTestDriveDialog} onOpenChange={setDeleteTestDriveDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Eliminar el test drive del {deleteTestDriveTarget && new Date(deleteTestDriveTarget.fecha_testdrive).toLocaleDateString("es-ES")}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteTestDrive}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* CIERRE DIALOG */}
        <Dialog open={dialogCierreOpen} onOpenChange={setDialogCierreOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingCierre ? "Editar Cierre" : "Registrar Cierre"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 block mb-2">
                  Detalle del Cierre *
                </label>
                <textarea
                  value={cierreFormData.detalle}
                  onChange={(e) =>
                    setCierreFormData({ detalle: e.target.value })
                  }
                  placeholder="Describe el motivo del cierre"
                  rows="4"
                  className="w-full p-2 border rounded-md text-sm"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDialogCierreOpen(false)}
              >
                Cancelar
              </Button>
              <Button onClick={saveCierre} className="bg-red-600 hover:bg-red-700">
                {editingCierre ? "Actualizar" : "Registrar"} Cierre
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={deleteCierreDialog} onOpenChange={setDeleteCierreDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Eliminar este cierre?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteCierre}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteReservaDialog} onOpenChange={setDeleteReservaDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Eliminar esta reserva?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={deleteReserva}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={deleteCotizacionDialog} onOpenChange={setDeleteCotizacionDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar eliminación</AlertDialogTitle>
              <AlertDialogDescription>
                ¿Eliminar esta cotización Q-{String(deleteCotizacionTarget?.id).padStart(6, "0")}?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="flex gap-3 justify-end">
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteCotizacion}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Eliminar
              </AlertDialogAction>
            </div>
          </AlertDialogContent>
        </AlertDialog>

        {/* ✅ COTIZACIÓN DIALOG - CON oportunidadId EN LUGAR DE leadId */}
        <CotizacionDialog
          open={dialogCotizacionOpen}
          onOpenChange={setDialogCotizacionOpen}
          editingCotizacion={editingCotizacion}
          oportunidadId={leadId}
          marcas={marcas}
          modelos={modelos}
          versiones={versiones}
          userId={userId}
          onSave={() => cargarCotizaciones(leadId)}
          onCotizacionCreated={async () => {
            const cambioExitoso = await cambiarEtapa(6, "Cotización creada");
            if (cambioExitoso) {
              toast.success("Etapa cambiada a Cotización");
            }
          }}
          precargadaMarcaId={cotizacionVehiculoMarcaId}
          precargadaModeloId={cotizacionVehiculoModeloId}
        />

        {/* ✅ HISTORIAL DIALOG */}
        <HistorialDialog
          open={historialDialog}
          onOpenChange={setHistorialDialog}
          selectedHistorial={selectedHistorial}
          loading={historialLoading}
        />

        {/* ✅ ACCESORIOS DIALOG */}
        <AgregarAccesoriosDialog
          open={dialogAccesoriosOpen}
          onOpenChange={setDialogAccesoriosOpen}
          cotizacion={selectedCotizacionForAccesorios}
          marcaId={selectedCotizacionForAccesorios?.marca_id}
          modeloId={selectedCotizacionForAccesorios?.modelo_id}
        />

        {/* ✅ PREVIEW DIALOG */}
        <PreviewCotizacionDialog
          open={previewCotizacionOpen}
          onOpenChange={setPreviewCotizacionOpen}
          cotizacion={selectedCotizacionPreview}
        />
      </div>
    </TooltipProvider>
  );
}