"use client";


import { useRequirePerm } from "@/hooks/useRequirePerm";
import { useAuth } from "@/context/AuthContext";
import { hasPermission } from "@/lib/permissions";



export default function RecepcionPage() {
  useRequirePerm("recepcion", "view");

  const { permissions } = useAuth();

  const permCreate = hasPermission(permissions, "recepcion", "create");
  const permEdit = hasPermission(permissions, "recepcion", "edit");
  const permDelete = hasPermission(permissions, "recepcion", "delete");
  return (
    <>
    recepcion</>
  )
}
