"use client";

import SidebarContent from "./SidebarContent";

export default function SidebarDesktop({ open }) {
  return (
    <aside
      className={`
        hidden md:block
        transition-all duration-300
        ${open ? "w-72" : "w-0 overflow-hidden"}
      `}
    >
      <SidebarContent />
    </aside>
  );
}
