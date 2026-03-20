"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  DollarSign,
  Percent,
  Plus,
  Pencil,
  Trash2,
  AlertTriangle,
  Loader2,
  Info,
  CheckCircle,
  Globe,
} from "lucide-react";

export default function MonedasTab() {
  const [monedas, setMonedas] = useState([]);
  const [impuestos, setImpuestos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // ================= MONEDAS =================
  const [openMonedaDialog, setOpenMonedaDialog] = useState(false);
  const [openMonedaDelete, setOpenMonedaDelete] = useState(false);
  const [monedaEditId, setMonedaEditId] = useState(null);
  const [monedaToDelete, setMonedaToDelete] = useState(null);

  const [monedaForm, setMonedaForm] = useState({
    codigo: "",
    nombre: "",
    simbolo: "",
    is_active: true,
  });

  // ================= IMPUESTOS =================
  const [openImpuestoDialog, setOpenImpuestoDialog] = useState(false);
  const [openImpuestoDelete, setOpenImpuestoDelete] = useState(false);
  const [impuestoEditId, setImpuestoEditId] = useState(null);
  const [impuestoToDelete, setImpuestoToDelete] = useState(null);

  const [impuestoForm, setImpuestoForm] = useState({
    nombre: "",
    porcentaje: "",
    is_active: true,
  });

  async function loadData() {
    try {
      setLoading(true);

      const [monedasRes, impuestosRes] = await Promise.all([
        fetch("/api/monedas", { cache: "no-store" }),
        fetch("/api/impuestos", { cache: "no-store" }),
      ]);

      const monedasData = await monedasRes.json();
      const impuestosData = await impuestosRes.json();

      setMonedas(Array.isArray(monedasData) ? monedasData : []);
      setImpuestos(Array.isArray(impuestosData) ? impuestosData : []);
    } catch (e) {
      console.log(e);
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // ================= HELPERS MONEDA =================
  function resetMonedaForm() {
    setMonedaForm({
      codigo: "",
      nombre: "",
      simbolo: "",
      is_active: true,
    });
    setMonedaEditId(null);
  }

  function handleCreateMoneda() {
    resetMonedaForm();
    setOpenMonedaDialog(true);
  }

  function handleEditMoneda(row) {
    setMonedaEditId(row.id);
    setMonedaForm({
      codigo: row.codigo || "",
      nombre: row.nombre || "",
      simbolo: row.simbolo || "",
      is_active: Number(row.is_active) === 1,
    });
    setOpenMonedaDialog(true);
  }

  async function handleSaveMoneda() {
    if (!monedaForm.codigo || !monedaForm.nombre || !monedaForm.simbolo) {
      toast.error("Completa código, nombre y símbolo");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        codigo: monedaForm.codigo.trim().toUpperCase(),
        nombre: monedaForm.nombre.trim(),
        simbolo: monedaForm.simbolo.trim(),
        is_active: monedaForm.is_active ? 1 : 0,
      };

      const res = await fetch(
        monedaEditId ? `/api/monedas/${monedaEditId}` : "/api/monedas",
        {
          method: monedaEditId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.message || "Error guardando moneda");
        return;
      }

      toast.success(monedaEditId ? "Moneda actualizada" : "Moneda creada");
      setOpenMonedaDialog(false);
      resetMonedaForm();
      loadData();
    } catch (e) {
      console.log(e);
      toast.error("Error guardando moneda");
    } finally {
      setSaving(false);
    }
  }

  function handleAskDeleteMoneda(row) {
    setMonedaToDelete(row);
    setOpenMonedaDelete(true);
  }

  async function handleDeleteMoneda() {
    if (!monedaToDelete) return;

    try {
      const res = await fetch(`/api/monedas/${monedaToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.message || "Error eliminando moneda");
        return;
      }

      toast.success("Moneda eliminada");
      setOpenMonedaDelete(false);
      setMonedaToDelete(null);
      loadData();
    } catch (e) {
      console.log(e);
      toast.error("Error eliminando moneda");
    }
  }

  async function handleToggleMoneda(row, checked) {
    try {
      const res = await fetch(`/api/monedas/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codigo: row.codigo,
          nombre: row.nombre,
          simbolo: row.simbolo,
          is_active: checked ? 1 : 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.message || "Error actualizando moneda");
        return;
      }

      toast.success("Estado de moneda actualizado");
      loadData();
    } catch (e) {
      console.log(e);
      toast.error("Error actualizando moneda");
    }
  }

  // ================= HELPERS IMPUESTO =================
  function resetImpuestoForm() {
    setImpuestoForm({
      nombre: "",
      porcentaje: "",
      is_active: true,
    });
    setImpuestoEditId(null);
  }

  function handleCreateImpuesto() {
    resetImpuestoForm();
    setOpenImpuestoDialog(true);
  }

  function handleEditImpuesto(row) {
    setImpuestoEditId(row.id);
    setImpuestoForm({
      nombre: row.nombre || "",
      porcentaje: row.porcentaje ?? "",
      is_active: Number(row.is_active) === 1,
    });
    setOpenImpuestoDialog(true);
  }

  async function handleSaveImpuesto() {
    if (!impuestoForm.nombre || impuestoForm.porcentaje === "") {
      toast.error("Completa nombre y porcentaje");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        nombre: impuestoForm.nombre.trim(),
        porcentaje: Number(impuestoForm.porcentaje),
        is_active: impuestoForm.is_active ? 1 : 0,
      };

      const res = await fetch(
        impuestoEditId ? `/api/impuestos/${impuestoEditId}` : "/api/impuestos",
        {
          method: impuestoEditId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.message || "Error guardando impuesto");
        return;
      }

      toast.success(impuestoEditId ? "Impuesto actualizado" : "Impuesto creado");
      setOpenImpuestoDialog(false);
      resetImpuestoForm();
      loadData();
    } catch (e) {
      console.log(e);
      toast.error("Error guardando impuesto");
    } finally {
      setSaving(false);
    }
  }

  function handleAskDeleteImpuesto(row) {
    setImpuestoToDelete(row);
    setOpenImpuestoDelete(true);
  }

  async function handleDeleteImpuesto() {
    if (!impuestoToDelete) return;

    try {
      const res = await fetch(`/api/impuestos/${impuestoToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.message || "Error eliminando impuesto");
        return;
      }

      toast.success("Impuesto eliminado");
      setOpenImpuestoDelete(false);
      setImpuestoToDelete(null);
      loadData();
    } catch (e) {
      console.log(e);
      toast.error("Error eliminando impuesto");
    }
  }

  async function handleToggleImpuesto(row, checked) {
    try {
      const res = await fetch(`/api/impuestos/${row.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: row.nombre,
          porcentaje: Number(row.porcentaje),
          is_active: checked ? 1 : 0,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data?.message || "Error actualizando impuesto");
        return;
      }

      toast.success("Estado de impuesto actualizado");
      loadData();
    } catch (e) {
      console.log(e);
      toast.error("Error actualizando impuesto");
    }
  }

  const monedasActivas = monedas.filter((m) => m.is_active === 1).length;
  const impuestosActivos = impuestos.filter((i) => i.is_active === 1).length;

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-8 pb-8">
        {/* HEADER */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
              <DollarSign className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Monedas e Impuestos
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Configura las monedas y tasas de impuesto para tus operaciones
              </p>
            </div>
          </div>
        </div>

        {/* ================= TABLA MONEDAS ================= */}
        <div className="space-y-4">
          <Card className="border-l-4 border-l-blue-500 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-blue-600 rounded-lg">
                    <Globe className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900">
                      Monedas
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Gestiona las monedas disponibles en el sistema
                    </p>
                  </div>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleCreateMoneda}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Nueva Moneda
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Crear nueva moneda
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="flex gap-2">
                <Badge
                  variant="secondary"
                  className="bg-blue-100 text-blue-900 border-blue-300"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {monedas.length} total
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-900 border-green-300"
                >
                  {monedasActivas} activas
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                  <p className="text-sm text-gray-600">Cargando monedas...</p>
                </div>
              ) : monedas.length === 0 ? (
                <div className="text-center py-8">
                  <Globe className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    No hay monedas registradas
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                      <tr>
                        <th className="p-3 text-left font-semibold text-gray-700">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help flex items-center gap-1">
                                ID
                                <Info className="h-4 w-4 text-gray-400" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Identificador único
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="p-3 text-left font-semibold text-gray-700">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help flex items-center gap-1">
                                Código
                                <Info className="h-4 w-4 text-gray-400" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Código ISO (ej: USD, PEN)
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="p-3 text-left font-semibold text-gray-700">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help flex items-center gap-1">
                                Nombre
                                <Info className="h-4 w-4 text-gray-400" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Nombre completo de la moneda
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="p-3 text-left font-semibold text-gray-700">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help flex items-center gap-1">
                                Símbolo
                                <Info className="h-4 w-4 text-gray-400" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Símbolo de la moneda
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="p-3 text-center font-semibold text-gray-700">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help flex items-center justify-center gap-1">
                                Activo
                                <Info className="h-4 w-4 text-gray-400" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Disponible para usar
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="p-3 text-center font-semibold text-gray-700">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {monedas.map((row, idx) => (
                        <tr
                          key={row.id}
                          className={`border-b hover:bg-blue-50 transition-colors ${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="p-3">
                            <Badge variant="outline">{row.id}</Badge>
                          </td>
                          <td className="p-3 font-semibold text-gray-900">
                            {row.codigo}
                          </td>
                          <td className="p-3 text-gray-900">{row.nombre}</td>
                          <td className="p-3">
                            <span className="text-lg font-bold text-gray-900">
                              {row.simbolo}
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex justify-center">
                                  <Switch
                                    checked={Number(row.is_active) === 1}
                                    onCheckedChange={(checked) =>
                                      handleToggleMoneda(row, checked)
                                    }
                                    className="data-[state=checked]:bg-blue-600"
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {Number(row.is_active) === 1
                                  ? "Clic para desactivar"
                                  : "Clic para activar"}
                              </TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditMoneda(row)}
                                    className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  Editar moneda
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAskDeleteMoneda(row)}
                                    className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  Eliminar moneda
                                </TooltipContent>
                              </Tooltip>
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
        </div>

        {/* ================= TABLA IMPUESTOS ================= */}
        <div className="space-y-4">
          <Card className="border-l-4 border-l-purple-500 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-purple-600 rounded-lg">
                    <Percent className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg font-bold text-gray-900">
                      Impuestos
                    </CardTitle>
                    <p className="text-sm text-gray-600 mt-1">
                      Configura las tasas de impuesto aplicables
                    </p>
                  </div>
                </div>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleCreateImpuesto}
                      className="bg-purple-600 hover:bg-purple-700 text-white shadow-md gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Nuevo Impuesto
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Crear nuevo impuesto
                  </TooltipContent>
                </Tooltip>
              </div>

              <div className="flex gap-2">
                <Badge
                  variant="secondary"
                  className="bg-purple-100 text-purple-900 border-purple-300"
                >
                  <CheckCircle className="h-3 w-3 mr-1" />
                  {impuestos.length} total
                </Badge>
                <Badge
                  variant="secondary"
                  className="bg-green-100 text-green-900 border-green-300"
                >
                  {impuestosActivos} activos
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-6">
              {loading ? (
                <div className="flex items-center justify-center gap-2 py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                  <p className="text-sm text-gray-600">Cargando impuestos...</p>
                </div>
              ) : impuestos.length === 0 ? (
                <div className="text-center py-8">
                  <Percent className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">
                    No hay impuestos registrados
                  </p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                      <tr>
                        <th className="p-3 text-left font-semibold text-gray-700">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help flex items-center gap-1">
                                ID
                                <Info className="h-4 w-4 text-gray-400" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Identificador único
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="p-3 text-left font-semibold text-gray-700">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help flex items-center gap-1">
                                Nombre
                                <Info className="h-4 w-4 text-gray-400" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Nombre del impuesto (ej: IGV, IVA)
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="p-3 text-left font-semibold text-gray-700">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help flex items-center gap-1">
                                Porcentaje
                                <Info className="h-4 w-4 text-gray-400" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Tasa del impuesto
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="p-3 text-center font-semibold text-gray-700">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help flex items-center justify-center gap-1">
                                Activo
                                <Info className="h-4 w-4 text-gray-400" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Disponible para usar
                            </TooltipContent>
                          </Tooltip>
                        </th>
                        <th className="p-3 text-center font-semibold text-gray-700">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {impuestos.map((row, idx) => (
                        <tr
                          key={row.id}
                          className={`border-b hover:bg-purple-50 transition-colors ${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <td className="p-3">
                            <Badge variant="outline">{row.id}</Badge>
                          </td>
                          <td className="p-3 font-semibold text-gray-900">
                            {row.nombre}
                          </td>
                          <td className="p-3">
                            <span className="text-lg font-bold text-gray-900">
                              {row.porcentaje}%
                            </span>
                          </td>
                          <td className="p-3 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex justify-center">
                                  <Switch
                                    checked={Number(row.is_active) === 1}
                                    onCheckedChange={(checked) =>
                                      handleToggleImpuesto(row, checked)
                                    }
                                    className="data-[state=checked]:bg-purple-600"
                                  />
                                </div>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                {Number(row.is_active) === 1
                                  ? "Clic para desactivar"
                                  : "Clic para activar"}
                              </TooltipContent>
                            </Tooltip>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center gap-2">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleEditImpuesto(row)}
                                    className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
                                  >
                                    <Pencil className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  Editar impuesto
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAskDeleteImpuesto(row)}
                                    className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  Eliminar impuesto
                                </TooltipContent>
                              </Tooltip>
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
        </div>
      </div>

      {/* ================= DIALOG MONEDA ================= */}
      <Dialog open={openMonedaDialog} onOpenChange={setOpenMonedaDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {monedaEditId ? (
                <>
                  <Pencil className="h-5 w-5 text-blue-600" />
                  Editar Moneda
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-blue-600" />
                  Nueva Moneda
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Código */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">Código</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Código ISO de tres letras (ej: USD, PEN, MXN)
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <Input
                value={monedaForm.codigo}
                onChange={(e) =>
                  setMonedaForm((prev) => ({
                    ...prev,
                    codigo: e.target.value.toUpperCase(),
                  }))
                }
                placeholder="Ej: PEN"
                maxLength={3}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500 uppercase"
              />
            </div>

            {/* Nombre */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">Nombre</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Nombre completo de la moneda
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <Input
                value={monedaForm.nombre}
                onChange={(e) =>
                  setMonedaForm((prev) => ({ ...prev, nombre: e.target.value }))
                }
                placeholder="Ej: Sol Peruano"
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Símbolo */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">Símbolo</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Símbolo de la moneda (ej: S/, $, €)
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <Input
                value={monedaForm.simbolo}
                onChange={(e) =>
                  setMonedaForm((prev) => ({
                    ...prev,
                    simbolo: e.target.value,
                  }))
                }
                placeholder="Ej: S/"
                maxLength={3}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* Activo */}
            <div className="flex items-center justify-between p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">Activa</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Las monedas inactivas no estarán disponibles
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                checked={monedaForm.is_active}
                onCheckedChange={(checked) =>
                  setMonedaForm((prev) => ({ ...prev, is_active: checked }))
                }
                className="data-[state=checked]:bg-blue-600"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpenMonedaDialog(false)}
              className="border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveMoneda}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : monedaEditId ? (
                "Actualizar"
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= DELETE MONEDA ================= */}
      <AlertDialog open={openMonedaDelete} onOpenChange={setOpenMonedaDelete}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmar eliminación
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-3 text-sm">
            <p className="text-gray-700">
              ¿Estás seguro de que deseas eliminar la moneda{" "}
              <strong className="text-gray-900">
                "{monedaToDelete?.nombre}"
              </strong>
              ?
            </p>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700">
                ⚠️ Esta acción no se puede deshacer
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteMoneda}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ================= DIALOG IMPUESTO ================= */}
      <Dialog open={openImpuestoDialog} onOpenChange={setOpenImpuestoDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {impuestoEditId ? (
                <>
                  <Pencil className="h-5 w-5 text-purple-600" />
                  Editar Impuesto
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-purple-600" />
                  Nuevo Impuesto
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Nombre */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">Nombre</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Nombre del impuesto (ej: IGV, IVA, ISR)
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <Input
                value={impuestoForm.nombre}
                onChange={(e) =>
                  setImpuestoForm((prev) => ({
                    ...prev,
                    nombre: e.target.value,
                  }))
                }
                placeholder="Ej: IGV"
                className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
              />
            </div>

            {/* Porcentaje */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">
                  Porcentaje
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Tasa del impuesto (ej: 18 para 18%)
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={impuestoForm.porcentaje}
                  onChange={(e) =>
                    setImpuestoForm((prev) => ({
                      ...prev,
                      porcentaje: e.target.value,
                    }))
                  }
                  placeholder="Ej: 18"
                  className="border-gray-300 focus:border-purple-500 focus:ring-purple-500"
                />
                <span className="text-gray-600 font-semibold">%</span>
              </div>
            </div>

            {/* Activo */}
            <div className="flex items-center justify-between p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">Activo</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Los impuestos inactivos no estarán disponibles
                  </TooltipContent>
                </Tooltip>
              </div>
              <Switch
                checked={impuestoForm.is_active}
                onCheckedChange={(checked) =>
                  setImpuestoForm((prev) => ({
                    ...prev,
                    is_active: checked,
                  }))
                }
                className="data-[state=checked]:bg-purple-600"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpenImpuestoDialog(false)}
              className="border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveImpuesto}
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : impuestoEditId ? (
                "Actualizar"
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================= DELETE IMPUESTO ================= */}
      <AlertDialog open={openImpuestoDelete} onOpenChange={setOpenImpuestoDelete}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmar eliminación
            </AlertDialogTitle>
          </AlertDialogHeader>

          <div className="space-y-3 text-sm">
            <p className="text-gray-700">
              ¿Estás seguro de que deseas eliminar el impuesto{" "}
              <strong className="text-gray-900">
                "{impuestoToDelete?.nombre}"
              </strong>
              ?
            </p>
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs text-red-700">
                ⚠️ Esta acción no se puede deshacer
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-300">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteImpuesto}
              className="bg-red-600 hover:bg-red-700"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}