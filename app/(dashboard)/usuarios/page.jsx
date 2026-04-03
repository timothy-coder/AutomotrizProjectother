"use client";

import { useState } from "react";
import { useRequirePerm } from "@/hooks/useRequirePerm";
import { useUsuarios } from "@/hooks/usuarios/useUsuarios";
import { useUsuariosPerms } from "@/hooks/usuarios/useUsuariosPerms";
import { useUserSearch } from "@/hooks/usuarios/useUserSearch";

import UsersTable from "@/app/components/users/UsersTable";
import UserDialog from "@/app/components/users/UserDialog";
import DeleteUserDialog from "@/app/components/users/DeleteUserDialog";
import UsersSearchBar from "@/app/components/users/UsersSearchBar";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

import {
  Plus,
  Search,
  Users,
  Info,
  CheckCircle,
  Loader2,
  Shield,
} from "lucide-react";

export default function UsuariosPage() {
  useRequirePerm("usuarios", "view");

  const { users, loading, deleteLoading, saveUser, deleteUser, toggleActive } =
    useUsuarios();

  const { canCreate, canEdit, canDelete } = useUsuariosPerms();

  const { search, setSearch, filteredUsers } = useUserSearch(users);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [selectedUser, setSelectedUser] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const stats = {
    total: users.length,
    activos: users.filter((u) => u.is_active === 1).length,
    inactivos: users.filter((u) => u.is_active === 0).length,
  };

  function handleNew() {
    setSelectedUser(null);
    setDialogMode("create");
    setDialogOpen(true);
  }

  function handleEdit(user) {
    setSelectedUser(user);
    setDialogMode("edit");
    setDialogOpen(true);
  }

  function handleView(user) {
    setSelectedUser(user);
    setDialogMode("view");
    setDialogOpen(true);
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 pb-8">
        {/* HEADER */}
        <div className="border-b border-gray-200 pb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-gradient-to-br from-blue-600 to-blue-700 rounded-lg shadow-md">
              <Users className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Gestión de Usuarios
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                Administra todos los usuarios del sistema
              </p>
            </div>
          </div>
        </div>

        {/* ESTADÍSTICAS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-blue-600 font-medium">
                        Total de Usuarios
                      </p>
                      <p className="text-3xl font-bold text-blue-900 mt-2">
                        {stats.total}
                      </p>
                    </div>
                    <Users className="h-12 w-12 text-blue-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Cantidad total de usuarios registrados
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-600 font-medium">
                        Usuarios Activos
                      </p>
                      <p className="text-3xl font-bold text-green-900 mt-2">
                        {stats.activos}
                      </p>
                    </div>
                    <CheckCircle className="h-12 w-12 text-green-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Usuarios con acceso activo al sistema
            </TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 cursor-help shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-orange-600 font-medium">
                        Usuarios Inactivos
                      </p>
                      <p className="text-3xl font-bold text-orange-900 mt-2">
                        {stats.inactivos}
                      </p>
                    </div>
                    <Shield className="h-12 w-12 text-orange-200" />
                  </div>
                </CardContent>
              </Card>
            </TooltipTrigger>
            <TooltipContent side="top">
              Usuarios desactivados del sistema
            </TooltipContent>
          </Tooltip>
        </div>

        {/* BÚSQUEDA Y BOTÓN */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-600 rounded-lg">
                  <Users className="h-5 w-5 text-white" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-lg font-bold text-gray-900">
                    Búsqueda y Filtros
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Busca usuarios por nombre, email o rol
                  </p>
                </div>
              </div>

              {canCreate && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      onClick={handleNew}
                      className="bg-blue-600 hover:bg-blue-700 text-white shadow-md gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      <span className="hidden sm:inline">Nuevo Usuario</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    Crear nuevo usuario en el sistema
                  </TooltipContent>
                </Tooltip>
              )}
            </div>

            <Badge
              variant="secondary"
              className="w-fit bg-blue-100 text-blue-900 border-blue-300"
            >
              <CheckCircle className="h-3 w-3 mr-1" />
              {stats.total} usuario{stats.total !== 1 ? "s" : ""} registrado
              {stats.total !== 1 ? "s" : ""}
            </Badge>
          </CardHeader>

          <CardContent className="pt-6">
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <UsersSearchBar value={search} onChange={setSearch} />
                </div>
              </TooltipTrigger>
              <TooltipContent side="top">
                Escribe para filtrar usuarios por nombre, email o rol
              </TooltipContent>
            </Tooltip>
          </CardContent>
        </Card>

        {/* TABLA PRINCIPAL */}
        <Card className="border-l-4 border-l-blue-500 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b space-y-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 rounded-lg">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <CardTitle className="text-lg font-bold text-gray-900">
                  Lista de Usuarios
                </CardTitle>
                <p className="text-sm text-gray-600 mt-1">
                  Todos los usuarios del sistema
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <p className="text-sm text-gray-600">Cargando usuarios...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="p-4 bg-gray-100 rounded-full mb-3">
                  <Users className="h-8 w-8 text-gray-400" />
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  {search
                    ? "No se encontraron usuarios"
                    : "No hay usuarios registrados"}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {search
                    ? "Intenta con otro término de búsqueda"
                    : canCreate
                    ? 'Haz clic en "Nuevo Usuario" para crear uno'
                    : "Sin usuarios disponibles"}
                </p>
              </div>
            ) : (
              <UsersTable
                data={filteredUsers}
                loading={loading}
                canEdit={canEdit}
                canDelete={canDelete}
                onEdit={handleEdit}
                onView={handleView}
                onDelete={(u) => {
                  setSelectedUser(u);
                  setDeleteOpen(true);
                }}
                onToggleActive={toggleActive}
              />
            )}
          </CardContent>
        </Card>

        {/* INFO BOX */}
        {!loading && users.length > 0 && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 space-y-1">
              <p className="font-semibold">Información importante:</p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>
                  Los usuarios activos tienen acceso al sistema
                </li>
                <li>
                  Los usuarios inactivos no pueden iniciar sesión
                </li>
                <li>
                  Puedes cambiar el estado de un usuario sin eliminarlo
                </li>
                <li>
                  El rol del usuario determina sus permisos en el sistema
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* DIALOGS */}
      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        user={selectedUser}
        onSave={(form) => {
          saveUser(form, dialogMode);
          setDialogOpen(false);
        }}
      />

      <DeleteUserDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        user={selectedUser}
        loading={deleteLoading}
        onConfirm={() => {
          deleteUser(selectedUser.id);
          setDeleteOpen(false);
        }}
      />
    </TooltipProvider>
  );
}