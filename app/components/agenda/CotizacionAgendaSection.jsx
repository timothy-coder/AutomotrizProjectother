"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useUserScope } from "@/hooks/useUserScope";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Loader2,
  ChevronDown,
  Trash2,
  Copy,
  FileText,
  Send,
  Link,
  Eye,
  MoreVertical,
  Edit,
  Calendar,
  Clock,
} from "lucide-react";

export default function CotizacionesAgendaSection({
  oportunidadId,
  oportunidadData,
}) {
  const { userId, loading: userLoading } = useUserScope();

  const [cotizaciones, setCotizaciones] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [versiones, setVersiones] = useState([]);
  const [modeloEspecificaciones, setModeloEspecificaciones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [historialLoading, setHistorialLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);
  const [historialDialog, setHistorialDialog] = useState(false);
  const [selectedHistorial, setSelectedHistorial] = useState(null);

  const [editingCotizacion, setEditingCotizacion] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [selectedMarca, setSelectedMarca] = useState("");
  const [selectedModelo, setSelectedModelo] = useState("");
  const [expandedEspecificaciones, setExpandedEspecificaciones] =
    useState(false);

  const [loadingEspecificaciones, setLoadingEspecificaciones] = useState(false);
  const [saving, setSaving] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const [formData, setFormData] = useState({
    sku: "",
    color_externo: "",
    color_interno: "",
    version_id: "",
    anio: "",
  });

  const [sortConfig, setSortConfig] = useState({
    key: "id",
    direction: "asc",
  });

  async function loadData() {
    setLoading(true);
    try {
      const [cot, m, mo, v] = await Promise.all([
        fetch(`/api/cotizacionesagenda?oportunidad_id=${oportunidadId}`, {
          cache: "no-store",
        }).then((r) => r.json()),
        fetch("/api/marcas", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/modelos", { cache: "no-store" }).then((r) => r.json()),
        fetch("/api/versiones?limit=1000", { cache: "no-store" }).then((r) =>
          r.json()
        ),
      ]);

      setCotizaciones(Array.isArray(cot) ? cot : []);
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
      console.error(error);
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  async function loadModeloEspecificaciones() {
    if (!selectedMarca || !selectedModelo) {
      setModeloEspecificaciones([]);
      return;
    }

    setLoadingEspecificaciones(true);
    try {
      const response = await fetch(
        `/api/modelo-especificaciones?marca_id=${selectedMarca}&modelo_id=${selectedModelo}`,
        { cache: "no-store" }
      );

      const data = await response.json();
      setModeloEspecificaciones(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
      toast.error("Error cargando especificaciones");
      setModeloEspecificaciones([]);
    } finally {
      setLoadingEspecificaciones(false);
    }
  }

  async function loadHistorial(cotizacionId) {
    try {
      setHistorialLoading(true);
      const res = await fetch(
        `/api/cotizacionesagenda/${cotizacionId}/vistas-historial`,
        { cache: "no-store" }
      );
      const data = await res.json();
      setSelectedHistorial(data);
      setHistorialDialog(true);
    } catch (error) {
      console.error(error);
      toast.error("Error cargando historial");
    } finally {
      setHistorialLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, [oportunidadId]);

  useEffect(() => {
    loadModeloEspecificaciones();
  }, [selectedMarca, selectedModelo]);

  function openCreate() {
    setEditingCotizacion(null);
    setSelectedMarca("");
    setSelectedModelo("");
    setExpandedEspecificaciones(false);
    setFormData({
      sku: "",
      color_externo: "",
      color_interno: "",
      version_id: "",
      anio: "",
    });
    setDialogOpen(true);
  }

  function openEdit(cotizacion) {
    setEditingCotizacion(cotizacion);
    setSelectedMarca(cotizacion.marca_id.toString());
    setSelectedModelo(cotizacion.modelo_id.toString());
    setFormData({
      sku: cotizacion.sku || "",
      color_externo: cotizacion.color_externo || "",
      color_interno: cotizacion.color_interno || "",
      version_id: cotizacion.version_id || "",
      anio: cotizacion.anio || "",
    });
    setDialogOpen(true);
  }

  async function saveCotizacion() {
    if (!selectedMarca || !selectedModelo) {
      return toast.warning("Selecciona marca y modelo");
    }

    if (!userId) {
      return toast.error("No se pudo obtener el ID del usuario");
    }

    setSaving(true);

    try {
      const url = editingCotizacion
        ? `/api/cotizacionesagenda/${editingCotizacion.id}`
        : "/api/cotizacionesagenda";

      const method = editingCotizacion ? "PUT" : "POST";

      const body = editingCotizacion
        ? {
            sku: formData.sku || null,
            color_externo: formData.color_externo || null,
            color_interno: formData.color_interno || null,
            version_id: formData.version_id || null,
            anio: formData.anio ? parseInt(formData.anio) : null,
            marca_id: parseInt(selectedMarca),
            modelo_id: parseInt(selectedModelo),
            estado: "borrador",
          }
        : {
            oportunidad_id: parseInt(oportunidadId),
            marca_id: parseInt(selectedMarca),
            modelo_id: parseInt(selectedModelo),
            version_id: formData.version_id || null,
            anio: formData.anio ? parseInt(formData.anio) : null,
            sku: formData.sku || null,
            color_externo: formData.color_externo || null,
            color_interno: formData.color_interno || null,
            estado: "borrador",
            created_by: userId,
          };

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (response.ok) {
        toast.success(editingCotizacion ? "Actualizada" : "Creada");
        setDialogOpen(false);
        loadData();
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || "Error guardando cotización");
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error("Error guardando cotización: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  function openDelete(cotizacion) {
    setDeleteTarget(cotizacion);
    setDeleteDialog(true);
  }

  async function confirmDelete() {
    try {
      setSaving(true);
      const response = await fetch(`/api/cotizacionesagenda/${deleteTarget.id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success("Eliminada");
        setDeleteDialog(false);
        loadData();
      } else {
        toast.error("Error eliminando");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error eliminando");
    } finally {
      setSaving(false);
    }
  }

  async function duplicateCotizacion(cotizacion) {
    try {
      setSaving(true);
      const response = await fetch("/api/cotizacionesagenda", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oportunidad_id: cotizacion.oportunidad_id,
          marca_id: cotizacion.marca_id,
          modelo_id: cotizacion.modelo_id,
          version_id: cotizacion.version_id,
          anio: cotizacion.anio,
          sku: cotizacion.sku,
          color_externo: cotizacion.color_externo,
          color_interno: cotizacion.color_interno,
          estado: "borrador",
          created_by: userId,
        }),
      });

      if (response.ok) {
        toast.success("Cotización duplicada");
        loadData();
      } else {
        toast.error("Error duplicando cotización");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error duplicando cotización");
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(cotizacion, nuevoEstado) {
    try {
      setSaving(true);
      const response = await fetch(`/api/cotizacionesagenda/${cotizacion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sku: cotizacion.sku,
          color_externo: cotizacion.color_externo,
          color_interno: cotizacion.color_interno,
          version_id: cotizacion.version_id,
          anio: cotizacion.anio,
          marca_id: cotizacion.marca_id,
          modelo_id: cotizacion.modelo_id,
          estado: nuevoEstado,
        }),
      });

      if (response.ok) {
        toast.success(`Estado cambiado a ${nuevoEstado}`);
        loadData();
      } else {
        toast.error("Error cambiando estado");
      }
    } catch (error) {
      console.error(error);
      toast.error("Error cambiando estado");
    } finally {
      setSaving(false);
    }
  }

  async function generatePDF(cotizacion) {
    try {
      if (!cotizacion || !cotizacion.id) {
        console.error("Cotización sin ID:", cotizacion);
        toast.error("La cotización no tiene un ID válido");
        return;
      }

      console.log("Generando PDF para cotización ID:", cotizacion.id);

      setGeneratingPdf(true);

      const cotizacionId = String(cotizacion.id);
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
      link.download = `Cotizacion-Q-${String(cotizacion.id).padStart(6, "0")}.pdf`;
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

  async function generarEnlacePublico(cotizacion) {
    try {
      if (!cotizacion || !cotizacion.id) {
        console.error("Cotización sin ID:", cotizacion);
        toast.error("La cotización no tiene un ID válido");
        return;
      }

      console.log("Generando enlace público para cotización ID:", cotizacion.id);

      setSaving(true);

      const cotizacionId = String(cotizacion.id);
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

      await navigator.clipboard.writeText(enlaceUrl);
      toast.success("Enlace copiado al portapapeles");

      window.open(enlaceUrl, "_blank", "noopener,noreferrer");

      loadData();
    } catch (error) {
      console.error("Error generando enlace:", error);
      toast.error("Error generando enlace: " + error.message);
    } finally {
      setSaving(false);
    }
  }

  const modelosFiltrados = selectedMarca
    ? modelos.filter((m) => m.marca_id === parseInt(selectedMarca))
    : [];

  const marcaObj = marcas.find((m) => m.id === parseInt(selectedMarca));
  const modeloObj = modelos.find((m) => m.id === parseInt(selectedModelo));
  const versionObj = versiones.find(
    (v) => v.id === parseInt(formData.version_id)
  );

  const sortedCotizaciones = [...cotizaciones].sort((a, b) => {
    let aVal = a[sortConfig.key];
    let bVal = b[sortConfig.key];

    if (typeof aVal === "string") {
      aVal = aVal.toLowerCase();
      bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return sortConfig.direction === "asc" ? -1 : 1;
    if (aVal > bVal) return sortConfig.direction === "asc" ? 1 : -1;
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig({
      key,
      direction:
        sortConfig.key === key && sortConfig.direction === "asc"
          ? "desc"
          : "asc",
    });
  };

  if (loading || userLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
                <FileText className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  Cotizaciones
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Gestiona todas las cotizaciones de esta oportunidad
                </p>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={openCreate}
                  className="bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Nueva Cotización
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">
                Crear nueva cotización
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* TABLA DE COTIZACIONES */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
            <CardTitle className="text-lg font-bold text-gray-900">
              Lista de Cotizaciones
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-6">
            {cotizaciones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-gray-100 rounded-full mb-3">
                  <FileText className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  No hay cotizaciones
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Haz clic en "Nueva Cotización" para crear una
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b-2 border-gray-200">
                      <th className="text-left py-3 px-4">
                        <button
                          onClick={() => handleSort("id")}
                          className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                        >
                          Número
                          <ChevronDown size={16} />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <button
                          onClick={() => handleSort("estado")}
                          className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                        >
                          Estado
                          <ChevronDown size={16} />
                        </button>
                      </th>
                      <th className="text-left py-3 px-4">
                        <button
                          onClick={() => handleSort("created_at")}
                          className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                        >
                          Fecha
                          <ChevronDown size={16} />
                        </button>
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">
                        Vistas
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">
                        Enlace Público
                      </th>
                      <th className="text-center py-3 px-4 font-semibold text-gray-700">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedCotizaciones.map((cot, idx) => (
                      <tr
                        key={cot.id}
                        className={`border-b hover:bg-blue-50 transition-colors ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50"
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
                                ? "bg-green-100 text-green-700"
                                : cot.estado === "enviada"
                                ? "bg-blue-100 text-blue-700"
                                : cot.estado === "cancelado"
                                ? "bg-red-100 text-red-700"
                                : "bg-gray-100 text-gray-700"
                            }`}
                          >
                            {cot.estado === "borrador"
                              ? "Abierto"
                              : cot.estado === "enviada"
                              ? "Enviado"
                              : cot.estado === "aceptada"
                              ? "Aceptado"
                              : cot.estado === "cancelado"
                              ? "Cancelado"
                              : cot.estado}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-sm text-gray-600">
                          {new Date(cot.created_at).toLocaleDateString(
                            "es-ES",
                            {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }
                          )}
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
                                    onClick={() =>
                                      loadHistorial(cot.id)
                                    }
                                  >
                                    <Eye size={14} />
                                    Ver historial
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  Ver estadísticas de aperturas
                                </TooltipContent>
                              </Tooltip>
                            ) : (
                              <span className="text-xs text-gray-500">
                                Sin compartir
                              </span>
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
                                  <TooltipContent side="top">
                                    Ver enlace público
                                  </TooltipContent>
                                </Tooltip>
                              </>
                            ) : (
                              <span className="text-xs text-gray-500">
                                Sin compartir
                              </span>
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
                              <DropdownMenuContent
                                align="end"
                                className="w-56"
                              >
                                <DropdownMenuItem
                                  onClick={() => openEdit(cot)}
                                  disabled={saving}
                                >
                                  <Edit size={14} className="mr-2" />
                                  Modificar
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() => changeStatus(cot, "enviada")}
                                  disabled={saving}
                                >
                                  <Send size={14} className="mr-2" />
                                  Enviar pedido
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() => duplicateCotizacion(cot)}
                                  disabled={saving}
                                >
                                  <Copy size={14} className="mr-2" />
                                  Duplicar
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                  onClick={() => generatePDF(cot)}
                                  disabled={generatingPdf}
                                >
                                  <FileText size={14} className="mr-2" />
                                  Descargar PDF
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() => generarEnlacePublico(cot)}
                                  disabled={saving}
                                >
                                  <Link size={14} className="mr-2" />
                                  {cot.enlace_publico_token
                                    ? "Compartir enlace"
                                    : "Generar enlace público"}
                                </DropdownMenuItem>

                                <DropdownMenuSeparator />

                                <DropdownMenuItem
                                  onClick={() => openDelete(cot)}
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* DIALOG NUEVA/EDITAR COTIZACIÓN */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editingCotizacion ? "Editar cotización" : "Nueva cotización"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Columna Izquierda - Selección de Vehículo */}
              <div className="col-span-1">
                <h3 className="font-semibold mb-4 text-sm text-gray-700">
                  Selecciona un vehículo
                </h3>

                <div className="space-y-4">
                  {/* Marca */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-2">
                      Marca
                    </label>
                    <Select
                      value={selectedMarca}
                      onValueChange={(value) => {
                        setSelectedMarca(value);
                        setSelectedModelo("");
                      }}
                      disabled={!!editingCotizacion}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Selecciona marca" />
                      </SelectTrigger>
                      <SelectContent>
                        {marcas.map((m) => (
                          <SelectItem key={m.id} value={m.id.toString()}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedMarca && marcaObj && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700 font-medium">
                        ✓ {marcaObj.name}
                      </div>
                    )}
                  </div>

                  {/* Modelo */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-2">
                      Modelo
                    </label>
                    <Select
                      value={selectedModelo}
                      onValueChange={setSelectedModelo}
                      disabled={!selectedMarca || !!editingCotizacion}
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue
                          placeholder={
                            selectedMarca
                              ? "Selecciona modelo"
                              : "Selecciona marca primero"
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {modelosFiltrados.map((m) => (
                          <SelectItem key={m.id} value={m.id.toString()}>
                            {m.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedModelo && modeloObj && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700 font-medium">
                        ✓ {modeloObj.name}
                      </div>
                    )}
                  </div>

                  {/* Año */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-2">
                      Año
                    </label>
                    <Input
                      type="number"
                      value={formData.anio}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          anio: e.target.value,
                        }))
                      }
                      placeholder="2024"
                      min={2000}
                      max={new Date().getFullYear() + 1}
                      className="text-sm"
                    />
                  </div>

                  {/* Versión */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-2">
                      Versión
                    </label>
                    <Select
                      value={formData.version_id}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          version_id: value,
                        }))
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Selecciona versión" />
                      </SelectTrigger>
                      <SelectContent>
                        {versiones.map((v) => (
                          <SelectItem key={v.id} value={v.id.toString()}>
                            {v.nombre}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.version_id && versionObj && (
                      <div className="mt-2 p-2 bg-blue-50 rounded text-xs text-blue-700 font-medium">
                        ✓ {versionObj.nombre}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Columna Centro - Datos de Cotización */}
              <div className="col-span-1">
                <h3 className="font-semibold mb-4 text-sm text-gray-700">
                  Detalles
                </h3>

                <div className="space-y-4">
                  {/* SKU */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-2">
                      SKU
                    </label>
                    <Input
                      value={formData.sku}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          sku: e.target.value,
                        }))
                      }
                      placeholder="R533A01"
                      className="text-sm"
                    />
                  </div>

                  {/* Color Externo */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-2">
                      Color externo
                    </label>
                    <Select
                      value={formData.color_externo}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          color_externo: value,
                        }))
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Rojo">Rojo</SelectItem>
                        <SelectItem value="Negro">Negro</SelectItem>
                        <SelectItem value="Blanco">Blanco</SelectItem>
                        <SelectItem value="Plateado">Plateado</SelectItem>
                        <SelectItem value="Azul">Azul</SelectItem>
                        <SelectItem value="Gris">Gris</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Color Interno */}
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-2">
                      Color interno
                    </label>
                    <Select
                      value={formData.color_interno}
                      onValueChange={(value) =>
                        setFormData((prev) => ({
                          ...prev,
                          color_interno: value,
                        }))
                      }
                    >
                      <SelectTrigger className="text-sm">
                        <SelectValue placeholder="Seleccione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Negro">Negro</SelectItem>
                        <SelectItem value="Café">Café</SelectItem>
                        <SelectItem value="Gris">Gris</SelectItem>
                        <SelectItem value="Beige">Beige</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Columna Derecha - Imagen */}
              <div className="col-span-1">
                <h3 className="font-semibold mb-4 text-sm text-gray-700">
                  Vista previa
                </h3>
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg h-64 flex items-center justify-center">
                  {modeloObj ? (
                    <div className="text-center">
                      <div className="text-6xl mb-2">🚗</div>
                      <p className="text-sm font-semibold text-gray-800">
                        {marcaObj?.name} {modeloObj?.name}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {versionObj?.nombre || formData.anio || "Versión"}
                      </p>
                      {formData.color_externo && (
                        <div className="mt-3 flex justify-center gap-2">
                          <div
                            className="w-8 h-8 rounded-full border-2 border-gray-300"
                            style={{
                              backgroundColor:
                                {
                                  Rojo: "#EF4444",
                                  Negro: "#1F2937",
                                  Blanco: "#F3F4F6",
                                  Plateado: "#D1D5DB",
                                  Azul: "#3B82F6",
                                  Gris: "#9CA3AF",
                                }[formData.color_externo] || "#E5E7EB",
                            }}
                          />
                          <div
                            className="w-8 h-8 rounded-full border-2 border-gray-300"
                            style={{
                              backgroundColor:
                                {
                                  Negro: "#1F2937",
                                  Café: "#92400e",
                                  Gris: "#9CA3AF",
                                  Beige: "#FDE68A",
                                }[formData.color_interno] || "#E5E7EB",
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 text-sm">
                      Selecciona marca y modelo
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Especificaciones Técnicas */}
            {selectedMarca && selectedModelo && (
              <div className="mt-6 border-t pt-6">
                <button
                  onClick={() =>
                    setExpandedEspecificaciones(!expandedEspecificaciones)
                  }
                  className="flex items-center gap-2 font-semibold mb-4 hover:text-blue-600 transition-colors"
                >
                  <ChevronDown
                    size={20}
                    className={`transition-transform ${
                      expandedEspecificaciones ? "rotate-180" : ""
                    }`}
                  />
                  Especificaciones técnicas
                </button>

                {expandedEspecificaciones && (
                  <div>
                    {loadingEspecificaciones ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
                      </div>
                    ) : modeloEspecificaciones.length === 0 ? (
                      <p className="text-gray-500 text-sm py-4">
                        No hay especificaciones configuradas
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-6 bg-gray-50 p-4 rounded-lg">
                        {modeloEspecificaciones.map((esp, idx) => (
                          <div key={idx}>
                            <p className="text-xs font-semibold text-gray-600 mb-1 uppercase">
                              {esp.especificacion_nombre}
                            </p>
                            <p className="text-sm font-semibold text-gray-900">
                              {esp.valor}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <DialogFooter className="mt-6 gap-2">
              <Button
                variant="outline"
                onClick={() => setDialogOpen(false)}
                disabled={saving}
              >
                Cancelar
              </Button>
              <Button
                onClick={saveCotizacion}
                disabled={
                  saving ||
                  !selectedMarca ||
                  !selectedModelo ||
                  !userId
                }
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Guardando...
                  </>
                ) : editingCotizacion ? (
                  "Actualizar"
                ) : (
                  "Crear"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* DELETE DIALOG */}
        <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="text-red-600">
                Cancelar Cotización
              </DialogTitle>
            </DialogHeader>

            <p className="text-gray-700">
              ¿Cancelar la cotización{" "}
              <span className="font-bold">
                Q-{String(deleteTarget?.id).padStart(6, "0")}
              </span>
              ?
            </p>

            <p className="text-sm text-gray-600">
              {deleteTarget?.marca} {deleteTarget?.modelo}
            </p>

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setDeleteDialog(false)}
                disabled={saving}
              >
                No, mantener
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  changeStatus(deleteTarget, "cancelado");
                  setDeleteDialog(false);
                }}
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Cancelando...
                  </>
                ) : (
                  "Sí, cancelar"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* HISTORIAL DIALOG */}
        <Dialog open={historialDialog} onOpenChange={setHistorialDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-lg">
                Historial de Aperturas
              </DialogTitle>
            </DialogHeader>

            {historialLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : selectedHistorial ? (
              <div className="space-y-6">
                {/* ESTADÍSTICAS DE VISTAS */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-blue-600 font-medium">
                                Total de Aperturas
                              </p>
                              <p className="text-3xl font-bold text-blue-900 mt-2">
                                {selectedHistorial.vistas_totales}
                              </p>
                            </div>
                            <Eye className="h-12 w-12 text-blue-200" />
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Cantidad de veces que se ha visualizado esta cotización
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="pt-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="text-sm text-green-600 font-medium">
                                Última Apertura
                              </p>
                              <p className="text-sm font-bold text-green-900 mt-2">
                                {selectedHistorial.ultima_vista
                                  ? new Date(
                                      selectedHistorial.ultima_vista
                                    ).toLocaleDateString("es-ES", {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                      hour: "2-digit",
                                      minute: "2-digit",
                                    })
                                  : "Aún no vista"}
                              </p>
                            </div>
                            <Clock className="h-12 w-12 text-green-200" />
                          </div>
                        </CardContent>
                      </Card>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Fecha y hora de la última visualización
                    </TooltipContent>
                  </Tooltip>
                </div>

                {/* HISTORIAL DETALLADO */}
                {selectedHistorial.historial &&
                selectedHistorial.historial.length > 0 ? (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    <h3 className="font-semibold text-gray-900">
                      Detalles de aperturas:
                    </h3>
                    {selectedHistorial.historial.map((vista, idx) => (
                      <div
                        key={idx}
                        className={`p-4 rounded-lg border-l-4 ${
                          idx % 2 === 0
                            ? "border-l-purple-500 bg-purple-50 border border-purple-200"
                            : "border-l-gray-500 bg-gray-50 border border-gray-200"
                        }`}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-gray-600" />
                            <div>
                              <p className="text-xs text-gray-600 font-medium">
                                Fecha y Hora
                              </p>
                              <p className="font-semibold text-gray-900">
                                {new Date(vista.fecha_hora).toLocaleDateString(
                                  "es-ES",
                                  {
                                    day: "numeric",
                                    month: "short",
                                    year: "numeric",
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                  }
                                )}
                              </p>
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-gray-600 font-medium">
                              IP
                            </p>
                            <p className="font-mono text-sm text-gray-900">
                              {vista.ip_address}
                            </p>
                          </div>

                          <div>
                            <p className="text-xs text-gray-600 font-medium">
                              Dispositivo
                            </p>
                            <p className="text-xs text-gray-700 truncate">
                              {vista.user_agent.includes("Mobile")
                                ? "📱 Móvil"
                                : "💻 Escritorio"}
                              {vista.user_agent.includes("Chrome")
                                ? " - Chrome"
                                : vista.user_agent.includes("Firefox")
                                ? " - Firefox"
                                : vista.user_agent.includes("Safari")
                                ? " - Safari"
                                : ""}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-gray-600">
                      No hay registros de aperturas
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setHistorialDialog(false)}
              >
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}