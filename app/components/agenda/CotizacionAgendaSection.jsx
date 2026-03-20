// ============================================
// COMPONENTE DE COTIZACIONES - COMPLETO
// archivo: components/CotizacionesAgendaTab.jsx
// ============================================

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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Plus,
  Loader2,
  ChevronDown,
  Trash2,
  Copy,
  FileText,
  Send,
  MoreVertical,
  Edit,
} from "lucide-react";

export default function CotizacionesAgendaSection({ oportunidadId, oportunidadData }) {
  const { userId, loading: userLoading } = useUserScope();

  const [cotizaciones, setCotizaciones] = useState([]);
  const [marcas, setMarcas] = useState([]);
  const [modelos, setModelos] = useState([]);
  const [versiones, setVersiones] = useState([]);
  const [modeloEspecificaciones, setModeloEspecificaciones] = useState([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState(false);

  const [editingCotizacion, setEditingCotizacion] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const [selectedMarca, setSelectedMarca] = useState("");
  const [selectedModelo, setSelectedModelo] = useState("");
  const [expandedEspecificaciones, setExpandedEspecificaciones] = useState(false);

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
        fetch("/api/versiones", { cache: "no-store" }).then((r) => r.json()),
      ]);

      setCotizaciones(Array.isArray(cot) ? cot : []);
      setMarcas(Array.isArray(m) ? m : []);
      setModelos(Array.isArray(mo) ? mo : []);
      setVersiones(Array.isArray(v) ? v : []);
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

      console.log("Body a enviar:", body);

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      console.log("Response status:", response.status);

      if (response.ok) {
        const data = await response.json();
        console.log("Respuesta exitosa:", data);
        toast.success(editingCotizacion ? "Actualizada" : "Creada");
        setDialogOpen(false);
        loadData();
      } else {
        const errorData = await response.json();
        console.log("Error response:", errorData);
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
      setGeneratingPdf(true);

      const response = await fetch(
        `/api/cotizacionesagenda/${cotizacion.id}/pdf`
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

      toast.success("PDF generado correctamente");
    } catch (error) {
      console.error(error);
      toast.error("Error generando PDF");
    } finally {
      setGeneratingPdf(false);
    }
  }

  async function sendOrder(cotizacion) {
    try {
      setSaving(true);
      await changeStatus(cotizacion, "enviada");
    } finally {
      setSaving(false);
    }
  }

  const modelosFiltrados = selectedMarca
    ? modelos.filter((m) => m.marca_id === parseInt(selectedMarca))
    : [];

  const marcaObj = marcas.find((m) => m.id === parseInt(selectedMarca));
  const modeloObj = modelos.find((m) => m.id === parseInt(selectedModelo));
  const versionObj = versiones.find((v) => v.id === parseInt(formData.version_id));

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
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="text-red-600 text-xl font-bold">📋</div>
          <h2 className="text-lg font-semibold">
            Cotización ({cotizaciones.length})
          </h2>
        </div>
        <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700">
          <Plus className="h-4 w-4 mr-2" /> Nuevo
        </Button>
      </div>

      {/* Tabla de cotizaciones */}
      <Card>
        <CardContent className="pt-6">
          {cotizaciones.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No hay cotizaciones
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
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
                        Etapa
                        <ChevronDown size={16} />
                      </button>
                    </th>
                    <th className="text-left py-3 px-4">
                      <button
                        onClick={() => handleSort("created_at")}
                        className="flex items-center gap-2 font-semibold text-gray-700 hover:text-gray-900"
                      >
                        Fecha de creación
                        <ChevronDown size={16} />
                      </button>
                    </th>
                    <th className="text-center py-3 px-4 font-semibold text-gray-700">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCotizaciones.map((cot) => (
                    <tr key={cot.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            Q-{String(cot.id).padStart(6, "0")}
                          </span>
                          <span className="text-sm text-gray-500">
                            {cot.marca} {cot.modelo}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-medium ${
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
                            : cot.estado.charAt(0).toUpperCase() +
                              cot.estado.slice(1)}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-gray-700">
                        {new Date(cot.created_at).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex justify-center">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-8 w-8"
                              >
                                <MoreVertical size={16} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onClick={() => openEdit(cot)}>
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
                                Generar PDF
                              </DropdownMenuItem>

                              <DropdownMenuSeparator />

                              <DropdownMenuItem
                                onClick={() => openDelete(cot)}
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
        <DialogContent className="max-w-4xl max-h-screen overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {editingCotizacion ? "Editar cotización" : "Nueva cotización"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-6">
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
              <div className="space-y-4">
                {/* SKU */}
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-2">
                    SKU
                  </label>
                  <Input
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, sku: e.target.value }))
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
              <div className="bg-gray-100 rounded-lg h-full flex items-center justify-center min-h-64">
                {modeloObj ? (
                  <div className="text-center">
                    <div className="text-6xl mb-2">🚗</div>
                    <p className="text-sm font-medium text-gray-700">
                      {marcaObj?.name} {modeloObj?.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {versionObj?.nombre || formData.anio || "Versión"}
                    </p>
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
                className="flex items-center gap-2 font-semibold mb-4 hover:text-blue-600"
              >
                {expandedEspecificaciones ? (
                  <ChevronDown size={20} />
                ) : (
                  <ChevronDown size={20} />
                )}
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
                    <div className="grid grid-cols-2 gap-6">
                      {modeloEspecificaciones.map((esp, idx) => (
                        <div key={idx}>
                          <p className="text-xs font-medium text-gray-600 mb-1">
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

          <DialogFooter className="mt-6">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={saveCotizacion}
              disabled={saving || !selectedMarca || !selectedModelo || !userId}
              className="bg-red-600 hover:bg-red-700"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Siguiente"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE DIALOG */}
      <Dialog open={deleteDialog} onOpenChange={setDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cancelar Cotización</DialogTitle>
          </DialogHeader>

          <p>
            ¿Cancelar la cotización{" "}
            <b>
              Q-{String(deleteTarget?.id).padStart(6, "0")} -{" "}
              {deleteTarget?.marca} {deleteTarget?.modelo}
            </b>
            ?
          </p>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialog(false)}
            >
              No, mantener
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                changeStatus(deleteTarget, "cancelado");
                setDeleteDialog(false);
              }}
            >
              Sí, cancelar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}