"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";

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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  Pencil,
  Trash2,
  Plus,
  AlertTriangle,
  Loader2,
  Info,
  Wrench,
  BarChart3,
  Building2,
  CheckCircle,
} from "lucide-react";

export default function TalleresMostradoresTab() {
  const [centros, setCentros] = useState([]);
  const [centroId, setCentroId] = useState("");
  const [centroNombre, setCentroNombre] = useState("");

  const [talleres, setTalleres] = useState([]);
  const [mostradores, setMostradores] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const [editing, setEditing] = useState(null);
  const [tipo, setTipo] = useState(null);
  const [nombre, setNombre] = useState("");

  const [deleteTarget, setDeleteTarget] = useState(null);

  // ================= LOAD CENTROS =================

  useEffect(() => {
    async function loadCentros() {
      try {
        const r = await fetch("/api/centros", { cache: "no-store" });
        const data = await r.json();

        const list = Array.isArray(data) ? data : [];
        setCentros(list);

        if (list.length) {
          setCentroId(String(list[0].id));
          setCentroNombre(list[0].nombre);
        }
      } catch {
        toast.error("Error cargando centros");
      }
    }

    loadCentros();
  }, []);

  // ================= LOAD DATA =================

  useEffect(() => {
    if (!centroId) return;
    reload();
  }, [centroId]);

  async function reload() {
    try {
      setLoading(true);

      const [t, m] = await Promise.all([
        fetch(`/api/talleres/bycentro?centro_id=${centroId}`),
        fetch(`/api/mostradores/bycentro?centro_id=${centroId}`),
      ]);

      setTalleres(await t.json());
      setMostradores(await m.json());
    } catch {
      toast.error("Error cargando datos");
    } finally {
      setLoading(false);
    }
  }

  // ================= CREATE / EDIT =================

  function openCreate(t) {
    setTipo(t);
    setEditing(null);
    setNombre("");
    setDialogOpen(true);
  }

  function openEdit(item, t) {
    setTipo(t);
    setEditing(item);
    setNombre(item.nombre);
    setDialogOpen(true);
  }

  async function save() {
    if (!nombre.trim()) return toast.warning("Ingrese nombre");

    const base = `/api/${tipo === "taller" ? "talleres" : "mostradores"}`;

    try {
      setSaving(true);

      if (editing) {
        await fetch(`${base}/${editing.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nombre: nombre.trim() }),
        });

        toast.success("Actualizado correctamente");
      } else {
        await fetch(base, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            centro_id: Number(centroId),
            nombre: nombre.trim(),
          }),
        });

        toast.success("Creado correctamente");
      }

      setDialogOpen(false);
      setNombre("");
      setEditing(null);
      reload();
    } catch {
      toast.error("Error guardando");
    } finally {
      setSaving(false);
    }
  }

  // ================= DELETE =================

  function openDelete(item, t) {
    setDeleteTarget(item);
    setTipo(t);
    setDeleteOpen(true);
  }

  async function deleteConfirm() {
    try {
      setDeleting(true);

      await fetch(
        `/api/${tipo === "taller" ? "talleres" : "mostradores"}/${deleteTarget.id}`,
        {
          method: "DELETE",
        }
      );

      toast.success("Eliminado correctamente");

      setDeleteOpen(false);
      reload();
    } catch {
      toast.error("Error eliminando");
    } finally {
      setDeleting(false);
    }
  }

  const talleresCount = talleres.length;
  const mostradoresCount = mostradores.length;

  // ================= UI =================

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Talleres y Mostradores
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona los talleres y mostradores de cada centro
              </p>
            </div>
          </div>
        </div>

        {/* SELECT CENTRO */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">Centro</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Selecciona el centro para ver sus talleres y mostradores
                  </TooltipContent>
                </Tooltip>
              </div>

              <Select
                value={centroId}
                onValueChange={(value) => {
                  setCentroId(value);
                  const centro = centros.find((c) => String(c.id) === value);
                  if (centro) setCentroNombre(centro.nombre);
                }}
              >
                <SelectTrigger className="border-gray-300 focus:border-blue-500 focus:ring-blue-500">
                  <SelectValue placeholder="Seleccione centro" />
                </SelectTrigger>

                <SelectContent>
                  {centros.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* ESTADÍSTICAS */}
        {centroId && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-blue-600 font-medium">
                          Total Talleres
                        </p>
                        <p className="text-3xl font-bold text-blue-900 mt-2">
                          {talleresCount}
                        </p>
                      </div>
                      <Wrench className="h-12 w-12 text-blue-200" />
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="top">
                Cantidad total de talleres en {centroNombre}
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-purple-600 font-medium">
                          Total Mostradores
                        </p>
                        <p className="text-3xl font-bold text-purple-900 mt-2">
                          {mostradoresCount}
                        </p>
                      </div>
                      <BarChart3 className="h-12 w-12 text-purple-200" />
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="top">
                Cantidad total de mostradores en {centroNombre}
              </TooltipContent>
            </Tooltip>
          </div>
        )}

        {/* TABLAS */}
        {centroId && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* TALLERES */}
            <Card className="border-l-4 border-l-blue-500 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 rounded-lg">
                      <Wrench className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-900">
                        Talleres
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {talleresCount} registrado{talleresCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => openCreate("taller")}
                        className="bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Nuevo</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Crear nuevo taller
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-500" />
                    <p className="text-sm text-gray-600">Cargando...</p>
                  </div>
                ) : talleres.length === 0 ? (
                  <div className="text-center py-8">
                    <Wrench className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">No hay talleres</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {talleres.map((t) => (
                      <Row
                        key={t.id}
                        item={t}
                        onEdit={() => openEdit(t, "taller")}
                        onDelete={() => openDelete(t, "taller")}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* MOSTRADORES */}
            <Card className="border-l-4 border-l-purple-500 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-purple-600 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-gray-900">
                        Mostradores
                      </CardTitle>
                      <p className="text-sm text-gray-600 mt-1">
                        {mostradoresCount} registrado
                        {mostradoresCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        size="sm"
                        onClick={() => openCreate("mostrador")}
                        className="bg-purple-600 hover:bg-purple-700 text-white shadow-md gap-2"
                      >
                        <Plus className="h-4 w-4" />
                        <span className="hidden sm:inline">Nuevo</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      Crear nuevo mostrador
                    </TooltipContent>
                  </Tooltip>
                </div>
              </CardHeader>

              <CardContent className="pt-6">
                {loading ? (
                  <div className="flex items-center justify-center gap-2 py-8">
                    <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                    <p className="text-sm text-gray-600">Cargando...</p>
                  </div>
                ) : mostradores.length === 0 ? (
                  <div className="text-center py-8">
                    <BarChart3 className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-600">
                      No hay mostradores
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {mostradores.map((m) => (
                      <Row
                        key={m.id}
                        item={m}
                        onEdit={() => openEdit(m, "mostrador")}
                        onDelete={() => openDelete(m, "mostrador")}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* INFO BOX */}
        {centroId && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-1">
              <p className="font-semibold">Información importante:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Los talleres y mostradores están asociados a este centro</li>
                <li>
                  Cada elemento debe tener un nombre descriptivo y único
                </li>
                <li>Puedes editar o eliminar elementos en cualquier momento</li>
                <li>
                  Los cambios afectarán futuras asignaciones de recursos
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* DIALOG CREATE / EDIT */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editing ? (
                <>
                  <Pencil className="h-5 w-5 text-blue-600" />
                  Editar {tipo}
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-blue-600" />
                  Nuevo {tipo}
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">Nombre</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    {tipo === "taller"
                      ? "Nombre descriptivo del taller (ej: Taller A, Mecánica)"
                      : "Nombre descriptivo del mostrador (ej: Mostrador 1, Caja Principal)"}
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <Input
                placeholder={
                  tipo === "taller" ? "Ej: Taller A" : "Ej: Mostrador 1"
                }
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                disabled={saving}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs font-semibold text-blue-900">
                Centro seleccionado:
              </p>
              <p className="text-sm text-blue-800 mt-1">{centroNombre}</p>
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={saving}
              className="border-gray-300"
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
              ) : editing ? (
                "Actualizar"
              ) : (
                "Guardar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DELETE */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Confirmar eliminación
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="p-4 bg-red-50 border-l-4 border-l-red-500 rounded-lg">
              <p className="text-sm text-red-900 font-semibold">
                ¿Estás seguro de que deseas eliminar este elemento?
              </p>
              <p className="text-xs text-red-700 mt-2">
                ⚠️ Esta acción no se puede deshacer.
              </p>
            </div>

            <div className="space-y-2 text-sm bg-gray-50 p-4 rounded-lg border border-gray-200">
              <div className="flex justify-between items-center">
                <span className="font-semibold text-gray-700">Nombre:</span>
                <span className="text-gray-900 font-medium">
                  {deleteTarget?.nombre ?? "-"}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-gray-300">
                <span className="font-semibold text-gray-700">Tipo:</span>
                <Badge
                  variant="outline"
                  className={
                    tipo === "taller"
                      ? "bg-blue-100 text-blue-900 border-blue-300"
                      : "bg-purple-100 text-purple-900 border-purple-300"
                  }
                >
                  {tipo === "taller" ? "Taller" : "Mostrador"}
                </Badge>
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
              onClick={deleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

// ================= COMPONENTE FILA =================

function Row({ item, onEdit, onDelete }) {
  return (
    <div className="border-2 rounded-lg p-3 flex justify-between items-center hover:border-blue-300 hover:bg-blue-50 transition-all">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
        <span className="font-medium text-gray-900">{item.nombre}</span>
      </div>

      <div className="flex gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              onClick={onEdit}
              className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
            >
              <Pencil className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Editar elemento</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              onClick={onDelete}
              className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top">Eliminar elemento</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}