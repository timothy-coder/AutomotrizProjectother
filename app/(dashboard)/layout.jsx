"use client";

import { useState } from "react";

import SidebarDesktop from "../components/SidebarDesktop";

import { useAuth } from "@/context/AuthContext";
import Header from "../components/Header";

export default function DashboardLayout({ children }) {

  const { user } = useAuth();

  const [sidebarOpen, setSidebarOpen] = useState(true);

  function logout() {
    localStorage.removeItem("user");
    document.cookie = "token=; path=/;";
    window.location.href = "/login";
  }

  return (
    <div className="flex min-h-screen">

      {/* SIDEBAR PC */}
      <SidebarDesktop open={sidebarOpen} />

      <div className="flex-1 flex flex-col">

        {/* HEADER */}
        <Header
          user={user}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          logout={logout}
        />

        {/* CONTENT */}
        <main className="flex-1 p-6 ">
          {children}
        </main>

      </div>

    </div>
  );
}
