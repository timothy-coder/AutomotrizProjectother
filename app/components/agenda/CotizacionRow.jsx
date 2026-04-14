// File: app/(dashboard)/cotizaciones/[id]/CotizacionRow.jsx

"use client";

import { Copy, Edit, Eye, FileText, Link as LinkIcon, MoreVertical, Send, Trash2, Loader2, CheckCircle, Package, EyeIcon, Gift } from "lucide-react";
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
import { useRouter } from "next/navigation";
import { useUserScope } from "@/hooks/useUserScope";
import AgregarAccesoriosDialog from "./AgregarAccesoriosDialog";
import CotizacionRegalosDialog from "./CotizacionRegalosDialog";
import Link from "next/link";

function getRowBgColor(estado) {
  if (estado === "aceptada") {
    return "bg-green-50 hover:bg-green-100";
  } else if (estado === "cancelado") {
    return "bg-red-50 hover:bg-red-100";
  } else if (estado === "enviada" || estado === "reservada") {
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
  const router = useRouter();
  const { userId, loading: userScopeLoading } = useUserScope();
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [loadingHistorial, setLoadingHistorial] = useState(false);
  const [creatingReserva, setCreatingReserva] = useState(false);
  const [openAccesoriosDialog, setOpenAccesoriosDialog] = useState(false);
  const [openRegalosDialog, setOpenRegalosDialog] = useState(false);

  async function generatePDF() {
  try {
    if (!cot || !cot.id) {
      return;
    }

    setGeneratingPdf(true);

    const cotizacionId = cot.id;
    
    // CAMBIO: Usar POST en lugar de GET
    const response = await fetch("/api/cotizaciones-pdf", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cotizacion_id: cotizacionId }),
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

      if (navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(enlaceUrl);
          toast.success("Enlace copiado al portapapeles");
        } catch (clipboardError) {
          console.warn("Error con clipboard API:", clipboardError);
          copyToClipboardFallback(enlaceUrl);
        }
      } else {
        copyToClipboardFallback(enlaceUrl);
      }

      window.open(enlaceUrl, "_blank", "noopener,noreferrer");

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

  // ✅ CREAR RESERVA - CAMBIAR ESTADO A "RESERVADA"
  // ✅ CREAR RESERVA - CAMBIAR ESTADO A "RESERVADA"
async function handleCrearReserva() {
  try {
    if (!cot.oportunidad_id) {
      toast.error("No se encontró la oportunidad");
      return;
    }

    if (!userId) {
      toast.error("Usuario no identificado");
      return;
    }

    setCreatingReserva(true);

    // 1️⃣ Cambiar estado a "reservada"
    await onChangeStatus(cot, "reservada");

    // 2️⃣ Crear o verificar VIN en historial_carros
    if (cot.sku) {
      try {
        await fetch("/api/historial-carros", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vin: cot.sku,
            marca_id: cot.marca_id,
            modelo_id: cot.modelo_id,
            version_id: cot.version_id,
            anio: cot.anio,
            color_externo: cot.color_externo,
            color_interno: cot.color_interno,
          }),
        });
      } catch (vinError) {
        console.warn("Advertencia al registrar VIN:", vinError);
      }
    }

    // 3️⃣ Crear reserva
    const resReserva = await fetch("/api/reservas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oportunidad_id: cot.oportunidad_id,
        created_by: userId,
        vin: cot.sku,
      }),
    });

    if (!resReserva.ok) {
      const errorData = await resReserva.json();
      throw new Error(errorData.message || "Error creando reserva");
    }

    const dataReserva = await resReserva.json();
    
    // 4️⃣ Cambiar etapa de oportunidad a "Reserva" (etapa 8)
    try {
      await fetch(`/api/oportunidades-oportunidades/${cot.oportunidad_id}/etapa`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          etapasconversion_id: 8,
          created_by: userId,
        }),
      });
    } catch (etapaError) {
      console.warn("Advertencia al cambiar etapa:", etapaError);
    }

    toast.success("Reserva creada correctamente");
    
    // ✅ REFRESH AUTOMÁTICO después de 1 segundo
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  } catch (error) {
    console.error("Error creando reserva:", error);
    toast.error("Error: " + error.message);
  } finally {
    setCreatingReserva(false);
  }
}

// ✅ ENVIAR NOTA DE PEDIDO - CAMBIAR ESTADO A "ENVIADA" Y CREAR RESERVA
async function handleEnviarNotaPedido() {
  try {
    if (!cot.oportunidad_id) {
      toast.error("No se encontró la oportunidad");
      return;
    }

    if (!userId) {
      toast.error("Usuario no identificado");
      return;
    }

    setCreatingReserva(true);

    // 1️⃣ Cambiar estado a "enviada"
    await onChangeStatus(cot, "enviada");

    // 2️⃣ Crear o verificar VIN en historial_carros
    if (cot.sku) {
      try {
        await fetch("/api/historial-carros", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            vin: cot.sku,
            marca_id: cot.marca_id,
            modelo_id: cot.modelo_id,
            version_id: cot.version_id,
            anio: cot.anio,
            color_externo: cot.color_externo,
            color_interno: cot.color_interno,
          }),
        });
      } catch (vinError) {
        console.warn("Advertencia al registrar VIN:", vinError);
      }
    }

    // 3️⃣ Crear reserva
    const resReserva = await fetch("/api/reservas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        oportunidad_id: cot.oportunidad_id,
        created_by: userId,
        vin: cot.sku,
      }),
    });

    if (!resReserva.ok) {
      const errorData = await resReserva.json();
      throw new Error(errorData.message || "Error creando reserva");
    }

    const dataReserva = await resReserva.json();
    
    // 4️⃣ Cambiar etapa de oportunidad a "Reserva" (etapa 8)
    try {
      await fetch(`/api/oportunidades-oportunidades/${cot.oportunidad_id}/etapa`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          etapasconversion_id: 8,
          created_by: userId,
        }),
      });
    } catch (etapaError) {
      console.warn("Advertencia al cambiar etapa:", etapaError);
    }

    toast.success("Nota de pedido enviada y reserva creada");
    
    // 5️⃣ Redirigir a la reserva después de 1.5 segundos
    setTimeout(() => {
      router.push(`/reservas/${dataReserva.id}`);
    }, 1500);
  } catch (error) {
    console.error("Error:", error);
    toast.error("Error: " + error.message);
  } finally {
    setCreatingReserva(false);
  }
}

  // ✅ ENVIAR NOTA DE PEDIDO - CAMBIAR ESTADO A "ENVIADA" Y CREAR RESERVA
  async function handleEnviarNotaPedido() {
    try {
      if (!cot.oportunidad_id) {
        toast.error("No se encontró la oportunidad");
        return;
      }

      if (!userId) {
        toast.error("Usuario no identificado");
        return;
      }

      setCreatingReserva(true);

      // 1️⃣ Cambiar estado a "enviada"
      await onChangeStatus(cot, "enviada");

      // 2️⃣ Crear reserva
      const resReserva = await fetch("/api/reservas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oportunidad_id: cot.oportunidad_id,
          created_by: userId,
        }),
      });

      if (!resReserva.ok) {
        const errorData = await resReserva.json();
        throw new Error(errorData.message || "Error creando reserva");
      }

      const dataReserva = await resReserva.json();
      
      // 3️⃣ Cambiar etapa de oportunidad a "Reserva" (etapa 8)
      try {
        await fetch(`/api/oportunidades-oportunidades/${cot.oportunidad_id}/etapa`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            etapasconversion_id: 8,
            created_by: userId,
          }),
        });
      } catch (etapaError) {
        console.warn("Advertencia al cambiar etapa:", etapaError);
      }

      toast.success("Nota de pedido enviada y reserva creada");
      
      // 4️⃣ Redirigir a la reserva después de 1.5 segundos
      setTimeout(() => {
        router.push(`/reservas/${dataReserva.id}`);
      }, 1500);
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error: " + error.message);
    } finally {
      setCreatingReserva(false);
    }
  }

  return (
    <>
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
          </div>
        </td>
        <td className="py-3 px-4">
          <div className="flex items-center gap-2">
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
                : cot.estado === "reservada"
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
              : cot.estado === "reservada"
              ? "✓ Reservada"
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
          <div className="flex items-center justify-center">
            {/* ✅ BOTÓN PREVISUALIZACIÓN - LLEVA A LA PÁGINA */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Link href={`/cotizaciones/${cot.id}/resumen`}>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="text-xs text-purple-600 hover:text-purple-700 gap-1"
                  >
                    <EyeIcon size={16} />
                  </Button>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="top">
                Ver resumen de cotización
              </TooltipContent>
            </Tooltip>
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
                  disabled={saving || creatingReserva || userScopeLoading}
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

                {/* ✅ AGREGAR ACCESORIOS */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem
                      onClick={() => setOpenAccesoriosDialog(true)}
                      disabled={saving}
                      className="cursor-help"
                    >
                      <Package size={14} className="mr-2" />
                      Agregar Accesorios
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    Agregar accesorios disponibles a esta cotización
                  </TooltipContent>
                </Tooltip>

                {/* ✅ AGREGAR REGALOS */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem
                      onClick={() => setOpenRegalosDialog(true)}
                      disabled={saving}
                      className="cursor-help"
                    >
                      <Gift size={14} className="mr-2" />
                      Agregar Regalos
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    Agregar regalos disponibles a esta cotización
                  </TooltipContent>
                </Tooltip>

                <DropdownMenuSeparator />

                {/* ✅ ENVIAR NOTA DE PEDIDO */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuItem
                      onClick={handleEnviarNotaPedido}
                      disabled={saving || creatingReserva || userScopeLoading}
                      className="cursor-help"
                    >
                      <Send size={14} className="mr-2" />
                      {creatingReserva ? "Procesando..." : "Enviar Nota de Pedido"}
                    </DropdownMenuItem>
                  </TooltipTrigger>
                  <TooltipContent side="left">
                    Crea nota de pedido
                  </TooltipContent>
                </Tooltip>


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
                  <LinkIcon size={14} className="mr-2" />
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

      {/* ✅ DIÁLOGO DE ACCESORIOS */}
      <AgregarAccesoriosDialog
        open={openAccesoriosDialog}
        onOpenChange={setOpenAccesoriosDialog}
        cotizacion={cot}
        marcaId={cot.marca_id}
        modeloId={cot.modelo_id}
      />

      {/* ✅ DIÁLOGO DE REGALOS */}
      <CotizacionRegalosDialog
        open={openRegalosDialog}
        onOpenChange={setOpenRegalosDialog}
        cotizacion={cot}
      />
    </>
  );
}