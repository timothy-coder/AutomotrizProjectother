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
} from "lucide-react";
import { toast } from "sonner";

export default function CotizacionPublicaPage({ params: paramsPromise }) {
  const params = use(paramsPromise);

  const [cotizacion, setCotizacion] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generatingPdf, setGeneratingPdf] = useState(false);

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

        console.log("Response status:", resCot.status);

        if (!resCot.ok) {
          const error = await resCot.text();
          console.error("Error response:", error);
          toast.error("Cotización no encontrada");
          return;
        }

        const dataC = await resCot.json();

        console.log("Cotización cargada:", {
          id: dataC.id,
          marca: dataC.marca_nombre,
          modelo: dataC.modelo_nombre,
        });

        setCotizacion(dataC);

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

      const response = await fetch(
        `/api/cotizacionesagenda/${cotizacion.id}/pdf`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

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
                      {cotizacion.marca_nombre || "No especificado"}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-1">
                      MODELO
                    </p>
                    <p className="text-lg font-bold text-gray-900">
                      {cotizacion.modelo_nombre || "No especificado"}
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
                    <li>Cada apertura es registrada automáticamente</li>
                    <li>
                      Se muestra la IP, dispositivo y hora de cada visualización
                    </li>
                    <li>
                      Puedes descargar el PDF en cualquier momento sin restricciones
                    </li>
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