"use client";

import { useState } from "react";

import SidebarDesktop from "../components/SidebarDesktop";
import Header from "../components/Header";

import { useAuth } from "@/context/AuthContext";

export default function DashboardLayout({ children }) {

  const { user, loading } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Avoid hydration mismatch: wait until client has loaded user from localStorage
  if (loading) {
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden">

      {/* SIDEBAR PC */}
      <SidebarDesktop open={sidebarOpen} />

      <div className="flex-1 flex flex-col min-w-0">

        
        {/* CONTENT */}
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden p-4 md:p-6">
          {children}
        </main>

      </div>

    </div>
  );
}