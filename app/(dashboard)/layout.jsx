"use client";

import { useAuth } from "@/context/AuthContext";
import SidebarDesktop from "../components/SidebarDesktop";
import Header from "../components/Header";

export default function DashboardLayout({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* SIDEBAR DESKTOP - Visible solo en MD y arriba */}
      <SidebarDesktop />

      <div className="flex-1 flex flex-col min-w-0">
        {/* HEADER - Solo visible en mobile */}
        <Header />

        {/* CONTENT */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-3 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}