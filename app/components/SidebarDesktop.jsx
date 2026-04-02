"use client";

import SidebarContent from "./SidebarContent";

export default function SidebarDesktop() {
  return (
    <div className="hidden md:block transition-all duration-300">
      <SidebarContent />
    </div>
  );
}