// app/(cotizacion-publica)/cotizacion-publica/[token]/page.jsx

"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Download,
  Loader2,
  Info,
  Eye,
  Clock,
  Calendar,
  CheckCircle,
  AlertCircle,
  Share2,
  Package,
  DollarSign,
  Truck,
  Zap,
  Image as ImageIcon,
  Play,
} from "lucide-react";
import { toast } from "sonner";

export default function CotizacionPublicaPage({ params: paramsPromise }) {
  const params = use(paramsPromise);

  const [cotizacion, setCotizacion] = useState(null);
  const [oportunidad, setOportunidad] = useState(null);
  const [accesorios, setAccesorios] = useState([]);
  const [regalos, setRegalos] = useState([]);
  const [precioVersion, setPrecioVersion] = useState(null);
  const [especificaciones, setEspecificaciones] = useState([]);
  const [historial, setHistorial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [igvRate, setIgvRate] = useState(0.18);
  
  const [marcaNombre, setMarcaNombre] = useState("");
  const [modeloNombre, setModeloNombre] = useState("");

  // ✅ Función auxiliar para obtener nombre de marca
  const cargarMarca = async (marcaId) => {
    try {
      const resMarcas = await fetch("/api/marcas", { cache: "no-store" });
      if (resMarcas.ok) {
        const marcas = await resMarcas.json();
        
        let marcasArray = [];
        if (Array.isArray(marcas)) {
          marcasArray = marcas;
        } else if (marcas.data && Array.isArray(marcas.data)) {
          marcasArray = marcas.data;
        }

        const marca = marcasArray.find((m) => Number(m.id) === Number(marcaId));

        if (marca) {
          setMarcaNombre(marca.name || "");
          console.log("✅ Marca encontrada:", marca.name);
          return marca.name;
        } else {
          console.warn("❌ Marca no encontrada");
        }
      }
    } catch (error) {
      console.error("Error cargando marca:", error);
    }
  };

  // ✅ Función auxiliar para obtener nombre de modelo
  const cargarModelo = async (modeloId) => {
    try {
      const resModelos = await fetch("/api/modelos", { cache: "no-store" });
      if (resModelos.ok) {
        const modelos = await resModelos.json();
        
        let modelosArray = [];
        if (Array.isArray(modelos)) {
          modelosArray = modelos;
        } else if (modelos.data && Array.isArray(modelos.data)) {
          modelosArray = modelos.data;
        }

        const modelo = modelosArray.find((m) => Number(m.id) === Number(modeloId));

        if (modelo) {
          setModeloNombre(modelo.name || "");
          console.log("✅ Modelo encontrado:", modelo.name);
          return modelo.name;
        } else {
          console.warn("❌ Modelo no encontrado");
        }
      }
    } catch (error) {
      console.error("Error cargando modelo:", error);
    }
  };

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        console.log("=== Cargando cotización pública ===");
        console.log("Token:", params.token);

        // Cargar cotización
        const resCot = await fetch(
          `/api/public/cotizacion/${params.token}`,
          {
            method: "GET",
            cache: "no-store",
          }
        );

        if (!resCot.ok) {
          const error = await resCot.text();
          console.error("Error response:", error);
          toast.error("Cotización no encontrada");
          return;
        }

        const dataC = await resCot.json();

        console.log("Cotización cargada:", {
          id: dataC.id,
          marca_id: dataC.marca_id,
          modelo_id: dataC.modelo_id,
          version_id: dataC.version_id,
        });

        setCotizacion(dataC);

        // ✅ CARGAR MARCA Y MODELO EN PARALELO
        if (dataC.marca_id) {
          await cargarMarca(dataC.marca_id);
        }

        if (dataC.modelo_id) {
          await cargarModelo(dataC.modelo_id);
        }

        // ✅ CARGAR OPORTUNIDAD
        if (dataC.oportunidad_id) {
          try {
            const resOpo = await fetch(
              `/api/oportunidades-oportunidades/${dataC.oportunidad_id}`,
              { cache: "no-store" }
            );

            if (resOpo.ok) {
              const opoData = await resOpo.json();
              setOportunidad(opoData);
              console.log("Oportunidad cargada:", opoData.cliente_nombre);
            }
          } catch (error) {
            console.error("Error cargando oportunidad:", error);
          }
        }

        // ✅ CARGAR ACCESORIOS
        if (dataC.id) {
          try {
            const resAcc = await fetch(
              `/api/cotizaciones-accesorios/by-cotizacion/${dataC.id}`,
              { cache: "no-store" }
            );

            if (resAcc.ok) {
              const dataAcc = await resAcc.json();
              const accesoriosFormateados = Array.isArray(dataAcc)
                ? dataAcc.map((acc) => ({
                    ...acc,
                    cantidad: Number(acc.cantidad),
                    precio_unitario: Number(acc.precio_unitario),
                    subtotal: Number(acc.subtotal),
                    descuento_porcentaje: acc.descuento_porcentaje
                      ? Number(acc.descuento_porcentaje)
                      : 0,
                    descuento_monto: acc.descuento_monto
                      ? Number(acc.descuento_monto)
                      : 0,
                    total: Number(acc.total),
                  }))
                : [];

              setAccesorios(accesoriosFormateados);
              console.log("Accesorios cargados:", accesoriosFormateados.length);
            }
          } catch (error) {
            console.error("Error cargando accesorios:", error);
          }
        }

        // ✅ CARGAR REGALOS
        if (dataC.id) {
          try {
            const resReg = await fetch(
              `/api/cotizaciones-regalos/by-cotizacion/${dataC.id}`,
              { cache: "no-store" }
            );

            if (resReg.ok) {
              const dataReg = await resReg.json();
              const regalosFormateados = Array.isArray(dataReg)
                ? dataReg.map((reg) => ({
                    ...reg,
                    cantidad: Number(reg.cantidad),
                    precio_unitario: Number(reg.precio_unitario),
                    subtotal: Number(reg.subtotal),
                    descuento_porcentaje: reg.descuento_porcentaje
                      ? Number(reg.descuento_porcentaje)
                      : 0,
                    descuento_monto: reg.descuento_monto
                      ? Number(reg.descuento_monto)
                      : 0,
                    total: Number(reg.total),
                  }))
                : [];

              setRegalos(regalosFormateados);
              console.log("Regalos cargados:", regalosFormateados.length);
            }
          } catch (error) {
            console.error("Error cargando regalos:", error);
          }
        }

        // ✅ CARGAR PRECIO DE VERSION
        if (dataC.marca_id && dataC.modelo_id && dataC.version_id) {
          try {
            const resPrecios = await fetch(
              `/api/precios-region-version?marca_id=${dataC.marca_id}&modelo_id=${dataC.modelo_id}&version_id=${dataC.version_id}`,
              { cache: "no-store" }
            );

            if (resPrecios.ok) {
              const dataPreciosArray = await resPrecios.json();
              if (Array.isArray(dataPreciosArray) && dataPreciosArray.length > 0) {
                const precioEncontrado = dataPreciosArray.find(
                  (p) =>
                    Number(p.marca_id) === Number(dataC.marca_id) &&
                    Number(p.modelo_id) === Number(dataC.modelo_id) &&
                    Number(p.version_id) === Number(dataC.version_id)
                );

                if (precioEncontrado) {
                  setPrecioVersion({
                    ...precioEncontrado,
                    precio_base: Number(precioEncontrado.precio_base),
                  });
                  console.log("Precio de versión cargado:", precioEncontrado);
                }
              }
            }
          } catch (error) {
            console.error("Error cargando precio:", error);
          }
        }

        // ✅ CARGAR ESPECIFICACIONES
        if (dataC.marca_id && dataC.modelo_id) {
          try {
            const resEspec = await fetch(
              `/api/modelo-especificaciones?marca_id=${dataC.marca_id}&modelo_id=${dataC.modelo_id}`,
              { cache: "no-store" }
            );

            if (resEspec.ok) {
              const dataEspec = await resEspec.json();
              setEspecificaciones(Array.isArray(dataEspec) ? dataEspec : []);
              console.log("Especificaciones cargadas:", dataEspec.length);
            }
          } catch (error) {
            console.error("Error cargando especificaciones:", error);
          }
        }

        // ✅ CARGAR IGV
        try {
          const resImpuestos = await fetch("/api/impuestos", {
            cache: "no-store",
          });
          if (resImpuestos.ok) {
            const impuestos = await resImpuestos.json();
            if (Array.isArray(impuestos) && impuestos.length > 0) {
              const igv = impuestos.find((imp) => imp.nombre === "IGV");
              if (igv) {
                setIgvRate(parseFloat(igv.porcentaje) / 100);
              }
            }
          }
        } catch (error) {
          console.error("Error cargando IGV:", error);
        }

        // Cargar historial de vistas
        if (dataC.id) {
          console.log("Cargando historial para cotización ID:", dataC.id);

          const resHist = await fetch(
            `/api/cotizacionesagenda/${dataC.id}/vistas-historial`,
            {
              method: "GET",
              cache: "no-store",
            }
          );

          const dataH = await resHist.json();

          console.log("Historial cargado:", {
            vistas_totales: dataH.vistas_totales,
            historial_items: dataH.historial?.length || 0,
          });

          setHistorial(dataH);
        }
      } catch (error) {
        console.error("Error cargando cotización:", error);
        toast.error("Error cargando cotización: " + error.message);
      } finally {
        setLoading(false);
      }
    }

    if (params?.token) {
      loadData();
    }
  }, [params?.token]);

  async function generatePDF() {
    try {
      if (!cotizacion || !cotizacion.id) {
        toast.error("No se puede generar PDF sin ID de cotización");
        return;
      }

      setGeneratingPdf(true);

      const response = await fetch("/api/cotizaciones-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cotizacion_id: cotizacion.id }),
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Error generando PDF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Cotizacion-Q-${String(cotizacion.id).padStart(6, "0")}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);

      toast.success("PDF descargado");
    } catch (error) {
      console.error(error);
      toast.error("Error generando PDF");
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function copiarEnlace() {
    const enlace = `${window.location.origin}/cotizacion-publica/${params.token}`;
    await navigator.clipboard.writeText(enlace);
    toast.success("Enlace copiado al portapapeles");
  }

  // ✅ FUNCIÓN PARA RENDERIZAR ESPECIFICACIONES POR TIPO
  const renderEspecificacion = (espec) => {
    switch (espec.tipo_dato) {
      case "media":
        if (espec.valor.includes("youtu")) {
          // Es un video de YouTube
          const videoId = espec.valor.split("v=")[1] || espec.valor.split("/").pop();
          return (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-semibold uppercase">
                {espec.especificacion_nombre}
              </p>
              <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title={espec.especificacion_nombre}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          );
        } else {
          // Es una imagen
          return (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-semibold uppercase">
                {espec.especificacion_nombre}
              </p>
              <img
                src={espec.valor}
                alt={espec.especificacion_nombre}
                className="w-full h-auto rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              />
            </div>
          );
        }

      case "texto":
        if (espec.valor.includes("youtu")) {
          // Es un video de YouTube (URL de texto)
          const videoId = espec.valor.split("v=")[1] || espec.valor.split("/").pop();
          return (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-semibold uppercase flex items-center gap-1">
                <Play className="h-4 w-4 text-red-500" />
                {espec.especificacion_nombre}
              </p>
              <div className="relative w-full bg-black rounded-lg overflow-hidden" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={`https://www.youtube.com/embed/${videoId}`}
                  title={espec.especificacion_nombre}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          );
        } else if (espec.valor.includes("http")) {
          // Es una URL de imagen (texto)
          return (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-semibold uppercase flex items-center gap-1">
                <ImageIcon className="h-4 w-4 text-blue-500" />
                {espec.especificacion_nombre}
              </p>
              <img
                src={espec.valor}
                alt={espec.especificacion_nombre}
                className="w-full h-auto rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition-shadow"
              />
            </div>
          );
        } else {
          // Es texto plano
          return (
            <div className="space-y-2">
              <p className="text-xs text-gray-600 font-semibold uppercase flex items-center gap-1">
                <Zap className="h-4 w-4 text-yellow-500" />
                {espec.especificacion_nombre}
              </p>
              <p className="text-lg font-bold text-gray-900 p-3 bg-gray-50 rounded-lg border border-gray-200">
                {espec.valor}
              </p>
            </div>
          );
        }

      default:
        return null;
    }
  };

  // ✅ CALCULAR TOTALES
  const calcularTotales = () => {
    const precioVehiculoConIgv = precioVersion ? parseFloat(precioVersion.precio_base) : 0;
    const precioVehiculoSinIgv = precioVehiculoConIgv / (1 + igvRate);

    // Descuento vehículo
    const descuentoVehiculo = cotizacion
      ? parseFloat(cotizacion.descuento_vehículo) > 0
        ? parseFloat(cotizacion.descuento_vehículo)
        : precioVehiculoConIgv * (parseFloat(cotizacion.descuento_vehículo_porcentaje) / 100 || 0)
      : 0;

    const precioVehiculoConDescuentoConIgv = precioVehiculoConIgv - descuentoVehiculo;
    const precioVehiculoConDescuentoSinIgv = precioVehiculoConDescuentoConIgv / (1 + igvRate);

    // Accesorios
    const accesoriosTotalConIgv = accesorios.reduce((sum, a) => sum + parseFloat(a.total || 0), 0);
    const accesoriosTotalSinIgv = accesoriosTotalConIgv / (1 + igvRate);

    // Regalos
    const regalosTotalConIgv = regalos.reduce((sum, r) => sum + parseFloat(r.total || 0), 0);
    const regalosTotalSinIgv = regalosTotalConIgv / (1 + igvRate);

    // Descuentos generales
    const descuentoAccConIgv = parseFloat(cotizacion?.descuento_total_accesorios || 0);
    const descuentoRegConIgv = parseFloat(cotizacion?.descuento_total_regalos || 0);
    const descuentoAccSinIgv = descuentoAccConIgv / (1 + igvRate);
    const descuentoRegSinIgv = descuentoRegConIgv / (1 + igvRate);

    // Subtotal sin IGV
    const subtotalSinIgv =
      precioVehiculoConDescuentoSinIgv +
      accesoriosTotalSinIgv +
      regalosTotalSinIgv -
      descuentoAccSinIgv -
      descuentoRegSinIgv;

    // IGV total
    const igvTotal = subtotalSinIgv * igvRate;

    // Gran total
    const granTotal = subtotalSinIgv + igvTotal;

    return {
      precioVehiculoConIgv,
      descuentoVehiculo,
      precioVehiculoConDescuentoConIgv,
      accesoriosTotalConIgv,
      descuentoAccConIgv,
      regalosTotalConIgv,
      descuentoRegConIgv,
      subtotalSinIgv,
      igvTotal,
      granTotal,
    };
  };

  const totales = calcularTotales();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
          <p className="text-gray-600">Cargando cotización...</p>
        </div>
      </div>
    );
  }

  if (!cotizacion) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-red-100">
        <Card className="w-full max-w-md border-red-200 shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <AlertCircle className="h-12 w-12 text-red-600" />
              <h2 className="text-xl font-bold text-red-900">
                Cotización no encontrada
              </h2>
              <p className="text-sm text-red-700">
                El enlace puede haber expirado o no ser válido
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 py-12 px-4">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* HEADER */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-900 rounded-full mb-4">
              <CheckCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                Cotización pública compartida
              </span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              Cotización Q-{String(cotizacion.id).padStart(6, "0")}
            </h1>
            <p className="text-gray-600">
              Detalle completo de tu cotización
            </p>
          </div>

          {/* INFORMACIÓN PRINCIPAL */}
          <Card className="border-l-4 border-l-blue-500 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
              <CardTitle className="text-lg font-bold text-gray-900">
                Información del Vehículo
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-1">
                      MARCA
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {marcaNombre || "No especificado"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-1">
                      MODELO
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {modeloNombre || "No especificado"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-1">
                      AÑO
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {cotizacion.anio || "No especificado"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-1">
                      COLOR EXTERNO
                    </p>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-6 h-6 rounded-full border-2 border-gray-300"
                        style={{
                          backgroundColor:
                            {
                              Rojo: "#EF4444",
                              Negro: "#1F2937",
                              Blanco: "#F3F4F6",
                              Plateado: "#D1D5DB",
                              Azul: "#3B82F6",
                              Gris: "#9CA3AF",
                            }[cotizacion.color_externo] || "#E5E7EB",
                        }}
                      />
                      <p className="font-semibold text-gray-900">
                        {cotizacion.color_externo || "No especificado"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-1">
                      COLOR INTERNO
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {cotizacion.color_interno || "No especificado"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-1">
                      SKU
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {cotizacion.sku || "No especificado"}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

         

          {/* ✅ ESPECIFICACIONES DEL MODELO */}
          {especificaciones.length > 0 && (
            <Card className="border-l-4 border-l-orange-500 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-orange-600" />
                  Especificaciones del Modelo
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {especificaciones.map((espec) => (
                    <div key={espec.id}>
                      {renderEspecificacion(espec)}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ✅ INFORMACIÓN DE PRECIO DE VERSIÓN */}
          {precioVersion && (
            <Card className="border-l-4 border-l-green-500 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-600" />
                  Información de Precio
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-xs text-green-600 font-semibold mb-2 uppercase">
                      Versión
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {precioVersion.version}
                    </p>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs text-blue-600 font-semibold mb-2 uppercase">
                      Precio Base (c/IGV)
                    </p>
                    <p className="text-2xl font-bold text-blue-600">
                      ${Number(precioVersion.precio_base).toLocaleString("es-ES")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ✅ ACCESORIOS */}
          {accesorios.length > 0 && (
            <Card className="border-l-4 border-l-purple-500 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Package className="h-5 w-5 text-purple-600" />
                  Accesorios ({accesorios.length})
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-6 space-y-6">
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="text-left p-3 font-semibold">
                          Descripción
                        </th>
                        <th className="text-left p-3 font-semibold">
                          N° Parte
                        </th>
                        <th className="text-right p-3 font-semibold">
                          Cantidad
                        </th>
                        <th className="text-right p-3 font-semibold">
                          Unitario
                        </th>
                        <th className="text-right p-3 font-semibold">
                          Descuento
                        </th>
                        <th className="text-right p-3 font-semibold">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {accesorios.map((acc) => (
                        <tr key={acc.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">{acc.detalle}</td>
                          <td className="p-3 text-gray-600">
                            {acc.numero_parte}
                          </td>
                          <td className="text-right p-3">
                            {acc.cantidad}
                          </td>
                          <td className="text-right p-3">
                            ${Number(acc.precio_unitario).toFixed(2)}
                          </td>
                          <td className="text-right p-3">
                            {acc.descuento_monto &&
                            Number(acc.descuento_monto) > 0 ? (
                              <p className="font-medium text-red-600">
                                -${Number(acc.descuento_monto).toFixed(2)}
                              </p>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="text-right p-3 font-bold text-purple-600">
                            ${Number(acc.total).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2 p-4 bg-purple-50 rounded-lg border-l-4 border-purple-500">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">
                      ${totales.accesoriosTotalConIgv.toFixed(2)}
                    </span>
                  </div>
                  {totales.descuentoAccConIgv > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Descuentos:</span>
                      <span className="font-medium text-red-600">
                        -${totales.descuentoAccConIgv.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-bold text-gray-900">Total:</span>
                    <span className="font-bold text-lg text-purple-600">
                      ${(totales.accesoriosTotalConIgv - totales.descuentoAccConIgv).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ✅ REGALOS */}
          {regalos.length > 0 && (
            <Card className="border-l-4 border-l-pink-500 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-pink-50 to-pink-100 border-b">
                <CardTitle className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Package className="h-5 w-5 text-pink-600" />
                  Regalos Incluidos ({regalos.length})
                </CardTitle>
              </CardHeader>

              <CardContent className="pt-6 space-y-6">
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 border-b">
                        <th className="text-left p-3 font-semibold">
                          Descripción
                        </th>
                        <th className="text-left p-3 font-semibold">
                          Lote
                        </th>
                        <th className="text-right p-3 font-semibold">
                          Cantidad
                        </th>
                        <th className="text-right p-3 font-semibold">
                          Descuento
                        </th>
                        <th className="text-right p-3 font-semibold">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {regalos.map((reg) => (
                        <tr key={reg.id} className="border-b hover:bg-gray-50">
                          <td className="p-3">{reg.detalle}</td>
                          <td className="p-3 text-gray-600">
                            {reg.lote || "-"}
                          </td>
                          <td className="text-right p-3">
                            {reg.cantidad}
                          </td>
                          <td className="text-right p-3">
                            {reg.descuento_monto &&
                            Number(reg.descuento_monto) > 0 ? (
                              <p className="font-medium text-red-600">
                                -${Number(reg.descuento_monto).toFixed(2)}
                              </p>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td className="text-right p-3 font-bold text-pink-600">
                            ${Number(reg.total).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-2 p-4 bg-pink-50 rounded-lg border-l-4 border-pink-500">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">
                      ${totales.regalosTotalConIgv.toFixed(2)}
                    </span>
                  </div>
                  {totales.descuentoRegConIgv > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Descuentos:</span>
                      <span className="font-medium text-red-600">
                        -${totales.descuentoRegConIgv.toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between">
                    <span className="font-bold text-gray-900">Total:</span>
                    <span className="font-bold text-lg text-pink-600">
                      ${(totales.regalosTotalConIgv - totales.descuentoRegConIgv).toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* ✅ RESUMEN GENERAL */}
          <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-100 to-emerald-100 border-b">
              <CardTitle className="text-xl text-green-900">
                Resumen General
              </CardTitle>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <p className="text-xs text-gray-600 font-semibold">Vehículo (c/IGV)</p>
                  <p className="text-lg font-bold text-gray-900">
                    ${totales.precioVehiculoConIgv.toFixed(2)}
                  </p>
                </div>

                {totales.descuentoVehiculo > 0 && (
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <p className="text-xs text-gray-600 font-semibold">Descuento Vehículo</p>
                    <p className="text-lg font-bold text-red-600">
                      -${totales.descuentoVehiculo.toFixed(2)}
                    </p>
                  </div>
                )}

                {totales.accesoriosTotalConIgv > 0 && (
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <p className="text-xs text-gray-600 font-semibold">Accesorios (c/IGV)</p>
                    <p className="text-lg font-bold text-gray-900">
                      ${totales.accesoriosTotalConIgv.toFixed(2)}
                    </p>
                  </div>
                )}

                {totales.regalosTotalConIgv > 0 && (
                  <div className="bg-white p-4 rounded-lg border border-green-200">
                    <p className="text-xs text-gray-600 font-semibold">Regalos (c/IGV)</p>
                    <p className="text-lg font-bold text-gray-900">
                      ${totales.regalosTotalConIgv.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white border-2 border-green-400 rounded-lg p-4">
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Subtotal (S/IGV):</span>
                    <span className="font-bold">${totales.subtotalSinIgv.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">IGV ({(igvRate * 100).toFixed(0)}%):</span>
                    <span className="font-bold text-green-600">+${totales.igvTotal.toFixed(2)}</span>
                  </div>
                </div>
                <div className="border-t pt-2">
                  <div className="flex justify-between text-lg">
                    <span className="font-bold text-gray-900">TOTAL (CON IGV):</span>
                    <span className="font-bold text-3xl text-green-600">
                      ${totales.granTotal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* BOTONES DE ACCIÓN */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={copiarEnlace}
                  variant="outline"
                  className="gap-2"
                >
                  <Share2 className="h-5 w-5" />
                  Copiar Enlace
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Copia el enlace para compartir
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={generatePDF}
                  disabled={generatingPdf}
                  className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white shadow-lg gap-2"
                >
                  {generatingPdf ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Generando PDF...
                    </>
                  ) : (
                    <>
                      <Download className="h-5 w-5" />
                      Descargar PDF Completo
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Descarga la cotización en formato PDF
              </TooltipContent>
            </Tooltip>
          </div>

          {/* INFO */}
          <Card className="bg-blue-50 border border-blue-200">
            <CardContent className="pt-6">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-semibold mb-2">Información:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    <li>Este enlace es público y puede ser compartido</li>
                    <li>Puedes descargar el PDF en cualquier momento sin restricciones</li>
                    <li>Los precios mostrados incluyen vehículo, accesorios y regalos</li>
                    <li>Todos los precios incluyen IGV ({(igvRate * 100).toFixed(0)}%)</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}