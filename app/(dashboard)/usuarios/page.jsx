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
import { Plus } from "lucide-react";

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
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <UsersSearchBar value={search} onChange={setSearch} />

        {canCreate && (
          <Button onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo usuario
          </Button>
        )}
      </div>

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
    </div>
  );
}
