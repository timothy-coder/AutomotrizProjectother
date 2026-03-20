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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
  Search,
  Info,
  Package,
  CheckCircle,
  Calendar,
} from "lucide-react";

export default function VersionesTab() {
  const [versiones, setVersiones] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Estados para el formulario
  const [openDialog, setOpenDialog] = useState(false);
  const [openDeleteAlert, setOpenDeleteAlert] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    nombre: "",
    descripcion: "",
  });

  // ============================================
  // CARGAR VERSIONES
  // ============================================
  async function loadVersiones() {
    try {
      setLoading(true);
      const queryParams = new URLSearchParams({
        page,
        limit: 10,
        ...(searchTerm && { search: searchTerm }),
      });

      const res = await fetch(`/api/versiones?${queryParams}`, {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al cargar versiones");
      }

      setVersiones(data.data || []);
      setTotal(data.pagination?.total || 0);
      setTotalPages(data.pagination?.pages || 1);
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error al cargar versiones");
      setVersiones([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVersiones();
  }, [page, searchTerm]);

  // ============================================
  // MANEJAR CAMBIOS EN EL FORMULARIO
  // ============================================
  function handleInputChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  // ============================================
  // ABRIR DIÁLOGO PARA CREAR
  // ============================================
  function handleOpenCreate() {
    setSelectedVersion(null);
    setIsEditing(false);
    setFormData({
      nombre: "",
      descripcion: "",
    });
    setOpenDialog(true);
  }

  // ============================================
  // ABRIR DIÁLOGO PARA EDITAR
  // ============================================
  function handleOpenEdit(version) {
    setSelectedVersion(version);
    setIsEditing(true);
    setFormData({
      nombre: version.nombre,
      descripcion: version.descripcion || "",
    });
    setOpenDialog(true);
  }

  // ============================================
  // GUARDAR (CREAR O EDITAR)
  // ============================================
  async function handleSave() {
    // Validaciones
    if (!formData.nombre.trim()) {
      toast.error("El nombre de la versión es obligatorio");
      return;
    }

    try {
      setIsSaving(true);

      const url = isEditing
        ? `/api/versiones/${selectedVersion.id}`
        : "/api/versiones";

      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: formData.nombre.trim(),
          descripcion: formData.descripcion.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al guardar versión");
      }

      toast.success(
        isEditing
          ? "Versión actualizada exitosamente"
          : "Versión creada exitosamente"
      );

      setOpenDialog(false);
      setFormData({
        nombre: "",
        descripcion: "",
      });
      setPage(1);
      loadVersiones();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error al guardar versión");
    } finally {
      setIsSaving(false);
    }
  }

  // ============================================
  // ABRIR DIÁLOGO PARA CONFIRMAR ELIMINACIÓN
  // ============================================
  function handleOpenDelete(version) {
    setSelectedVersion(version);
    setOpenDeleteAlert(true);
  }

  // ============================================
  // ELIMINAR VERSIÓN
  // ============================================
  async function handleDelete() {
    try {
      setIsSaving(true);

      const res = await fetch(`/api/versiones/${selectedVersion.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || "Error al eliminar versión");
      }

      toast.success("Versión eliminada exitosamente");
      setOpenDeleteAlert(false);
      setSelectedVersion(null);
      setPage(1);
      loadVersiones();
    } catch (error) {
      console.error(error);
      toast.error(error.message || "Error al eliminar versión");
    } finally {
      setIsSaving(false);
    }
  }

  // ============================================
  // MANEJAR BÚSQUEDA
  // ============================================
  function handleSearch(e) {
    setSearchTerm(e.target.value);
    setPage(1);
  }

  // ============================================
  // MANEJAR PAGINACIÓN
  // ============================================
  function handlePreviousPage() {
    if (page > 1) {
      setPage(page - 1);
    }
  }

  function handleNextPage() {
    if (page < totalPages) {
      setPage(page + 1);
    }
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
              <Package className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Versiones de Camionetas
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Gestiona todas las versiones disponibles de camionetas
              </p>
            </div>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-blue-600 font-medium">
                      Total de Versiones
                    </p>
                    <p className="text-3xl font-bold text-blue-900 mt-2">
                      {total}
                    </p>
                  </div>
                  <CheckCircle className="h-12 w-12 text-blue-200" />
                </div>
              </CardContent>
            </Card>
          </TooltipTrigger>
          <TooltipContent side="top">
            Cantidad total de versiones registradas
          </TooltipContent>
        </Tooltip>

        {/* BÚSQUEDA Y BOTÓN */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg">
          <CardContent className="pt-6 space-y-4">
            {/* BÚSQUEDA */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">Buscar</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Buscar por nombre o descripción
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Buscar por nombre o descripción..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* BOTÓN NUEVO */}
            <div className="flex justify-end">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={handleOpenCreate}
                    className="bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Nueva Versión
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top">
                  Crear nueva versión de camioneta
                </TooltipContent>
              </Tooltip>
            </div>
          </CardContent>
        </Card>

        {/* TABLA DE VERSIONES */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-lg">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-bold text-gray-900">
                  Lista de Versiones
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Todas las versiones disponibles
                </p>
              </div>
            </div>

            <Badge
              variant="secondary"
              className="w-fit bg-blue-100 text-blue-900 border-blue-300"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              {total} versión{total !== 1 ? "es" : ""}
            </Badge>
          </CardHeader>

          <CardContent className="pt-6">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">Cargando versiones...</p>
              </div>
            ) : versiones.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-gray-100 rounded-full mb-3">
                  <Package className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  {searchTerm
                    ? "No se encontraron versiones"
                    : "No hay versiones registradas"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {searchTerm
                    ? "Intenta con otro término de búsqueda"
                    : 'Haz clic en "Nueva Versión" para crear una'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-200">
                        <TableHead className="font-semibold text-gray-700">
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
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help flex items-center gap-1">
                                Nombre
                                <Info className="h-4 w-4 text-gray-400" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Nombre de la versión
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help flex items-center gap-1">
                                Descripción
                                <Info className="h-4 w-4 text-gray-400" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Descripción de la versión
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help flex items-center gap-1">
                                Fecha de Creación
                                <Info className="h-4 w-4 text-gray-400" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top">
                              Fecha en que se registró
                            </TooltipContent>
                          </Tooltip>
                        </TableHead>
                        <TableHead className="text-right font-semibold text-gray-700">
                          Acciones
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {versiones.map((version, idx) => (
                        <TableRow
                          key={version.id}
                          className={`border-b hover:bg-blue-50 transition-colors ${
                            idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                          }`}
                        >
                          <TableCell className="font-medium">
                            <Badge variant="outline">{version.id}</Badge>
                          </TableCell>
                          <TableCell className="font-semibold text-gray-900">
                            {version.nombre}
                          </TableCell>
                          <TableCell>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-sm text-gray-600 truncate max-w-xs inline-block cursor-help hover:text-gray-900">
                                  {version.descripcion || "-"}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs">
                                {version.descripcion || "Sin descripción"}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-4 w-4 text-gray-400" />
                              {new Date(version.created_at).toLocaleDateString(
                                "es-PE"
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex gap-2 justify-end">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenEdit(version)}
                                    disabled={isSaving}
                                    className="border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-400"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  Editar versión
                                </TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenDelete(version)}
                                    disabled={isSaving}
                                    className="border-red-300 text-red-600 hover:bg-red-50 hover:border-red-400"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="top">
                                  Eliminar versión
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* PAGINACIÓN */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
                    <span className="text-sm font-medium text-gray-700">
                      Página <span className="text-blue-600">{page}</span> de{" "}
                      <span className="text-blue-600">{totalPages}</span>
                    </span>
                    <div className="flex gap-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handlePreviousPage}
                            disabled={page === 1 || loading}
                            className="border-gray-300"
                          >
                            Anterior
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Ir a la página anterior
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={handleNextPage}
                            disabled={page === totalPages || loading}
                            className="border-gray-300"
                          >
                            Siguiente
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          Ir a la siguiente página
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* INFO BOX */}
        {!loading && versiones.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-1">
              <p className="font-semibold">Información importante:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>Las versiones clasifican los modelos de camionetas</li>
                <li>
                  Puedes buscar versiones por nombre o descripción
                </li>
                <li>La paginación muestra 10 versiones por página</li>
                <li>Edita o elimina versiones según sea necesario</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* DIÁLOGO DE CREAR/EDITAR */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Pencil className="h-5 w-5 text-blue-600" />
                  Editar Versión
                </>
              ) : (
                <>
                  <Plus className="h-5 w-5 text-blue-600" />
                  Nueva Versión
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* NOMBRE */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">Nombre</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Nombre de la versión (ej: Premium, Básico)
                  </TooltipContent>
                </Tooltip>
                <span className="text-red-500">*</span>
              </div>
              <Input
                placeholder="Ej: Premium, Básico, Intermedio"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                disabled={isSaving}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* DESCRIPCIÓN */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Label className="font-semibold text-gray-700">
                  Descripción
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="h-4 w-4 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Descripción adicional (opcional)
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                placeholder="Descripción de la versión (opcional)"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                disabled={isSaving}
                rows={4}
                className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpenDialog(false)}
              disabled={isSaving}
              className="border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  {isEditing ? "Actualizar" : "Crear"}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* DIÁLOGO DE CONFIRMACIÓN DE ELIMINACIÓN */}
      <AlertDialog open={openDeleteAlert} onOpenChange={setOpenDeleteAlert}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 pt-4">
              <p>
                ¿Estás seguro de que deseas eliminar la versión{" "}
                <span className="font-semibold text-gray-900">
                  "{selectedVersion?.nombre}"
                </span>
                ?
              </p>
              <p className="text-xs text-red-600 flex items-center gap-2">
                <AlertTriangle className="h-3 w-3" />
                Esta acción no se puede deshacer.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            {selectedVersion?.descripcion && (
              <div className="text-xs space-y-1">
                <p className="font-semibold text-red-900">Descripción:</p>
                <p className="text-red-800">
                  {selectedVersion.descripcion}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <AlertDialogCancel
              disabled={isSaving}
              className="border-gray-300"
            >
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Eliminando...
                </>
              ) : (
                "Eliminar"
              )}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}