"use client";

import { Copy, Edit, Eye, FileText, Link, MoreVertical, Send, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useState } from "react";
import { toast } from "sonner";

function getRowBgColor(estado) {
  if (estado === "aceptada") {
    return "bg-green-50 hover:bg-green-100";
  } else if (estado === "cancelado") {
    return "bg-red-50 hover:bg-red-100";
  } else if (estado === "enviada") {
    return "bg-green-100 hover:bg-green-200";
  }
  return "bg-white hover:bg-blue-50";
}

export default function CotizacionRow({
  cot,
  idx,
  onEdit,
  onDelete,
  onChangeStatus,
  onDuplicate,
  onLoadHistorial,
  saving,
  onOpenHistorialDialog,
}) {
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);

  async function generatePDF() {
    try {
      if (!cot || !cot.id) {
        return;
      }

      setGeneratingPdf(true);

      const cotizacionId = String(cot.id);
      const url = `/api/cotizacionesagenda/${cotizacionId}/pdf`;

      const response = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Error response:", errorText);
        throw new Error(`Error ${response.status}: ${errorText}`);
      }

      const blob = await response.blob();

      if (blob.size === 0) {
        throw new Error("PDF vacío recibido");
      }

      const objectUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `Cotizacion-Q-${String(cot.id).padStart(6, "0")}.pdf`;
      document.body.appendChild(link);
      link.click();

      setTimeout(() => {
        window.URL.revokeObjectURL(objectUrl);
        document.body.removeChild(link);
      }, 100);

      toast.success("PDF descargado correctamente");
    } catch (error) {
      console.error("Error generando PDF:", error);
      toast.error("Error generando PDF: " + error.message);
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function generarEnlacePublico() {
    try {
      if (!cot || !cot.id) {
        return;
      }

      const cotizacionId = String(cot.id);
      const url = `/api/cotizacionesagenda/${cotizacionId}/enlace-publico`;

      const res = await fetch(url, {
        method: "GET",
        cache: "no-store",
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Error response:", errorText);
        toast.error("Error generando enlace");
        return;
      }

      const data = await res.json();

      if (!data.token) {
        throw new Error("No se recibió token en la respuesta");
      }

      const enlaceUrl = `${window.location.origin}/cotizacion-publica/${data.token}`;

      // Copiar al portapapeles de forma segura
      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(enlaceUrl);
          toast.success("Enlace copiado al portapapeles");
        } catch (clipboardError) {
          console.warn("Error con clipboard API:", clipboardError);
          // Fallback: copiar usando método antiguo
          copyToClipboardFallback(enlaceUrl);
        }
      } else {
        // Fallback para navegadores sin soporte
        copyToClipboardFallback(enlaceUrl);
      }

      // Abrir enlace en nueva pestaña
      window.open(enlaceUrl, "_blank", "noopener,noreferrer");

      // Recargar la página después de 1 segundo para mostrar el enlace
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } catch (error) {
      console.error("Error generando enlace:", error);
      toast.error("Error generando enlace: " + error.message);
    }
  }

  function copyToClipboardFallback(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      toast.success("Enlace copiado al portapapeles");
    } catch (err) {
      console.error("Error copiando:", err);
      toast.error("No se pudo copiar el enlace");
    }
    document.body.removeChild(textarea);
  }

  async function handleVerHistorial() {
    try {
      setLoadingHistorial(true);
      const res = await fetch(
        `/api/cotizacionesagenda/${cot.id}/vistas-historial`,
        { cache: "no-store" }
      );
      const data = await res.json();
      
      if (onOpenHistorialDialog) {
        onOpenHistorialDialog(data);
      } else if (onLoadHistorial) {
        onLoadHistorial(cot.id);
      }
    } catch (error) {
      console.error("Error cargando historial:", error);
      toast.error("Error cargando historial");
    } finally {
      setLoadingHistorial(false);
    }
  }

  return (
    <tr
      className={`border-b transition-colors ${getRowBgColor(cot.estado)} ${
        idx % 2 === 1 ? "" : "opacity-95"
      }`}
    >
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <span className="font-bold text-blue-600">
            Q-{String(cot.id).padStart(6, "0")}
          </span>
          <span className="text-sm text-gray-500">
            {cot.marca} {cot.modelo}
          </span>
        </div>
      </td>
      <td className="py-3 px-4">
        <span
          className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
            cot.estado === "aceptada"
              ? "bg-green-100 text-green-700 border border-green-300"
              : cot.estado === "enviada"
              ? "bg-green-200 text-green-800 border border-green-400 animate-pulse"
              : cot.estado === "cancelado"
              ? "bg-red-100 text-red-700 border border-red-300"
              : "bg-gray-100 text-gray-700 border border-gray-300"
          }`}
        >
          {cot.estado === "borrador"
            ? "Abierto"
            : cot.estado === "enviada"
            ? "✓ Enviado"
            : cot.estado === "aceptada"
            ? "✓ Aceptado"
            : cot.estado === "cancelado"
            ? "✗ Cancelado"
            : cot.estado}
        </span>
      </td>
      <td className="py-3 px-4 text-sm text-gray-600">
        {new Date(cot.created_at).toLocaleDateString("es-ES", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center justify-center">
          {cot.enlace_publico_token ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-xs text-blue-600 hover:text-blue-700 gap-1 cursor-help"
                  onClick={handleVerHistorial}
                  disabled={loadingHistorial}
                >
                  {loadingHistorial ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Cargando...
                    </>
                  ) : (
                    <>
                      <Eye size={14} />
                      Ver historial
                    </>
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Ver estadísticas de aperturas
              </TooltipContent>
            </Tooltip>
          ) : (
            <span className="text-xs text-gray-500">Sin compartir</span>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center justify-center gap-2">
          {cot.enlace_publico_token ? (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-green-600 hover:text-green-700"
                    onClick={() => {
                      window.open(
                        `${window.location.origin}/cotizacion-publica/${cot.enlace_publico_token}`,
                        "_blank"
                      );
                    }}
                  >
                    <Eye size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">Ver enlace público</TooltipContent>
              </Tooltip>
            </>
          ) : (
            <span className="text-xs text-gray-500">Sin compartir</span>
          )}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex justify-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="h-8 w-8"
                disabled={saving}
              >
                <MoreVertical size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem
                onClick={() => onEdit(cot)}
                disabled={saving}
              >
                <Edit size={14} className="mr-2" />
                Modificar
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => onChangeStatus(cot, "enviada")}
                disabled={saving}
              >
                <Send size={14} className="mr-2" />
                Enviar pedido
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => onDuplicate(cot)}
                disabled={saving}
              >
                <Copy size={14} className="mr-2" />
                Duplicar
              </DropdownMenuItem>

              <DropdownMenuItem
                onClick={generatePDF}
                disabled={generatingPdf}
              >
                <FileText size={14} className="mr-2" />
                Descargar PDF
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={generarEnlacePublico}
                disabled={saving}
              >
                <Link size={14} className="mr-2" />
                {cot.enlace_publico_token
                  ? "Compartir enlace"
                  : "Generar enlace público"}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => onChangeStatus(cot, "cancelado")}
                disabled={saving}
                className="text-red-600"
              >
                <Trash2 size={14} className="mr-2" />
                Cancelar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </tr>
  );
}