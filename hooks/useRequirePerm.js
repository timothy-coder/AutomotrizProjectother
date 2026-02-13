"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { hasPermission } from "@/lib/permissions";
import { useAuth } from "@/context/AuthContext";

export function useRequirePerm(module, action = "view") {

  const router = useRouter();
  const { permissions, loading } = useAuth();

  useEffect(() => {

    if (loading) return; // 👈 IMPORTANTE

    if (!hasPermission(permissions, module, action)) {
      router.replace("/403");
    }

  }, [permissions, loading]);
}
