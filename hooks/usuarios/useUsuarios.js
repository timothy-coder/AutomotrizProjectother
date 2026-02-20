"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

export function useUsuarios() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);

  const [deleteLoading, setDeleteLoading] = useState(false);

  async function fetchUsers() {
    setLoading(true);
    try {
      const res = await fetch("/api/usuarios");
      const data = await res.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch {
      setUsers([]);
      toast.error("Error cargando usuarios");
    }
    setLoading(false);
  }

  useEffect(() => {
    fetchUsers();
  }, []);

  async function saveUser(form, mode) {
    const isEdit = mode === "edit";

    await fetch(`/api/usuarios${isEdit ? `/${form.id}` : ""}`, {
      method: isEdit ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    toast.success(isEdit ? "Usuario actualizado" : "Usuario creado");
    fetchUsers();
  }

  async function deleteUser(id) {
    setDeleteLoading(true);

    await fetch(`/api/usuarios/${id}`, {
      method: "DELETE",
    });

    setDeleteLoading(false);
    toast.success("Usuario eliminado");
    fetchUsers();
  }

  async function toggleActive(user) {
    await fetch(`/api/usuarios/${user.id}/toggle`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !user.is_active }),
    });

    fetchUsers();
  }

  return {
    users,
    loading,
    deleteLoading,
    fetchUsers,
    saveUser,
    deleteUser,
    toggleActive,
  };
}
