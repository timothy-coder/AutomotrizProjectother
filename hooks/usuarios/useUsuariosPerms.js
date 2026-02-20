"use client";

import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";

export function useUsuariosPerms() {
  const { permissions } = useAuth();
  const perms = permissions || {};

  return {
    canCreate: hasPermission(perms, "usuarios", "create"),
    canEdit: hasPermission(perms, "usuarios", "edit"),
    canDelete: hasPermission(perms, "usuarios", "delete"),
  };
}
