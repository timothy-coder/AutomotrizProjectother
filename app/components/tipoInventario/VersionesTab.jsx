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

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
    <div className="space-y-5">
      {/* ENCABEZADO */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">Versiones de Camionetas</h2>
        <Button onClick={handleOpenCreate} variant="default">
          <Plus className="w-4 h-4 mr-2" />
          Agregar Versión
        </Button>
      </div>

      {/* BÚSQUEDA */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Buscar por nombre o descripción..."
              value={searchTerm}
              onChange={handleSearch}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* TABLA DE VERSIONES */}
      <Card>
        <CardHeader>
          <CardTitle>
            Versiones ({total})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
              <span className="ml-2">Cargando versiones...</span>
            </div>
          ) : versiones.length === 0 ? (
            <div className="text-center py-8">
              <AlertTriangle className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {searchTerm
                  ? "No se encontraron versiones con ese criterio de búsqueda"
                  : "No hay versiones registradas"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Nombre</TableHead>
                      <TableHead>Descripción</TableHead>
                      <TableHead>Fecha de Creación</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {versiones.map((version) => (
                      <TableRow key={version.id}>
                        <TableCell className="font-medium">{version.id}</TableCell>
                        <TableCell className="font-semibold">{version.nombre}</TableCell>
                        <TableCell className="text-gray-600 max-w-xs truncate">
                          {version.descripcion || "-"}
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {new Date(version.created_at).toLocaleDateString("es-PE")}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleOpenEdit(version)}
                              disabled={isSaving}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleOpenDelete(version)}
                              disabled={isSaving}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* PAGINACIÓN */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <span className="text-sm text-gray-600">
                    Página {page} de {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={page === 1 || loading}
                    >
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={page === totalPages || loading}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* DIÁLOGO DE CREAR/EDITAR */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? "Editar Versión" : "Crear Nueva Versión"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* NOMBRE */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Nombre *
              </label>
              <Input
                placeholder="Ej: Premium, Básico, Intermedio"
                name="nombre"
                value={formData.nombre}
                onChange={handleInputChange}
                disabled={isSaving}
              />
            </div>

            {/* DESCRIPCIÓN */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Descripción
              </label>
              <Textarea
                placeholder="Descripción de la versión (opcional)"
                name="descripcion"
                value={formData.descripcion}
                onChange={handleInputChange}
                disabled={isSaving}
                rows={4}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpenDialog(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving}
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
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              Confirmar Eliminación
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar la versión{" "}
              <span className="font-semibold">{selectedVersion?.nombre}</span>?
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialog.Footer>
            <AlertDialogCancel disabled={isSaving}>
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
          </AlertDialog.Footer>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}