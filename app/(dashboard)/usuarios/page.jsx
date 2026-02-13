"use client";

import { useEffect, useMemo, useState } from "react";

import { useRequirePerm } from "@/hooks/useRequirePerm";
import { hasPermission } from "@/lib/permissions";
import { useAuth } from "@/context/AuthContext";

import UsersTable from "@/app/components/users/UsersTable";
import UserDialog from "@/app/components/users/UserDialog";

import UsersSearchBar from "@/app/components/users/UsersSearchBar";

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import DeleteUserDialog from "@/app/components/users/DeleteUserDialog";

export default function UsuariosPage() {

  useRequirePerm("usuarios", "view");

  const { permissions } = useAuth();

 const perms = permissions || {};

const canCreate = hasPermission(perms, "usuarios", "create");
const canEdit = hasPermission(perms, "usuarios", "edit");
const canDelete = hasPermission(perms, "usuarios", "delete");

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [search, setSearch] = useState("");

  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState("create");
  const [selectedUser, setSelectedUser] = useState(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // ---------------------------
  // FETCH USERS
  // ---------------------------

  async function fetchUsers() {
    setLoading(true);

    try {
      const res = await fetch("/api/usuarios");
      const data = await res.json();

      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
    }

    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  // ---------------------------
  // FILTRO GLOBAL
  // ---------------------------

  const filteredUsers = useMemo(() => {

    if (!search) return users;

    return users.filter((u) =>
      u.username.toLowerCase().includes(search.toLowerCase()) ||
      u.fullname.toLowerCase().includes(search.toLowerCase())
    );

  }, [users, search]);

  // ---------------------------
  // NUEVO
  // ---------------------------

  function handleNew() {
    setSelectedUser(null);
    setDialogMode("create");
    setDialogOpen(true);
  }

  // ---------------------------
  // EDITAR
  // ---------------------------

  function handleEdit(user) {
    setSelectedUser(user);
    setDialogMode("edit");
    setDialogOpen(true);
  }

  // ---------------------------
  // VER
  // ---------------------------

  function handleView(user) {
    setSelectedUser(user);
    setDialogMode("view");
    setDialogOpen(true);
  }

  // ---------------------------
  // GUARDAR
  // ---------------------------

  async function handleSave(form) {

    const isEdit = dialogMode === "edit";

    await fetch(`/api/usuarios${isEdit ? `/${form.id}` : ""}`, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setDialogOpen(false);
    fetchUsers();
  }

  // ---------------------------
  // DELETE
  // ---------------------------

  async function confirmDelete() {
    setDeleteLoading(true);

    await fetch(`/api/usuarios/${selectedUser.id}`, {
      method: "DELETE",
    });

    setDeleteOpen(false);
    setDeleteLoading(false);

    fetchUsers();
  }

  // ---------------------------
  // TOGGLE ACTIVE
  // ---------------------------

  async function toggleActive(user) {

    await fetch(`/api/usuarios/${user.id}/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !user.is_active }),
    });

    fetchUsers();
  }

  // ---------------------------
  // UI
  // ---------------------------

  return (
    <div className="space-y-4">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">

        <UsersSearchBar
          value={search}
          onChange={setSearch}
        />

        {canCreate && (
          <Button onClick={handleNew}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo usuario
          </Button>
        )}

      </div>

      {/* TABLA */}
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

      {/* DIALOG CREATE/EDIT/VIEW */}
      <UserDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        mode={dialogMode}
        user={selectedUser}
        onSave={handleSave}
      />

      {/* CONFIRM DELETE */}
      <DeleteUserDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        user={selectedUser}
        loading={deleteLoading}
        onConfirm={confirmDelete}
      />

    </div>
  );
}
