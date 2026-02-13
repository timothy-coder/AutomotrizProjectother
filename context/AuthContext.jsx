"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { safeParsePermissions } from "@/lib/permissions";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    const raw = localStorage.getItem("user");

    if (raw) {
      setUser(JSON.parse(raw));
    }

    setLoading(false);

  }, []);

  const permissions = safeParsePermissions(user?.permissions);

  return (
    <AuthContext.Provider value={{ user, permissions, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
