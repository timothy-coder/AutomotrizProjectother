"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { useRequirePerm } from "@/hooks/useRequirePerm";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  ArrowLeft,
  Building2,
  FileText,
  Download,
  CheckCircle,
  ChevronsUpDown,
  Check,
  Send,
  AlertCircle,
  CheckCheck,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { hasPermission } from "@/lib/permissions";

export default function ReservaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { permissions } = useAuth();

  const canView =
    hasPermission(permissions, "reservas", "view") ||
    hasPermission(permissions, "reservas", "viewall");
  const canViewAll = hasPermission(permissions, "reservas", "viewall");

  useRequirePerm("reservas", "firm");

  const [reserva, setReserva] = useState(null);
  const [detalles, setDetalles] = useState(null);
  const [cliente, setCliente] = useState(null);
  const [cotizacion, setCotizacion] = useState(null);
  const [accesorios, setAccesorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveIndicator, setAutoSaveIndicator] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [changingStatus, setChangingStatus] = useState(false);
  const [clienteLoaded, setClienteLoaded] = useState(false);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [clientVinExists, setClientVinExists] = useState(false);

  const [departamentos, setDepartamentos] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [filteredProvincias, setFilteredProvincias] = useState([]);
  const [filteredDistritos, setFilteredDistritos] = useState([]);
  const [historialesCarros, setHistorialesCarros] = useState([]);
  const [filteredCarros, setFilteredCarros] = useState([]);

  const [openDep, setOpenDep] = useState(false);
  const [openProv, setOpenProv] = useState(false);
  const [openDist, setOpenDist] = useState(false);
  const [openVin, setOpenVin] = useState(false);

  const [formData, setFormData] = useState({
    tipo_comprobante: "",
    vin: "",
    vin_existe: 0,
    usovehiculo: "",
    numero_motor: "",
    dsctotienda: "",
    dsctotiendaporcentaje: "",
    dsctobonoretoma: "",
    dsctonper: "",
    cantidad: "",
    precio_unitario: "",
    flete: "",
    tarjetaplaca: "",
    glp: "",
    tc_referencial: "",
    total: "",
    color_externo: "",
    color_interno: "",
    valores_tc_ref: "",
    cuota_inicial: "",
    monto_aprobado: "",
    observaciones: "",
    observaciones_revisor: "",
    nombre: "",
    apellido: "",
    email: "",
    celular: "",
    identificacion_fiscal: "",
    nombre_comercial: "",
    tipo_identificacion: "",
    fecha_nacimiento: "",
    ocupacion: "",
    domicilio: "",
    departamento_id: "",
    provincia_id: "",
    distrito_id: "",
    nombreconyugue: "",
    dniconyugue: "",
    marca_nombre: "",
    modelo_nombre: "",
    clase_nombre: "",
    version_nombre: "",
    anio: "",
    precio_base: "",
  });

  const calcularTotal = useCallback((data) => {
    const cantidad = parseFloat(data.cantidad || 0);
    const precioUnitario = parseFloat(data.precio_unitario || 0);

    const dsctotienda = parseFloat(data.dsctotienda || 0);
    const dsctotiendaporcentaje = parseFloat(data.dsctotiendaporcentaje || 0);
    const dsctobonoretoma = parseFloat(data.dsctobonoretoma || 0);
    const dsctonper = parseFloat(data.dsctonper || 0);

    const flete = parseFloat(data.flete || 0);
    const tarjetaplaca = parseFloat(data.tarjetaplaca || 0);
    const glp = parseFloat(data.glp || 0);

    const subtotal = cantidad * precioUnitario;
    const descuentoPorcentaje = subtotal * (dsctotiendaporcentaje / 100);

    const total =
      subtotal -
      dsctotienda -
      descuentoPorcentaje -
      dsctobonoretoma -
      dsctonper +
      flete +
      tarjetaplaca +
      glp;

    return Number.isFinite(total) ? total.toFixed(2) : "0.00";
  }, []);

  const isLocked = reserva?.estado === "firmado";

  const handleFieldChange = (field, value) => {
    if (isLocked) return;
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleVinExistsChange = (e) => {
    if (isLocked) return;
    const checked = e.target.checked;
    setClientVinExists(checked);
    setFormData((prev) => ({
      ...prev,
      vin_existe: checked ? 1 : 0,
    }));
  };

  const parseApiJson = async (res, name) => {
    const text = await res.text();
    if (!res.ok) {
      console.error(`${name} respondió con error:`, res.status, text);
      return [];
    }
    try {
      const data = JSON.parse(text);
      return data.data || (Array.isArray(data) ? data : []);
    } catch {
      console.error(`${name} no devolvió JSON válido:`, text);
      return [];
    }
  };

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [depRes, provRes, distRes, carrosRes] = await Promise.all([
          fetch("/api/departamentos"),
          fetch("/api/provincias"),
          fetch("/api/distritos"),
          fetch("/api/historial-carros"),
        ]);

        const deps = await parseApiJson(depRes, "/api/departamentos");
        const provs = await parseApiJson(provRes, "/api/provincias");
        const dists = await parseApiJson(distRes, "/api/distritos");
        const carros = await parseApiJson(carrosRes, "/api/historial-carros");

        setDepartamentos(Array.isArray(deps) ? deps : []);
        setProvincias(Array.isArray(provs) ? provs : []);
        setDistritos(Array.isArray(dists) ? dists : []);
        setHistorialesCarros(Array.isArray(carros) ? carros : []);

        await loadReservaDetail(
          Array.isArray(provs) ? provs : [],
          Array.isArray(dists) ? dists : []
        );
      } catch (error) {
        console.error("[loadInitialData] ERROR", error);
        setLoading(false);
        setInitialLoaded(true);
        setClienteLoaded(true);
      }
    }

    loadInitialData();
  }, [params.id]);

  useEffect(() => {
    if (cotizacion && historialesCarros.length > 0) {
      const marcaTarget = parseInt(cotizacion.marca_id);
      const modeloTarget = parseInt(cotizacion.modelo_id);
      const versionTarget = parseInt(cotizacion.version_id);

      const filtered = historialesCarros.filter((carro) => {
        return (
          parseInt(carro.marca_id) === marcaTarget &&
          parseInt(carro.modelo_id) === modeloTarget &&
          parseInt(carro.version_id) === versionTarget
        );
      });

      setFilteredCarros(filtered);
    } else {
      setFilteredCarros([]);
    }
  }, [cotizacion, historialesCarros]);

  useEffect(() => {
    if (formData.departamento_id) {
      const depId = parseInt(formData.departamento_id);
      const filtered = Array.isArray(provincias)
        ? provincias.filter((p) => p.departamento_id === depId)
        : [];
      setFilteredProvincias(filtered);
      setFilteredDistritos([]);
    } else {
      setFilteredProvincias([]);
      setFilteredDistritos([]);
    }
  }, [formData.departamento_id, provincias]);

  useEffect(() => {
    if (formData.provincia_id) {
      const provId = parseInt(formData.provincia_id);
      const filtered = Array.isArray(distritos)
        ? distritos.filter((d) => d.provincia_id === provId)
        : [];
      setFilteredDistritos(filtered);
    } else {
      setFilteredDistritos([]);
    }
  }, [formData.provincia_id, distritos]);

  useEffect(() => {
    const nuevoTotal = calcularTotal(formData);
    setFormData((prev) => {
      if (prev.total === nuevoTotal) return prev;
      return { ...prev, total: nuevoTotal };
    });
  }, [
    formData.cantidad,
    formData.precio_unitario,
    formData.dsctotienda,
    formData.dsctotiendaporcentaje,
    formData.dsctobonoretoma,
    formData.dsctonper,
    formData.flete,
    formData.tarjetaplaca,
    formData.glp,
    calcularTotal,
  ]);

  const autoSaveDetalles = useCallback(
    async (data) => {
      if (isLocked) return;

      const detalleId = detalles?.id || detalles?.detalle_id;

      if (!initialLoaded) return;
      if (!detalleId) return;
      if (!clienteLoaded) return;

      setSaving(true);
      setAutoSaveIndicator(true);

      try {
        const detalleFields = [
          "tipo_comprobante",
          "vin",
          "vin_existe",
          "usovehiculo",
          "numero_motor",
          "dsctotienda",
          "dsctotiendaporcentaje",
          "dsctobonoretoma",
          "dsctonper",
          "cantidad",
          "precio_unitario",
          "flete",
          "tarjetaplaca",
          "glp",
          "tc_referencial",
          "total",
          "color_externo",
          "color_interno",
          "cuota_inicial",
        ];

        const clienteFields = [
          "email",
          "celular",
          "fecha_nacimiento",
          "ocupacion",
          "domicilio",
          "departamento_id",
          "provincia_id",
          "distrito_id",
          "nombreconyugue",
          "dniconyugue",
        ];

        const cleanDataDetalles = {};
        const cleanDataCliente = {};

        detalleFields.forEach((key) => {
          if (key in data) cleanDataDetalles[key] = data[key] === "" ? null : data[key];
        });

        clienteFields.forEach((key) => {
          if (key in data) cleanDataCliente[key] = data[key] === "" ? null : data[key];
        });

        if (data.observaciones !== undefined && canViewAll) {
          cleanDataDetalles.descripcion =
            data.observaciones === "" ? null : data.observaciones;
        }

        const payloadDetalles = {
          ...cleanDataDetalles,
          vin_existe: clientVinExists ? 1 : 0,
        };

        const resDetalles = await fetch(`/api/reserva-detalles/${detalleId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payloadDetalles),
        });

        const detallesText = await resDetalles.text();
        if (!resDetalles.ok) {
          throw new Error(detallesText || "Error guardando detalles");
        }

        if (Object.keys(cleanDataCliente).length > 0 && cliente?.id) {
          if (!data.nombre?.trim() || !data.apellido?.trim()) return;

          const clientePayload = {
            nombre: data.nombre,
            apellido: data.apellido,
            email: data.email || cliente.email,
            celular: data.celular || cliente.celular,
            ...cleanDataCliente,
          };

          const resCliente = await fetch(`/api/clientes/${cliente.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(clientePayload),
          });

          const clienteText = await resCliente.text();
          if (!resCliente.ok) {
            throw new Error(clienteText || "Error guardando cliente");
          }
        }

        toast.success("Guardado automáticamente");
      } catch (error) {
        console.error("[AUTOSAVE] ERROR", error);
        toast.error("Error guardando cambios: " + error.message);
      } finally {
        setAutoSaveIndicator(false);
        setSaving(false);
      }
    },
    [detalles, clienteLoaded, initialLoaded, cliente, canViewAll, clientVinExists, isLocked]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!initialLoaded || isLocked) return;
      const detalleId = detalles?.id || detalles?.detalle_id;
      if (detalleId && clienteLoaded) {
        autoSaveDetalles(formData);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [formData, autoSaveDetalles, detalles, clienteLoaded, initialLoaded, isLocked]);

  async function loadReservaDetail(provList = [], distList = []) {
    try {
      const res = await fetch(`/api/reservas/${params.id}`, {
        cache: "no-store",
      });
      const data = await res.json();

      setReserva(data);
      setDetalles(data.detalles);
      setCotizacion(data.cotizaciones?.[0] || null);
      setAccesorios(data.accesorios || []);

      const vinExiste =
        data?.detalles?.vin_existe === 1 || data?.detalles?.vin_existe === true;
      setClientVinExists(vinExiste);

      const clienteId = data.detalles?.cliente_id || data.cliente_id;
      if (clienteId) {
        await loadCliente(clienteId, provList, distList);
      } else {
        setClienteLoaded(true);
      }

      if (data.detalles) {
        setFormData((prev) => ({
          ...prev,
          tipo_comprobante: data.detalles.tipo_comprobante || "",
          vin: data.detalles.vin || "",
          vin_existe: vinExiste ? 1 : 0,
          usovehiculo: data.detalles.usovehiculo || "",
          numero_motor: data.detalles.numero_motor || "",
          dsctotienda: data.detalles.dsctotienda?.toString() || "",
          dsctotiendaporcentaje: data.detalles.dsctotiendaporcentaje?.toString() || "",
          dsctobonoretoma: data.detalles.dsctobonoretoma?.toString() || "",
          dsctonper: data.detalles.dsctonper?.toString() || "",
          cantidad: data.detalles.cantidad?.toString() || "",
          precio_unitario: data.detalles.precio_unitario?.toString() || "",
          flete: data.detalles.flete?.toString() || "",
          tarjetaplaca: data.detalles.tarjetaplaca?.toString() || "",
          glp: data.detalles.glp?.toString() || "",
          tc_referencial: data.detalles.tc_referencial?.toString() || "",
          total: data.detalles.total?.toString() || "",
          color_externo: data.detalles.color_externo || "",
          color_interno: data.detalles.color_interno || "",
          valores_tc_ref: data.detalles.tc_referencial?.toString() || "",
          cuota_inicial: data.detalles.cuota_inicial?.toString() || "",
          monto_aprobado: data.detalles.total?.toString() || "",
          observaciones: data.detalles.descripcion || "",
          marca_nombre: data.detalles.marca_nombre || "",
          modelo_nombre: data.detalles.modelo_nombre || "",
          clase_nombre: data.detalles.clase_nombre || "",
          version_nombre: data.detalles.version_nombre || "",
          anio: data.detalles.anio?.toString() || "",
          precio_base: data.detalles.precio_base?.toString() || "",
        }));
      }

      setLoading(false);
      setInitialLoaded(true);
    } catch (error) {
      console.error("[loadReservaDetail] ERROR", error);
      toast.error("Error cargando reserva");
      setLoading(false);
      setClienteLoaded(true);
      setInitialLoaded(true);
    }
  }

  async function loadCliente(clienteId, provList = [], distList = []) {
    try {
      const res = await fetch(`/api/clientes/${clienteId}`, {
        cache: "no-store",
      });

      if (!res.ok) {
        setClienteLoaded(true);
        return;
      }

      const clienteData = await res.json();
      setCliente(clienteData);

      const depId = clienteData.departamento_id?.toString() || "";
      const provId = clienteData.provincia_id?.toString() || "";
      const distId = clienteData.distrito_id?.toString() || "";

      if (depId && Array.isArray(provList)) {
        const depIdNum = parseInt(depId);
        const filtered = provList.filter((p) => p.departamento_id === depIdNum);
        setFilteredProvincias(filtered);
      }

      if (provId && Array.isArray(distList)) {
        const provIdNum = parseInt(provId);
        const filtered = distList.filter((d) => d.provincia_id === provIdNum);
        setFilteredDistritos(filtered);
      }

      setFormData((prev) => ({
        ...prev,
        nombre: clienteData.nombre || "",
        apellido: clienteData.apellido || "",
        email: clienteData.email || "",
        celular: clienteData.celular || "",
        identificacion_fiscal: clienteData.identificacion_fiscal || "",
        nombre_comercial: clienteData.nombre_comercial || "",
        tipo_identificacion: clienteData.tipo_identificacion || "",
        fecha_nacimiento: clienteData.fecha_nacimiento
          ? clienteData.fecha_nacimiento.split("T")[0]
          : "",
        ocupacion: clienteData.ocupacion || "",
        domicilio: clienteData.domicilio || "",
        departamento_id: depId,
        provincia_id: provId,
        distrito_id: distId,
        nombreconyugue: clienteData.nombreconyugue || "",
        dniconyugue: clienteData.dniconyugue || "",
      }));

      setClienteLoaded(true);
    } catch (error) {
      console.error("[loadCliente] ERROR", error);
      setClienteLoaded(true);
    }
  }

  const handleChangeStatus = async (newStatus) => {
    try {
      setChangingStatus(true);

      const response = await fetch(`/api/reservas/${params.id}/estado`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          estado: newStatus,
          observaciones: formData.observaciones_revisor || null,
        }),
      });

      const text = await response.text();
      if (!response.ok) {
        throw new Error(text || "Error cambiando estado");
      }

      const updatedReserva = JSON.parse(text);
      setReserva(updatedReserva);
      toast.success(`Reserva marcada como ${newStatus}`);

      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("[handleChangeStatus] ERROR", error);
      toast.error("Error: " + error.message);
    } finally {
      setChangingStatus(false);
    }
  };

  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);

      const response = await fetch(`/api/reservas/${params.id}/pdf`);
      if (!response.ok) {
        const txt = await response.text();
        throw new Error(txt || "Error descargando PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `reserva-${reserva?.id}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success("PDF descargado correctamente");
    } catch (error) {
      console.error("[handleDownloadPdf] ERROR", error);
      toast.error("Error descargando PDF: " + error.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const getDepartamentoNombre = () => {
    if (!formData.departamento_id || !Array.isArray(departamentos))
      return "Seleccionar departamento";
    const dep = departamentos.find((d) => d.id.toString() === formData.departamento_id);
    return dep ? dep.nombre : "Seleccionar departamento";
  };

  const getProvinciaNombre = () => {
    if (!formData.provincia_id || !Array.isArray(provincias))
      return "Seleccionar provincia";
    const prov = provincias.find((p) => p.id.toString() === formData.provincia_id);
    return prov ? prov.nombre : "Seleccionar provincia";
  };

  const getDistritoNombre = () => {
    if (!formData.distrito_id || !Array.isArray(distritos))
      return "Seleccionar distrito";
    const dist = distritos.find((d) => d.id.toString() === formData.distrito_id);
    return dist ? dist.nombre : "Seleccionar distrito";
  };

  const getVinDisplay = () => {
    if (!formData.vin) return "Seleccionar VIN";
    const carro = historialesCarros.find((c) => c.vin === formData.vin);
    return carro
      ? `${carro.vin} - Precio Venta: S/ ${carro.precioventa || "N/A"}`
      : formData.vin;
  };

  const getEstadoBadge = (estado) => {
    const estados = {
      borrador: { label: "Borrador", color: "bg-gray-100 text-gray-700" },
      enviado_firma: { label: "Enviado a Firma", color: "bg-blue-100 text-blue-700" },
      observado: { label: "Observado", color: "bg-yellow-100 text-yellow-700" },
      subsanado: { label: "Subsanado", color: "bg-green-100 text-green-700" },
      firmado: { label: "Firmado", color: "bg-purple-100 text-purple-700" },
    };
    const est = estados[estado] || estados.borrador;
    return <Badge className={est.color}>{est.label}</Badge>;
  };

  const cuotaInicialHasData =
    formData.cuota_inicial !== null &&
    formData.cuota_inicial !== undefined &&
    String(formData.cuota_inicial).trim() !== "";

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 py-8 px-4 max-w-7xl mx-auto">
        {isLocked && (
          <div className="p-3 rounded bg-red-50 border border-red-200 text-red-700 text-sm">
            Esta reserva está firmada y no puede editarse.
          </div>
        )}

        <div className="flex items-center justify-between border-b pb-6">
          <div className="flex items-center gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => router.back()}>
                  <ArrowLeft size={18} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Volver</TooltipContent>
            </Tooltip>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-3xl font-bold text-gray-900">
                  Reserva #{reserva?.id}
                </h1>
                {getEstadoBadge(reserva?.estado)}
              </div>
              <p className="text-gray-600 mt-1">
                {reserva?.oportunidad_id && (
                  <>
                    Oportunidad #{reserva.oportunidad_codigo} • Cliente:{" "}
                    <span className="font-semibold">
                      {formData.nombre} {formData.apellido}
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>
          {autoSaveIndicator && !isLocked && (
            <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded border border-blue-200">
              <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-xs font-medium text-blue-600">Guardando...</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="font-semibold">
                {formData.nombre} {formData.apellido}
              </p>
              <p className="text-xs text-gray-600">{formData.email}</p>
              <p className="text-xs text-gray-600">{formData.celular}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Vehículo</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="font-semibold">
                {formData.marca_nombre} {formData.modelo_nombre}
              </p>
              <p className="text-xs text-gray-600">Año: {formData.anio}</p>
              <p className="text-xs text-gray-600">VIN: {formData.vin}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Ubicación</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="font-semibold">{getProvinciaNombre()}</p>
              <p className="text-xs text-gray-600">{getDistritoNombre()}</p>
              <p className="text-xs text-gray-600">{getDepartamentoNombre()}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Total</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="text-2xl font-bold text-blue-600">
                ${parseFloat(formData.total || 0).toFixed(2)}
              </p>
              <p className="text-xs text-gray-600">TC: {formData.tc_referencial}</p>
            </CardContent>
          </Card>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={() => router.push(`/oportunidades/${reserva?.oportunidad_id}`)}
                className="gap-2"
              >
                <Building2 size={16} />
                Ver Oportunidad
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Ir a los detalles de la oportunidad</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className="gap-2"
                onClick={handleDownloadPdf}
                disabled={downloadingPdf}
              >
                {downloadingPdf ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Download size={16} />
                )}
                {downloadingPdf ? "Descargando..." : "Descargar PDF"}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Descargar como PDF</TooltipContent>
          </Tooltip>
        </div>

        <Card>
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle className="flex items-center gap-2">
              <FileText size={18} />
              NOTA DE PEDIDO
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            <div className="border-b pb-6">
              <h3 className="font-semibold text-gray-900 mb-4">DATOS DEL CLIENTE</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Tipo de Comprobante *
                  </label>
                  <Input
                    value={formData.tipo_comprobante}
                    onChange={(e) =>
                      handleFieldChange("tipo_comprobante", e.target.value)
                    }
                    placeholder="Boleta/Factura"
                    disabled={isLocked}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Documento de Identidad
                  </label>
                  <Input
                    value={formData.identificacion_fiscal}
                    disabled
                    className="bg-gray-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Nombre Comercial
                  </label>
                  <Input
                    value={formData.nombre_comercial}
                    disabled
                    className="bg-gray-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Fecha Nacimiento *
                  </label>
                  <Input
                    type="date"
                    value={formData.fecha_nacimiento}
                    onChange={(e) =>
                      handleFieldChange("fecha_nacimiento", e.target.value)
                    }
                    disabled={isLocked}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Ocupación *
                  </label>
                  <Input
                    value={formData.ocupacion}
                    onChange={(e) => handleFieldChange("ocupacion", e.target.value)}
                    disabled={isLocked}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Domicilio *
                  </label>
                  <Input
                    value={formData.domicilio}
                    onChange={(e) => handleFieldChange("domicilio", e.target.value)}
                    disabled={isLocked}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Departamento *
                  </label>
                  <Popover open={openDep} onOpenChange={setOpenDep}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openDep}
                        className="w-full justify-between"
                        disabled={isLocked}
                      >
                        <span className="truncate">{getDepartamentoNombre()}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar departamento..." />
                        <CommandEmpty>No hay departamento.</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {Array.isArray(departamentos) && departamentos.length > 0 ? (
                              departamentos.map((dep) => (
                                <CommandItem
                                  key={dep.id}
                                  value={dep.nombre}
                                  onSelect={() => {
                                    if (isLocked) return;
                                    handleFieldChange("departamento_id", dep.id.toString());
                                    setOpenDep(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.departamento_id === dep.id.toString()
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {dep.nombre}
                                </CommandItem>
                              ))
                            ) : (
                              <CommandEmpty>No hay departamentos disponibles</CommandEmpty>
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Provincia *
                  </label>
                  <Popover open={openProv} onOpenChange={setOpenProv}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openProv}
                        className="w-full justify-between"
                        disabled={isLocked || !formData.departamento_id}
                      >
                        <span className="truncate">{getProvinciaNombre()}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar provincia..." />
                        <CommandEmpty>No hay provincia.</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {Array.isArray(filteredProvincias) &&
                            filteredProvincias.length > 0 ? (
                              filteredProvincias.map((prov) => (
                                <CommandItem
                                  key={prov.id}
                                  value={prov.nombre}
                                  onSelect={() => {
                                    if (isLocked) return;
                                    handleFieldChange("provincia_id", prov.id.toString());
                                    setOpenProv(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.provincia_id === prov.id.toString()
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {prov.nombre}
                                </CommandItem>
                              ))
                            ) : (
                              <CommandEmpty>No hay provincia para este departamento</CommandEmpty>
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Distrito *
                  </label>
                  <Popover open={openDist} onOpenChange={setOpenDist}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openDist}
                        className="w-full justify-between"
                        disabled={isLocked || !formData.provincia_id}
                      >
                        <span className="truncate">{getDistritoNombre()}</span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0">
                      <Command>
                        <CommandInput placeholder="Buscar distrito..." />
                        <CommandEmpty>No hay distrito.</CommandEmpty>
                        <CommandList>
                          <CommandGroup>
                            {Array.isArray(filteredDistritos) &&
                            filteredDistritos.length > 0 ? (
                              filteredDistritos.map((dist) => (
                                <CommandItem
                                  key={dist.id}
                                  value={dist.nombre}
                                  onSelect={() => {
                                    if (isLocked) return;
                                    handleFieldChange("distrito_id", dist.id.toString());
                                    setOpenDist(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.distrito_id === dist.id.toString()
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {dist.nombre}
                                </CommandItem>
                              ))
                            ) : (
                              <CommandEmpty>No hay distrito para esta provincia</CommandEmpty>
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Email
                  </label>
                  <Input
                    value={formData.email}
                    onChange={(e) => handleFieldChange("email", e.target.value)}
                    placeholder="correo@example.com"
                    disabled={isLocked}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Celular
                  </label>
                  <Input
                    value={formData.celular}
                    onChange={(e) => handleFieldChange("celular", e.target.value)}
                    placeholder="+51 999999999"
                    disabled={isLocked}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Nombre del Cónyuge *
                  </label>
                  <Input
                    value={formData.nombreconyugue}
                    onChange={(e) =>
                      handleFieldChange("nombreconyugue", e.target.value)
                    }
                    disabled={isLocked}
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    DNI Cónyuge *
                  </label>
                  <Input
                    value={formData.dniconyugue}
                    onChange={(e) => handleFieldChange("dniconyugue", e.target.value)}
                    disabled={isLocked}
                  />
                </div>
              </div>
            </div>

            <div className="border-b pb-6">
              <h3 className="font-semibold text-gray-900 mb-4">DATOS DEL VEHÍCULO</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Marca
                  </label>
                  <Input value={formData.marca_nombre} disabled className="bg-gray-100" />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Modelo
                  </label>
                  <Input value={formData.modelo_nombre} disabled className="bg-gray-100" />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Clase
                  </label>
                  <Input value={formData.clase_nombre} disabled className="bg-gray-100" />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Versión
                  </label>
                  <Input
                    value={formData.version_nombre}
                    disabled
                    className="bg-gray-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Año
                  </label>
                  <Input value={formData.anio} disabled className="bg-gray-100" />
                </div>

                <div className="md:col-span-2 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="vinExistsCheckbox"
                      checked={clientVinExists}
                      onChange={handleVinExistsChange}
                      disabled={isLocked}
                      className="h-4 w-4 border border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label
                      htmlFor="vinExistsCheckbox"
                      className="text-sm font-medium text-gray-700"
                    >
                      VIN existe
                    </label>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-2">
                      VIN *{" "}
                      {filteredCarros.length > 0 &&
                        `(${filteredCarros.length} disponibles)`}
                    </label>
                    <Popover open={openVin} onOpenChange={setOpenVin}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={openVin}
                          className="w-full justify-between"
                          disabled={isLocked || !clientVinExists}
                        >
                          <span className="truncate">{getVinDisplay()}</span>
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0">
                        <Command>
                          <CommandInput placeholder="Buscar por VIN..." />
                          <CommandEmpty>
                            {filteredCarros.length === 0
                              ? "No hay VINs disponibles."
                              : "No se encontró el VIN"}
                          </CommandEmpty>
                          <CommandList>
                            <CommandGroup>
                              {Array.isArray(filteredCarros) &&
                              filteredCarros.length > 0 ? (
                                filteredCarros.map((carro) => (
                                  <CommandItem
                                    key={carro.vin}
                                    value={carro.vin}
                                    onSelect={() => {
                                      if (isLocked) return;
                                      handleFieldChange("vin", carro.vin);
                                      setOpenVin(false);
                                    }}
                                  >
                                    <Check
                                      className={cn(
                                        "mr-2 h-4 w-4",
                                        formData.vin === carro.vin
                                          ? "opacity-100"
                                          : "opacity-0"
                                      )}
                                    />
                                    <div className="flex flex-col">
                                      <span className="font-mono text-sm">
                                        {carro.vin}
                                      </span>
                                      <span className="text-xs text-gray-500">
                                        Compra: S/ {carro.preciocompra || "N/A"} | Venta: S/{" "}
                                        {carro.precioventa || "N/A"}
                                      </span>
                                    </div>
                                  </CommandItem>
                                ))
                              ) : null}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>

                    {!clientVinExists && !cuotaInicialHasData && (
                      <p className="text-xs text-red-600 mt-2">
                        Reserva total sin data
                      </p>
                    )}

                    {!clientVinExists && cuotaInicialHasData && (
                      <p className="text-xs text-red-600 mt-2">
                        Anticipo sin data
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-2">
                      Uso del Vehículo *
                    </label>
                    <Input
                      value={formData.usovehiculo}
                      onChange={(e) =>
                        handleFieldChange("usovehiculo", e.target.value)
                      }
                      disabled={isLocked}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-2">
                      Color Externo *
                    </label>
                    <Input
                      value={formData.color_externo}
                      onChange={(e) =>
                        handleFieldChange("color_externo", e.target.value)
                      }
                      disabled={isLocked}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-2">
                      Color Interno *
                    </label>
                    <Input
                      value={formData.color_interno}
                      onChange={(e) =>
                        handleFieldChange("color_interno", e.target.value)
                      }
                      disabled={isLocked}
                    />
                  </div>

                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-2">
                      Número de Motor *
                    </label>
                    <Input
                      value={formData.numero_motor}
                      onChange={(e) =>
                        handleFieldChange("numero_motor", e.target.value)
                      }
                      disabled={isLocked}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-b pb-6">
              <h3 className="font-semibold text-gray-900 mb-4">DESCUENTOS Y MONTOS</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Descuento Tienda (S/) *
                  </label>
                  <Input
                    type="number"
                    value={formData.dsctotienda}
                    onChange={(e) =>
                      handleFieldChange("dsctotienda", e.target.value)
                    }
                    disabled={isLocked}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Descuento Tienda (%) *
                  </label>
                  <Input
                    type="number"
                    value={formData.dsctotiendaporcentaje}
                    onChange={(e) =>
                      handleFieldChange("dsctotiendaporcentaje", e.target.value)
                    }
                    disabled={isLocked}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Bono Retoma *
                  </label>
                  <Input
                    type="number"
                    value={formData.dsctobonoretoma}
                    onChange={(e) =>
                      handleFieldChange("dsctobonoretoma", e.target.value)
                    }
                    disabled={isLocked}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Descuento NPER *
                  </label>
                  <Input
                    type="number"
                    value={formData.dsctonper}
                    onChange={(e) =>
                      handleFieldChange("dsctonper", e.target.value)
                    }
                    disabled={isLocked}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Cantidad *
                  </label>
                  <Input
                    type="number"
                    value={formData.cantidad}
                    onChange={(e) => handleFieldChange("cantidad", e.target.value)}
                    disabled={isLocked}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Precio Unitario
                  </label>
                  <Input
                    type="number"
                    value={formData.precio_unitario}
                    onChange={(e) =>
                      handleFieldChange("precio_unitario", e.target.value)
                    }
                    disabled={isLocked}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Precio Base
                  </label>
                  <Input value={formData.precio_base} disabled className="bg-gray-100" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Flete *
                  </label>
                  <Input
                    type="number"
                    value={formData.flete}
                    onChange={(e) => handleFieldChange("flete", e.target.value)}
                    disabled={isLocked}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Tarjeta Placa *
                  </label>
                  <Input
                    type="number"
                    value={formData.tarjetaplaca}
                    onChange={(e) =>
                      handleFieldChange("tarjetaplaca", e.target.value)
                    }
                    disabled={isLocked}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    GLP *
                  </label>
                  <Input
                    type="number"
                    value={formData.glp}
                    onChange={(e) => handleFieldChange("glp", e.target.value)}
                    disabled={isLocked}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    TOTAL *
                  </label>
                  <Input
                    type="number"
                    value={formData.total}
                    disabled
                    className="font-bold text-lg bg-gray-100"
                  />
                </div>
              </div>
            </div>

            <div className="border-b pb-6">
              <h3 className="font-semibold text-gray-900 mb-4">VALORES</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    T.C. Ref. *
                  </label>
                  <Input
                    type="number"
                    value={formData.valores_tc_ref}
                    onChange={(e) =>
                      handleFieldChange("valores_tc_ref", e.target.value)
                    }
                    disabled={isLocked}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Cuota Inicial *
                  </label>
                  <Input
                    value={formData.cuota_inicial}
                    onChange={(e) =>
                      handleFieldChange("cuota_inicial", e.target.value)
                    }
                    placeholder="Ingresa la cuota inicial"
                    disabled={isLocked}
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Observaciones / Descripción
                {!canViewAll && (
                  <span className="text-gray-400 ml-2">(Solo lectura)</span>
                )}
              </label>
              <Textarea
                value={formData.observaciones}
                onChange={(e) =>
                  canViewAll && !isLocked && handleFieldChange("observaciones", e.target.value)
                }
                disabled={!canViewAll || isLocked}
                placeholder="Observaciones adicionales o descripción de la reserva..."
                rows={4}
                className={cn("text-sm", (!canViewAll || isLocked) && "bg-gray-100")}
              />
            </div>

            {canViewAll && (
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-2">
                  Observaciones del Revisor
                </label>
                <Textarea
                  value={formData.observaciones_revisor}
                  onChange={(e) =>
                    !isLocked && handleFieldChange("observaciones_revisor", e.target.value)
                  }
                  placeholder="Ingresa tus observaciones aquí..."
                  rows={4}
                  className="text-sm"
                  disabled={isLocked}
                />
              </div>
            )}

            <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded border border-blue-200">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">TOTAL FINAL:</span>
                <span className="text-2xl font-bold text-blue-600">
                  ${parseFloat(formData.total || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex gap-3">
              <div className="text-3xl">ℹ️</div>
              <div>
                <p className="text-sm font-semibold text-blue-900 mb-2">
                  Auto-guardado habilitado
                </p>
                <p className="text-xs text-blue-700">
                  Los cambios se guardan automáticamente mientras escribes (después de 1.5
                  segundos sin escribir). Los campos en gris son datos de referencia y no
                  pueden editarse.
                  {canViewAll && " Como revisor, puedes ver y modificar observaciones."}
                  {canView &&
                    !canViewAll &&
                    " Como solicitante, puedes enviar para revisar o marcar como subsanado."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}