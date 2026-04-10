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
  Share2,
  CheckCircle,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

export default function ReservaDetailPage() {
  const router = useRouter();
  const params = useParams();
  const { userId } = useAuth();
  const permitSignar = useRequirePerm("reservas", "firm");

  const [reserva, setReserva] = useState(null);
  const [detalles, setDetalles] = useState(null);
  const [cotizacion, setCotizacion] = useState(null);
  const [accesorios, setAccesorios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSaveIndicator, setAutoSaveIndicator] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Estados para ubicaciones
  const [departamentos, setDepartamentos] = useState([]);
  const [provincias, setProvincias] = useState([]);
  const [distritos, setDistritos] = useState([]);
  const [filteredProvincias, setFilteredProvincias] = useState([]);
  const [filteredDistritos, setFilteredDistritos] = useState([]);

  // Estados para VIN
  const [historialesCarros, setHistorialesCarros] = useState([]);
  const [filteredCarros, setFilteredCarros] = useState([]);

  // Estados para los popovers
  const [openDep, setOpenDep] = useState(false);
  const [openProv, setOpenProv] = useState(false);
  const [openDist, setOpenDist] = useState(false);
  const [openVin, setOpenVin] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    tipo_comprobante: "",
    fecha_nacimiento: "",
    ocupacion: "",
    domicilio: "",
    departamento_id: "",
    provincia_id: "",
    distrito_id: "",
    nombreconyugue: "",
    dniconyugue: "",
    vin: "",
    usovehiculo: "",
    numero_motor: "",
    dsctocredinissan: "",
    dsctotienda: "",
    dsctobonoretoma: "",
    dsctonper: "",
    cantidad: "",
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
    identificacion_fiscal: "",
    nombre_comercial: "",
    email: "",
    celular: "",
    marca_nombre: "",
    modelo_nombre: "",
    clase_nombre: "",
    version_nombre: "",
    anio: "",
    precio_base: "",
    subtotal: "",
  });

  // ✅ Cargar ubicaciones y carros PRIMERO
  useEffect(() => {
    async function loadInitialData() {
      try {
        const [depRes, provRes, distRes, carrosRes] = await Promise.all([
          fetch("/api/departamentos"),
          fetch("/api/provincias"),
          fetch("/api/distritos"),
          fetch("/api/historial-carros"),
        ]);

        let deps = await depRes.json();
        let provs = await provRes.json();
        let dists = await distRes.json();
        let carros = await carrosRes.json();

        deps = deps.data || (Array.isArray(deps) ? deps : []);
        provs = provs.data || (Array.isArray(provs) ? provs : []);
        dists = dists.data || (Array.isArray(dists) ? dists : []);
        carros = carros.data || (Array.isArray(carros) ? carros : []);

        setDepartamentos(Array.isArray(deps) ? deps : []);
        setProvincias(Array.isArray(provs) ? provs : []);
        setDistritos(Array.isArray(dists) ? dists : []);
        setHistorialesCarros(Array.isArray(carros) ? carros : []);

        console.log("Carros cargados:", Array.isArray(carros) ? carros.length : 0);

        loadReservaDetail(
          Array.isArray(provs) ? provs : [],
          Array.isArray(dists) ? dists : [],
          Array.isArray(carros) ? carros : []
        );
      } catch (error) {
        console.error("Error cargando datos iniciales:", error);
        setDepartamentos([]);
        setProvincias([]);
        setDistritos([]);
        setHistorialesCarros([]);
        setLoading(false);
      }
    }

    loadInitialData();
  }, [params.id]);

  // ✅ DEBUG Y FILTRADO DE CARROS - USANDO COTIZACION
  useEffect(() => {
    if (cotizacion && historialesCarros.length > 0) {
      const marcaTarget = parseInt(cotizacion.marca_id);
      const modeloTarget = parseInt(cotizacion.modelo_id);
      const versionTarget = parseInt(cotizacion.version_id);

      console.log("=== DEBUG FILTRADO VIN ===");
      console.log("Buscando (desde cotizacion):");
      console.log("  marca_id:", marcaTarget);
      console.log("  modelo_id:", modeloTarget);
      console.log("  version_id:", versionTarget);

      console.log("\nPrimeros 5 carros disponibles:");
      historialesCarros.slice(0, 5).forEach((carro) => {
        console.log(
          `  VIN: ${carro.vin} - marca: ${carro.marca_id}, modelo: ${carro.modelo_id}, version: ${carro.version_id}`
        );
      });

      const filtered = historialesCarros.filter((carro) => {
        const marcaMatch = parseInt(carro.marca_id) === marcaTarget;
        const modeloMatch = parseInt(carro.modelo_id) === modeloTarget;
        const versionMatch = parseInt(carro.version_id) === versionTarget;

        return marcaMatch && modeloMatch && versionMatch;
      });

      console.log("\nCarros filtrados:", filtered.length);
      filtered.forEach((carro) => {
        console.log(`  ${carro.vin}`);
      });
      console.log("=== FIN DEBUG ===\n");

      setFilteredCarros(filtered);
    }
  }, [cotizacion, historialesCarros]);

  // ✅ Filtrar provincias cuando cambia departamento
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

  // ✅ Filtrar distritos cuando cambia provincia
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

  // ✅ Auto-save para reserva_detalles
  const autoSaveDetalles = useCallback(
    async (data) => {
      if (!detalles?.detalle_id) return;

      setSaving(true);
      setAutoSaveIndicator(true);

      try {
        const editableFields = [
          "tipo_comprobante",
          "fecha_nacimiento",
          "ocupacion",
          "domicilio",
          "departamento_id",
          "provincia_id",
          "distrito_id",
          "nombreconyugue",
          "dniconyugue",
          "vin",
          "usovehiculo",
          "numero_motor",
          "dsctocredinissan",
          "dsctotienda",
          "dsctobonoretoma",
          "dsctonper",
          "cantidad",
          "flete",
          "tarjetaplaca",
          "glp",
          "tc_referencial",
          "total",
          "color_externo",
          "color_interno",
          "valores_tc_ref",
          "cuota_inicial",
          "monto_aprobado",
        ];

        const cleanData = {};
        editableFields.forEach((key) => {
          if (key in data) {
            cleanData[key] = data[key] === "" ? null : data[key];
          }
        });

        // ✅ MAPEAR observaciones -> descripcion
        if (data.observaciones !== undefined) {
          cleanData.descripcion = data.observaciones === "" ? null : data.observaciones;
        }

        console.log("Datos a guardar:", cleanData); // ✅ DEBUG

        const response = await fetch(`/api/reserva-detalles/${detalles.detalle_id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(cleanData),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Error guardando");
        }

        await new Promise((resolve) => setTimeout(resolve, 300));
        setAutoSaveIndicator(false);
        toast.success("Guardado automáticamente");
      } catch (error) {
        console.error(error);
        toast.error("Error guardando cambios: " + error.message);
        setAutoSaveIndicator(false);
      } finally {
        setSaving(false);
      }
    },
    [detalles?.detalle_id]
  );

  // Auto-save con debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      if (detalles && Object.values(formData).some((v) => v !== "")) {
        autoSaveDetalles(formData);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [formData, autoSaveDetalles, detalles]);

  // ✅ Cargar detalles de reserva
  async function loadReservaDetail(provList = [], distList = [], carrosList = []) {
    try {
      const res = await fetch(`/api/reservas/${params.id}`, {
        cache: "no-store",
      });
      const data = await res.json();

      console.log("=== DATOS DE RESERVA CARGADOS ===");
      console.log("Detalles:", data.detalles);
      console.log("Cotizaciones:", data.cotizaciones);
      console.log("=== FIN ===\n");

      setReserva(data);
      setDetalles(data.detalles);
      setCotizacion(data.cotizaciones?.[0] || null);
      setAccesorios(data.accesorios || []);

      if (data.detalles) {
        const depId = (data.detalles.departamento_id || data.departamento_id)?.toString() || "";
        const provId = (data.detalles.provincia_id || data.provincia_id)?.toString() || "";
        const distId = (data.detalles.distrito_id || data.distrito_id)?.toString() || "";

        let finalDepId = depId;
        let finalProvId = provId;
        let finalDistId = distId;

        if (!finalDepId && data.detalles.departamento_nombre && Array.isArray(departamentos)) {
          const foundDep = departamentos.find((d) => d.nombre === data.detalles.departamento_nombre);
          if (foundDep) {
            finalDepId = foundDep.id.toString();
          }
        }

        if (!finalProvId && data.detalles.provincia_nombre && Array.isArray(provList)) {
          const foundProv = provList.find((p) => p.nombre?.trim() === data.detalles.provincia_nombre?.trim());
          if (foundProv) {
            finalProvId = foundProv.id.toString();
          }
        }

        if (!finalDistId && data.detalles.distrito_nombre && Array.isArray(distList)) {
          const foundDist = distList.find((d) => d.nombre === data.detalles.distrito_nombre);
          if (foundDist) {
            finalDistId = foundDist.id.toString();
          }
        }

        setFormData((prev) => ({
          ...prev,
          tipo_comprobante: data.detalles.tipo_comprobante || "",
          fecha_nacimiento: data.detalles.fecha_nacimiento
            ? data.detalles.fecha_nacimiento.split("T")[0]
            : "",
          ocupacion: data.detalles.ocupacion || "",
          domicilio: data.detalles.domicilio || "",
          departamento_id: finalDepId,
          provincia_id: finalProvId,
          distrito_id: finalDistId,
          nombreconyugue: data.detalles.nombreconyugue || "",
          dniconyugue: data.detalles.dniconyugue || "",
          vin: data.detalles.vin || "",
          usovehiculo: data.detalles.usovehiculo || "",
          numero_motor: data.detalles.numero_motor || "",
          dsctocredinissan: data.detalles.dsctocredinissan?.toString() || "",
          dsctotienda: data.detalles.dsctotienda?.toString() || "",
          dsctobonoretoma: data.detalles.dsctobonoretoma?.toString() || "",
          dsctonper: data.detalles.dsctonper?.toString() || "",
          cantidad: data.detalles.cantidad?.toString() || "",
          flete: data.detalles.flete?.toString() || "",
          tarjetaplaca: data.detalles.tarjetaplaca?.toString() || "",
          glp: data.detalles.glp?.toString() || "",
          tc_referencial: data.detalles.tc_referencial?.toString() || "",
          total: data.detalles.total?.toString() || "",
          color_externo: data.detalles.color_externo || "",
          color_interno: data.detalles.color_interno || "",
          valores_tc_ref: data.detalles.tc_referencial?.toString() || "",
          cuota_inicial: "",
          monto_aprobado: data.detalles.total?.toString() || "",
          observaciones: data.detalles.descripcion || "", // ✅ USAR DESCRIPCION
          identificacion_fiscal: data.detalles.identificacion_fiscal || "",
          nombre_comercial: data.detalles.nombre_comercial || "",
          email: data.detalles.email || "",
          celular: data.detalles.celular || "",
          marca_nombre: data.detalles.marca_nombre || "",
          modelo_nombre: data.detalles.modelo_nombre || "",
          clase_nombre: data.detalles.clase_nombre || "",
          version_nombre: data.detalles.version_nombre || "",
          anio: data.detalles.anio?.toString() || "",
          precio_base: data.detalles.precio_base?.toString() || "",
          subtotal: data.detalles.subtotal?.toString() || "",
        }));

        if (finalDepId && Array.isArray(provList)) {
          const depIdNum = parseInt(finalDepId);
          const filtered = provList.filter((p) => p.departamento_id === depIdNum);
          setFilteredProvincias(filtered);
        }

        if (finalProvId && Array.isArray(distList)) {
          const provIdNum = parseInt(finalProvId);
          const filtered = distList.filter((d) => d.provincia_id === provIdNum);
          setFilteredDistritos(filtered);
        }
      }

      setLoading(false);
    } catch (error) {
      console.error(error);
      toast.error("Error cargando reserva");
      setLoading(false);
    }
  }

  // ✅ DESCARGAR PDF
  const handleDownloadPdf = async () => {
    try {
      setDownloadingPdf(true);
      
      const response = await fetch(`/api/reservas/${params.id}/pdf`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error descargando PDF");
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
      console.error("Error:", error);
      toast.error("Error descargando PDF: " + error.message);
    } finally {
      setDownloadingPdf(false);
    }
  };

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
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
        {/* HEADER */}
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
              <h1 className="text-3xl font-bold text-gray-900">
                Reserva #{reserva?.id}
              </h1>
              <p className="text-gray-600 mt-1">
                {reserva?.oportunidad_id && (
                  <>
                    Oportunidad #{reserva.oportunidad_codigo} • Cliente:{" "}
                    <span className="font-semibold">{reserva?.cliente_nombre}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {autoSaveIndicator && (
              <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded border border-blue-200">
                <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
                <span className="text-xs font-medium text-blue-600">
                  Guardando...
                </span>
              </div>
            )}
          </div>
        </div>

        {/* INFORMACIÓN PRINCIPAL */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Cliente</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p className="font-semibold">{reserva?.cliente_nombre}</p>
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

        {/* BOTONES DE ACCIÓN */}
        <div className="flex gap-2 flex-wrap">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                onClick={() =>
                  router.push(`/oportunidades/${reserva?.oportunidad_id}`)
                }
                className="gap-2"
              >
                <Building2 size={16} />
                Ver Oportunidad
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">
              Ir a los detalles de la oportunidad
            </TooltipContent>
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

          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Share2 size={16} />
                Compartir
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top">Compartir reserva</TooltipContent>
          </Tooltip>

          {permitSignar && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button className="gap-2 bg-green-600 hover:bg-green-700">
                  <CheckCircle size={16} />
                  Firmar
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Firmar esta reserva</TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* FORMULARIO ÚNICO */}
        <Card>
          <CardHeader className="bg-gradient-to-r from-gray-50 to-gray-100">
            <CardTitle className="flex items-center gap-2">
              <FileText size={18} />
              NOTA DE PEDIDO Y CARTA DE CARACTERÍSTICAS
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-6 space-y-6">
            {/* DATOS DEL CLIENTE */}
            <div className="border-b pb-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                DATOS DEL CLIENTE
              </h3>
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
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Ocupación *
                  </label>
                  <Input
                    value={formData.ocupacion}
                    onChange={(e) => handleFieldChange("ocupacion", e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Domicilio *
                  </label>
                  <Input
                    value={formData.domicilio}
                    onChange={(e) => handleFieldChange("domicilio", e.target.value)}
                  />
                </div>

                {/* DEPARTAMENTO */}
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
                            {Array.isArray(departamentos) &&
                            departamentos.length > 0 ? (
                              departamentos.map((dep) => (
                                <CommandItem
                                  key={dep.id}
                                  value={dep.nombre}
                                  onSelect={() => {
                                    handleFieldChange(
                                      "departamento_id",
                                      dep.id.toString()
                                    );
                                    setOpenDep(false);
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      formData.departamento_id ===
                                        dep.id.toString()
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {dep.nombre}
                                </CommandItem>
                              ))
                            ) : (
                              <CommandEmpty>
                                No hay departamentos disponibles
                              </CommandEmpty>
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* PROVINCIA */}
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
                        disabled={!formData.departamento_id}
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
                                    handleFieldChange(
                                      "provincia_id",
                                      prov.id.toString()
                                    );
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
                              <CommandEmpty>
                                No hay provincia para este departamento
                              </CommandEmpty>
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>

                {/* DISTRITO */}
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
                        disabled={!formData.provincia_id}
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
                                    handleFieldChange(
                                      "distrito_id",
                                      dist.id.toString()
                                    );
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
                              <CommandEmpty>
                                No hay distrito para esta provincia
                              </CommandEmpty>
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
                  <Input value={formData.email} disabled className="bg-gray-100" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Celular
                  </label>
                  <Input
                    value={formData.celular}
                    disabled
                    className="bg-gray-100"
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
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    DNI Cónyuge *
                  </label>
                  <Input
                    value={formData.dniconyugue}
                    onChange={(e) =>
                      handleFieldChange("dniconyugue", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* DATOS DEL VEHÍCULO */}
            <div className="border-b pb-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                DATOS DEL VEHÍCULO
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Marca
                  </label>
                  <Input
                    value={formData.marca_nombre}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Modelo
                  </label>
                  <Input
                    value={formData.modelo_nombre}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Clase
                  </label>
                  <Input
                    value={formData.clase_nombre}
                    disabled
                    className="bg-gray-100"
                  />
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
                  <Input
                    value={formData.anio}
                    disabled
                    className="bg-gray-100"
                  />
                </div>

                {/* VIN SELECT */}
                <div className="md:col-span-2">
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    VIN * {filteredCarros.length > 0 && `(${filteredCarros.length} disponibles)`}
                  </label>
                  <Popover open={openVin} onOpenChange={setOpenVin}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={openVin}
                        className="w-full justify-between"
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
                            ? `No hay VINs disponibles para ${formData.marca_nombre} ${formData.modelo_nombre} ${formData.version_nombre}`
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
                                      Compra: S/ {carro.preciocompra || "N/A"} | Venta: S/ {carro.precioventa || "N/A"}
                                    </span>
                                  </div>
                                </CommandItem>
                              ))
                            ) : (
                              <CommandEmpty>
                                No hay VINs para esta combinación
                              </CommandEmpty>
                            )}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  {filteredCarros.length === 0 && formData.vin && (
                    <p className="text-xs text-amber-600 mt-2">
                      ⚠️ El VIN "{formData.vin}" no existe para esta combinación de marca/modelo/versión
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
                  />
                </div>
              </div>
            </div>

            {/* DESCUENTOS Y MONTOS */}
            <div className="border-b pb-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                DESCUENTOS Y MONTOS
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Descuento Crédito Nissan *
                  </label>
                  <Input
                    type="number"
                    value={formData.dsctocredinissan}
                    onChange={(e) =>
                      handleFieldChange("dsctocredinissan", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Descuento Tienda *
                  </label>
                  <Input
                    type="number"
                    value={formData.dsctotienda}
                    onChange={(e) =>
                      handleFieldChange("dsctotienda", e.target.value)
                    }
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
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Precio Base
                  </label>
                  <Input
                    type="number"
                    value={formData.precio_base}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Subtotal
                  </label>
                  <Input
                    type="number"
                    value={formData.subtotal}
                    disabled
                    className="bg-gray-100"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Flete *
                  </label>
                  <Input
                    type="number"
                    value={formData.flete}
                    onChange={(e) => handleFieldChange("flete", e.target.value)}
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
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    T.C. Referencial *
                  </label>
                  <Input
                    type="number"
                    value={formData.tc_referencial}
                    onChange={(e) =>
                      handleFieldChange("tc_referencial", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    TOTAL *
                  </label>
                  <Input
                    type="number"
                    value={formData.total}
                    onChange={(e) => handleFieldChange("total", e.target.value)}
                    className="font-bold text-lg"
                  />
                </div>
              </div>
            </div>

            {/* VALORES - CARTA */}
            <div className="border-b pb-6">
              <h3 className="font-semibold text-gray-900 mb-4">
                VALORES - CARTA DE CARACTERÍSTICAS
              </h3>
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
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Cuota Inicial *
                  </label>
                  <Input
                    type="number"
                    value={formData.cuota_inicial}
                    onChange={(e) =>
                      handleFieldChange("cuota_inicial", e.target.value)
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    Monto Aprobado *
                  </label>
                  <Input
                    type="number"
                    value={formData.monto_aprobado}
                    onChange={(e) =>
                      handleFieldChange("monto_aprobado", e.target.value)
                    }
                  />
                </div>
              </div>
            </div>

            {/* OBSERVACIONES */}
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                Observaciones / Descripción
              </label>
              <Textarea
                value={formData.observaciones}
                onChange={(e) =>
                  handleFieldChange("observaciones", e.target.value)
                }
                placeholder="Observaciones adicionales o descripción de la reserva..."
                rows={4}
                className="text-sm"
              />
            </div>

            {/* TOTAL FINAL */}
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

        {/* INFO */}
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
                  pueden editarse. Los VINs se filtran automáticamente según marca, modelo y versión.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
}