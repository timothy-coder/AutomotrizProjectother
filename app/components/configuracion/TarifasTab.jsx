"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Pencil,
  Trash2,
  Plus,
  AlertTriangle,
  Loader2,
  Info,
  DollarSign,
  Wrench,
  Package,
  CheckCircle,
  Clock,
  Globe,
} from "lucide-react";

function formatCurrency(v, simbolo = "$") {
  return `${simbolo} ${Number(v || 0).toFixed(2)}`;
}

export default function TarifasTab({ tipo }) {
  const label = tipo === "mano_obra" ? "Mano de Obra" : "Paños";
  const icon = tipo === "mano_obra" ? Wrench : Package;
  const Icon = icon;
  const color =
    tipo === "mano_obra"
      ? "from-blue-600 to-blue-700"
      : "from-purple-600 to-purple-700";
  const bgColor =
    tipo === "mano_obra"
      ? "from-blue-50 to-blue-100"
      : "from-purple-50 to-purple-100";
  const borderColor =
    tipo === "mano_obra" ? "border-l-blue-500" : "border-l-purple-500";

  const [items, setItems] = useState([]);
  const [monedas, setMonedas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [nombre, setNombre] = useState("");
  const [precioHora, setPrecioHora] = useState("");
  const [monedaId, setMonedaId] = useState("");
  const [activo, setActivo] = useState(true);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  async function load() {
    setLoading(true);
    try {
      const [tarRes, monRes] = await Promise.all([
        fetch(`/api/cotizacion-tarifas?tipo=${tipo}`, {
          cache: "no-store",
        }),
        fetch(`/api/monedas`, { cache: "no-store" }),
      ]);

      const tarData = await tarRes.json();
      const monData = await monRes.json();

      setItems(Array.isArray(tarData) ? tarData : []);
      setMonedas(Array.isArray(monData) ? monData : []);
    } catch {
      toast.error(`Error cargando tarifas de ${label.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, [tipo]);

  function openCreate() {
    setEditingId(null);
    setNombre("");
    setPrecioHora("");
    setMonedaId("");
    setActivo(true);
    setDialogOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setNombre(item.nombre);
    setPrecioHora(String(item.precio_hora));
    setMonedaId(String(item.moneda_id || ""));
    setActivo(item.activo === 1 || item.activo === true);
    setDialogOpen(true);
  }

  async function save() {
    if (!nombre.trim()) return toast.warning("Ingrese un nombre");
    if (!precioHora || Number(precioHora) <= 0)
      return toast.warning("Ingrese un precio válido");
    if (!monedaId) return toast.warning("Seleccione una moneda");

    try {
      setSaving(true);

      const payload = {
        tipo,
        nombre: nombre.trim(),
        precio_hora: Number(precioHora),
        moneda_id: Number(monedaId),
        activo: activo ? 1 : 0,
      };

      const url = editingId
        ? `/api/cotizacion-tarifas/${editingId}`
        : "/api/cotizacion-tarifas";
      const method = editingId ? "PUT" : "POST";

      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await r.json();
      if (!r.ok) {
        toast.error(data.message || "Error al guardar");
        return;
      }

      toast.success(editingId ? "Tarifa actualizada" : "Tarifa creada");
      setDialogOpen(false);
      load();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  function openDelete(item) {
    setDeleteTarget(item);
    setDeleteOpen(true);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/cotizacion-tarifas/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await r.json();
      if (!r.ok) {
        toast.error(data.message || "Error al eliminar");
        return;
      }
      toast.success("Tarifa eliminada");
      setDeleteOpen(false);
      setDeleteTarget(null);
      load();
    } catch {
      toast.error("Error de conexión");
    } finally {
      setDeleting(false);
    }
  }

  const stats = {
    total: items.length,
    activas: items.filter((x) => x.activo).length,
    inactivas: items.filter((x) => !x.activo).length,
    promedio:
      items.length > 0
        ? (
            items.reduce((acc, x) => acc + Number(x.precio_hora), 0) /
            items.length
          ).toFixed(2)
        : 0,
  };

  const getMonedaNombre = (monedaId) => {
    const moneda = monedas.find((m) => m.id === monedaId);
    return moneda ? `${moneda.simbolo}` : "-";
  };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 pb-8">
        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">
                        Total
                      </p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">
                        {stats.total}
                      </p>
                    </div>
                    <CheckCircle className="h-12 w-12 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Total de tarifas configuradas
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">
                        Activas
                      </p>
                      <p className="text-3xl font-bold text-green-900 mt-2">
                        {stats.activas}
                      </p>
                    </div>
                    <Clock className="h-12 w-12 text-green-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Tarifas disponibles para usar
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-600 font-medium">
                        Inactivas
                      </p>
                      <p className="text-3xl font-bold text-gray-900 mt-2">
                        {stats.inactivas}
                      </p>
                    </div>
                    <AlertTriangle className="h-12 w-12 text-gray-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Tarifas desactivadas
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">
                        Promedio
                      </p>
                      <p className="text-2xl font-bold text-orange-900 mt-2">
                        {stats.promedio}
                      </p>
                    </div>
                    <DollarSign className="h-12 w-12 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Precio promedio por hora
            </TooltipContent>
          </Tooltip>
        </div>

        {/* MAIN CARD */}
        <Card className={`border-l-4 ${borderColor} shadow-lg overflow-hidden`}>
          <CardHeader className={`bg-gradient-to-r ${bgColor} border-b space-y-3`}>
            <div className="flex items-center gap-3">
              <div
                className={`p-3 bg-gradient-to-br ${color} rounded-lg shadow-md`}
              >
                <Icon className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-bold text-gray-900">
                  Tarifas de {label}
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Configure las tarifas por hora que se usarán en cotizaciones
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={openCreate}
                    className={`bg-gradient-to-r ${color} hover:opacity-90 text-white shadow-md gap-2`}
                  >
                    <Plus className="h-4 w-4" />
                    Nueva Tarifa
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Crear nueva tarifa de {label.toLowerCase()}
                </TooltipContent>
              </Tooltip>

              <Badge
                variant="secondary"
                className={
                  tipo === "mano_obra"
                    ? "bg-blue-100 text-blue-900 border-blue-300"
                    : "bg-purple-100 text-purple-900 border-purple-300"
                }
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                {stats.total} tarifas
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="pt-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">Cargando tarifas...</p>
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-gray-100 rounded-full mb-3">
                  <Icon className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  No hay tarifas configuradas
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Haz clic en "Nueva Tarifa" para crear una
                </p>
              </div>
            ) : (
              <div className="border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100">
                      <TableHead className="font-semibold text-gray-700">
                        <div className="flex items-center gap-2">
                          Nombre
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Nombre descriptivo de la tarifa
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">
                        <div className="flex items-center justify-end gap-2">
                          Precio/hora
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Tarifa por hora
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">
                        <div className="flex items-center justify-center gap-2">
                          Moneda
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Moneda de la tarifa
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                      <TableHead className="text-center font-semibold text-gray-700">
                        <div className="flex items-center justify-center gap-2">
                          Estado
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="h-4 w-4 text-gray-400 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Activa o inactiva en cotizaciones
                            </TooltipContent>
                          </Tooltip>
                        </div>
                      </TableHead>
                      <TableHead className="text-right font-semibold text-gray-700">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow
                        key={item.id}
                        className={`border-b hover:bg-blue-50 transition-colors ${
                          idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                        }`}
                      >
                        <TableCell className="font-medium text-gray-900">
                          {item.nombre}
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="font-semibold text-gray-900">
                            {item.precio_hora}
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant="outline"
                            className="bg-blue-100 text-blue-900 border-blue-300"
                          >
                            <Globe className="h-3 w-3 mr-1" />
                            {getMonedaNombre(item.moneda_id)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Badge
                                variant={
                                  item.activo ? "default" : "secondary"
                                }
                                className={
                                  item.activo
                                    ? "bg-green-100 text-green-900 hover:bg-green-200 border-green-300"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200 border-gray-300"
                                }
                              >
                                {item.activo ? "✓ Activa" : "✗ Inactiva"}
                              </Badge>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              {item.activo
                                ? "Tarifa disponible para cotizaciones"
                                : "Tarifa desactivada"}
                            </TooltipContent>
                          </Tooltip>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => openEdit(item)}
                                  className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Editar tarifa
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => openDelete(item)}
                                  className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent side="top">
                                Eliminar tarifa
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* INFO BOX */}
        {!loading && items.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-1">
              <p className="font-semibold">Información importante:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Solo las tarifas activas se pueden usar en cotizaciones</li>
                <li>Cada tarifa debe tener una moneda asociada</li>
                <li>No puedes eliminar una tarifa si está siendo usada</li>
                <li>El promedio mostrado se recalcula automáticamente</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingId ? (
                <>
                  <Pencil className="h-5 w-5 text-blue-600" />
                  Editar Tarifa
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-blue-600" />
                  Nueva Tarifa
                </>
              )}
              de {label}
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
                    {tipo === "mano_obra"
                      ? "Ej: Mano de obra estándar"
                      : "Ej: Paños básicos"}
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <Input
                placeholder={
                  tipo === "mano_obra"
                    ? "Ej: Mano de obra estándar"
                    : "Ej: Paños básicos"
                }
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                disabled={saving}
              />
            </div>

            {/* Moneda */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">Moneda</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Selecciona la moneda para esta tarifa
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <Select
                value={monedaId}
                onValueChange={setMonedaId}
                disabled={saving}
              >
                <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Seleccionar moneda" />
                </SelectTrigger>
                <SelectContent>
                  {monedas.map((moneda) => (
                    <SelectItem key={moneda.id} value={String(moneda.id)}>
                      {moneda.nombre} ({moneda.simbolo})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Precio por hora */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">
                  Precio por hora
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Precio en la moneda seleccionada
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 font-semibold">
                  {monedaId
                    ? monedas.find((m) => m.id === Number(monedaId))?.simbolo
                    : "$"}
                </span>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  placeholder="0.00"
                  value={precioHora}
                  onChange={(e) => setPrecioHora(e.target.value)}
                  className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  disabled={saving}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              className="border-gray-300"
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : editingId ? (
                "Actualizar"
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmar eliminación
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-red-50 border-l-4 border-l-red-500 rounded-lg">
              <p className="text-sm text-red-900 font-semibold">
                ¿Estás seguro de que deseas eliminar esta tarifa?
              </p>
              <p className="text-xs text-red-700 mt-2">
                ⚠️ No se podrá eliminar si está siendo usada en alguna
                cotización.
              </p>
            </div>

            <div className="space-y-3 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Nombre:</span>
                <span className="text-gray-900 font-medium">
                  {deleteTarget?.nombre ?? "-"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                <span className="font-semibold text-gray-700">Precio/hora:</span>
                <span className="text-gray-900 font-semibold">
                  {getMonedaNombre(deleteTarget?.moneda_id)}{" "}
                  {deleteTarget?.precio_hora}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleting}
              className="border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}